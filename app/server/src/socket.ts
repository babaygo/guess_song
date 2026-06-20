import type { Server, Socket } from "socket.io";
import { env } from "./config/env.js";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "./utils/rateLimit.js";
import { roomPublic } from "./room/roomMapper.js";
import { roomStore } from "./room/roomStore.js";
import { sanitize } from "./utils/sanitize.js";
import {
  cancelRoomCleanup,
  computeResults,
  createRoom,
  disconnectPlayer,
  getRoom,
  hasActivePlayers,
  leaderboard,
  launchGame,
  nextSong,
  restartRoom,
  revealSong,
  scheduleRoomCleanup,
  startSubmission,
  submitGuess,
  submitSongs,
  updateRoomConfig,
  upsertPlayer,
} from "./room/rooms.js";
import type { Player, Room } from "./types/types.js";

type Callback = (payload: Record<string, unknown>) => void;

const DEFAULT_SOCKET_LIMIT = { max: 300, windowMs: 10000 };
const SOCKET_LIMITS: Record<string, { max: number; windowMs: number }> = {
  createRoom: { max: 20, windowMs: 60000 },
  joinRoom: { max: 80, windowMs: 60000 },
  reconnectRoom: { max: 80, windowMs: 60000 },
  submitGuess: { max: 120, windowMs: 10000 },
  submitSongs: { max: 40, windowMs: 60000 },
};

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    socket.use((packet, next) => {
      const event = String(packet[0] ?? "");
      const limit = SOCKET_LIMITS[event] ?? DEFAULT_SOCKET_LIMIT;
      const address = socket.handshake.address || socket.id;

      if (checkRateLimit(`${address}:${event}`, limit)) {
        next();
        return;
      }

      const ack = packet.at(-1);
      if (typeof ack === "function") {
        ack({ ok: false, error: RATE_LIMIT_MESSAGE });
      }
    });

    socket.on("createRoom", ({ name, config } = {}, cb?: Callback) => {
      if (roomStore.size >= env.MAX_ACTIVE_ROOMS)
        return fail(cb, "Trop de salles actives. Reessaie plus tard.");

      const clean = sanitize(name);
      if (!clean) return fail(cb, "Nom invalide.");

      const room = createRoom(socket.id, clean, config);
      socket.join(room.code);
      cb?.({ ok: true, code: room.code, room: roomPublic(room), token: room.hostToken });
    });

    socket.on("joinRoom", ({ code, name, token } = {}, cb?: Callback) => {
      const room = getRoom(code);
      const clean = sanitize(name);
      if (!room) return fail(cb, "Salle introuvable.");
      if (!clean) return fail(cb, "Nom invalide.");
      if (
        room.phase !== "lobby" &&
        !room.players.some((player) => player.name === clean)
      ) {
        return fail(cb, "La partie a deja commence.");
      }
      if (
        room.players.length >= env.MAX_PLAYERS_PER_ROOM &&
        !room.players.some((player) => player.name === clean)
      ) {
        return fail(cb, `La salle est pleine (${env.MAX_PLAYERS_PER_ROOM} max).`);
      }

      cancelRoomCleanup(room);
      const result = upsertPlayer(room, socket.id, clean, token);
      if (!result.ok) return fail(cb, result.error);
      reclaimHostIfOwner(room, socket.id, result.player);

      socket.join(room.code);
      emitRoomUpdate(io, room);
      cb?.(hydratePayload(socket, room, result.player));
    });

    socket.on("reconnectRoom", ({ code, name, token } = {}, cb?: Callback) => {
      const room = getRoom(code);
      const clean = sanitize(name);
      if (!room || !clean)
        return fail(cb, "Session introuvable.");

      cancelRoomCleanup(room);
      const result = upsertPlayer(room, socket.id, clean, token);
      if (!result.ok) return fail(cb, "Session deja active sur un autre appareil.");
      reclaimHostIfOwner(room, socket.id, result.player);

      socket.join(room.code);
      emitRoomUpdate(io, room);
      cb?.(hydratePayload(socket, room, result.player));
    });

    socket.on("leaveRoom", ({ code } = {}) => {
      const room = getRoom(code);
      if (!room) return;
      if (!disconnectPlayer(room, socket.id, { transferHost: true })) return;
      socket.leave(room.code);

      if (!hasActivePlayers(room)) scheduleRoomCleanup(room);
      emitRoomUpdate(io, room);
    });

    socket.on("updateConfig", ({ code, config } = {}) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id || room.phase !== "lobby") return;
      updateRoomConfig(room, config);
      emitRoomUpdate(io, room);
    });

    socket.on("startSubmission", ({ code } = {}) => {
      const room = getRoom(code);
      if (
        !room ||
        room.hostId !== socket.id ||
        room.phase !== "lobby" ||
        room.players.length < 2
      )
        return;
      startSubmission(room);
      emitPhaseChange(io, room);
      emitRoomUpdate(io, room);
    });

    socket.on("submitSongs", ({ code, songs } = {}, cb?: Callback) => {
      const room = getRoom(code);
      if (!room) return fail(cb, "Salle introuvable.");
      if (room.phase !== "submitting") return fail(cb, "La salle n'accepte pas de musiques.");
      const result = submitSongs(
        room,
        socket.id,
        Array.isArray(songs) ? songs : [],
      );
      emitRoomUpdate(io, room);
      if (result.ok && result.phase === "ready")
        emitPhaseChange(io, room);
      cb?.(result);
    });

    socket.on("launchGame", ({ code } = {}) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id || room.phase !== "ready") return;
      launchGame(room);
      emitPhaseChange(io, room);
      emitSong(io, room);
    });

    socket.on("submitGuess", ({ code, guess } = {}) => {
      const room = getRoom(code);
      if (!room || room.phase !== "playing") return;
      submitGuess(room, socket.id, guess);
      emitRoomUpdate(io, room);
    });

    socket.on("revealSong", ({ code } = {}) => {
      const room = getRoom(code);
      if (
        !room ||
        room.hostId !== socket.id ||
        room.phase !== "playing" ||
        !room.currentSong
      )
        return;
      const results = computeResults(room);
      revealSong(room);
      emitPhaseChange(io, room);
      io.to(room.code).emit("reveal", {
        playerName: room.currentSong.playerName,
        song: room.currentSong.song,
      });
      io.to(room.code).emit("revealResults", { results });
      emitRoomUpdate(io, room);
    });

    socket.on("nextSong", ({ code } = {}) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id || room.phase !== "reveal") return;
      const phase = nextSong(room);
      emitPhaseChange(io, room);
      if (phase === "finished")
        io.to(room.code).emit("leaderboard", {
          leaderboard: leaderboard(room),
        });
      else emitSong(io, room);
      emitRoomUpdate(io, room);
    });

    socket.on("restartGame", ({ code } = {}) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id) return;
      restartRoom(room);
      emitPhaseChange(io, room);
      emitRoomUpdate(io, room);
    });

    socket.on("disconnect", () => {
      for (const room of roomStore.values()) {
        if (!disconnectPlayer(room, socket.id)) continue;
        if (!hasActivePlayers(room)) scheduleRoomCleanup(room);
        emitRoomUpdate(io, room);
        break;
      }
    });
  });
}

function fail(cb: Callback | undefined, error: string) {
  cb?.({ ok: false, error });
}

// Host authority is bound to the secret player token, never to the (public)
// player name. Only the original host can reclaim the role on reconnect.
function reclaimHostIfOwner(room: Room, socketId: string, player: Player) {
  if (room.hostToken && player.token === room.hostToken) {
    room.hostId = socketId;
    room.hostName = player.name;
  }
}

function emitPhaseChange(io: Server, room: Room) {
  io.to(room.code).emit("phaseChange", { phase: room.phase });
}

function emitRoomUpdate(io: Server, room: Room) {
  io.to(room.code).emit("roomUpdate", roomPublic(room));
}

function hydratePayload(socket: Socket, room: Room, player: Player) {
  const payload: Record<string, unknown> = {
    ok: true,
    room: roomPublic(room),
    isHost: room.hostId === socket.id,
    phase: room.phase,
    token: player.token,
  };

  if (
    (room.phase === "playing" || room.phase === "reveal") &&
    room.currentSong
  ) {
    payload.currentSong = {
      index: room.playedCount,
      total: room.playlist.length,
      song: room.currentSong.song,
    };
  }

  if (room.phase === "reveal" && room.currentSong) {
    payload.reveal = {
      playerName: room.currentSong.playerName,
      song: room.currentSong.song,
    };
    payload.revealResults = computeResults(room);
  }

  if (room.phase === "finished") payload.leaderboard = leaderboard(room);

  return payload;
}

function emitSong(io: Server, room: Room) {
  if (!room.currentSong) return;
  io.to(room.code).emit("songUpdate", {
    index: room.playedCount,
    total: room.playlist.length,
    song: room.currentSong.song,
  });
}
