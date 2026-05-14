import type { Server, Socket } from "socket.io";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "./rateLimit.js";
import { sanitize } from "./sanitize.js";
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
  roomPublic,
  scheduleRoomCleanup,
  startSubmission,
  submitGuess,
  submitSongs,
  updateRoomConfig,
  upsertPlayer,
  rooms,
} from "./rooms.js";

type Callback = (payload: Record<string, unknown>) => void;

const DEFAULT_SOCKET_LIMIT = { max: 300, windowMs: 10000 };
const SOCKET_LIMITS: Record<string, { max: number; windowMs: number }> = {
  createRoom: { max: 20, windowMs: 60000 },
  joinRoom: { max: 80, windowMs: 60000 },
  reconnectRoom: { max: 80, windowMs: 60000 },
  submitGuess: { max: 120, windowMs: 10000 },
  submitSongs: { max: 40, windowMs: 60000 },
};
const MAX_ACTIVE_ROOMS = Number(process.env.MAX_ACTIVE_ROOMS) || 5000;
const MAX_PLAYERS_PER_ROOM = 8;

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
      if (rooms.size >= MAX_ACTIVE_ROOMS)
        return cb?.({ ok: false, error: "Trop de salles actives. Reessaie plus tard." });

      const clean = sanitize(name);
      if (!clean) return cb?.({ ok: false, error: "Nom invalide." });

      const room = createRoom(socket.id, clean, config);
      socket.join(room.code);
      cb?.({ ok: true, code: room.code, room: roomPublic(room) });
    });

    socket.on("joinRoom", ({ code, name } = {}, cb?: Callback) => {
      const room = getRoom(code);
      const clean = sanitize(name);
      if (!room) return cb?.({ ok: false, error: "Salle introuvable." });
      if (!clean) return cb?.({ ok: false, error: "Nom invalide." });
      if (
        room.phase !== "lobby" &&
        !room.players.some((player) => player.name === clean)
      ) {
        return cb?.({ ok: false, error: "La partie a deja commence." });
      }
      if (
        room.players.length >= MAX_PLAYERS_PER_ROOM &&
        !room.players.some((player) => player.name === clean)
      ) {
        return cb?.({ ok: false, error: `La salle est pleine (${MAX_PLAYERS_PER_ROOM} max).` });
      }

      cancelRoomCleanup(room);
      const result = upsertPlayer(room, socket.id, clean);
      if (!result.ok) return cb?.({ ok: false, error: result.error });
      if (room.hostName === clean) room.hostId = socket.id;

      socket.join(room.code);
      io.to(room.code).emit("roomUpdate", roomPublic(room));
      cb?.(hydratePayload(socket, room));
    });

    socket.on("reconnectRoom", ({ code, name } = {}, cb?: Callback) => {
      const room = getRoom(code);
      const clean = sanitize(name);
      if (!room || !clean)
        return cb?.({ ok: false, error: "Session introuvable." });

      cancelRoomCleanup(room);
      const result = upsertPlayer(room, socket.id, clean);
      if (!result.ok)
        return cb?.({
          ok: false,
          error: "Session deja active sur un autre appareil.",
        });
      if (room.hostName === clean) room.hostId = socket.id;

      socket.join(room.code);
      io.to(room.code).emit("roomUpdate", roomPublic(room));
      cb?.(hydratePayload(socket, room));
    });

    socket.on("leaveRoom", ({ code } = {}) => {
      const room = getRoom(code);
      if (!room) return;
      if (!disconnectPlayer(room, socket.id)) return;
      socket.leave(room.code);

      if (!hasActivePlayers(room)) scheduleRoomCleanup(room);
      io.to(room.code).emit("roomUpdate", roomPublic(room));
    });

    socket.on("updateConfig", ({ code, config } = {}) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id || room.phase !== "lobby") return;
      updateRoomConfig(room, config);
      io.to(room.code).emit("roomUpdate", roomPublic(room));
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
      io.to(room.code).emit("phaseChange", { phase: room.phase });
      io.to(room.code).emit("roomUpdate", roomPublic(room));
    });

    socket.on("submitSongs", ({ code, songs } = {}, cb?: Callback) => {
      const room = getRoom(code);
      if (!room || room.phase !== "submitting") return cb?.({ ok: false });
      const result = submitSongs(
        room,
        socket.id,
        Array.isArray(songs) ? songs : [],
      );
      io.to(room.code).emit("roomUpdate", roomPublic(room));
      if (result.ok && result.phase === "ready")
        io.to(room.code).emit("phaseChange", { phase: result.phase });
      cb?.(result);
    });

    socket.on("launchGame", ({ code } = {}) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id || room.phase !== "ready") return;
      launchGame(room);
      io.to(room.code).emit("phaseChange", { phase: room.phase });
      emitSong(io, room);
    });

    socket.on("submitGuess", ({ code, guess } = {}) => {
      const room = getRoom(code);
      if (!room || room.phase !== "playing") return;
      submitGuess(room, socket.id, guess);
      io.to(room.code).emit("roomUpdate", roomPublic(room));
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
      io.to(room.code).emit("phaseChange", { phase: room.phase });
      io.to(room.code).emit("reveal", {
        playerName: room.currentSong.playerName,
        song: room.currentSong.song,
      });
      io.to(room.code).emit("revealResults", { results });
      io.to(room.code).emit("roomUpdate", roomPublic(room));
    });

    socket.on("nextSong", ({ code } = {}) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id || room.phase !== "reveal") return;
      const phase = nextSong(room);
      io.to(room.code).emit("phaseChange", { phase });
      if (phase === "finished")
        io.to(room.code).emit("leaderboard", {
          leaderboard: leaderboard(room),
        });
      else emitSong(io, room);
      io.to(room.code).emit("roomUpdate", roomPublic(room));
    });

    socket.on("restartGame", ({ code } = {}) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id) return;
      restartRoom(room);
      io.to(room.code).emit("phaseChange", { phase: room.phase });
      io.to(room.code).emit("roomUpdate", roomPublic(room));
    });

    socket.on("disconnect", () => {
      for (const room of rooms.values()) {
        if (!disconnectPlayer(room, socket.id)) continue;
        if (!hasActivePlayers(room)) scheduleRoomCleanup(room);
        io.to(room.code).emit("roomUpdate", roomPublic(room));
        break;
      }
    });
  });
}

function hydratePayload(socket: Socket, room: ReturnType<typeof createRoom>) {
  const payload: Record<string, unknown> = {
    ok: true,
    room: roomPublic(room),
    isHost: room.hostId === socket.id,
    phase: room.phase,
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

function emitSong(io: Server, room: ReturnType<typeof createRoom>) {
  if (!room.currentSong) return;
  io.to(room.code).emit("songUpdate", {
    index: room.playedCount,
    total: room.playlist.length,
    song: room.currentSong.song,
  });
}
