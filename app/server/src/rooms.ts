import crypto from "crypto";
import { sanitize, sanitizeSong } from "./sanitize.js";
import type { Player, PublicRoom, Room, RoomConfig, Song } from "./types.js";

const ROOM_RECONNECT_GRACE_MS = 120000;

export const rooms = new Map<string, Room>();

export function generateUniqueRoomCode() {
  let code = "";
  do {
    code = crypto.randomBytes(2).toString("hex").toUpperCase();
  } while (rooms.has(code));
  return code;
}

export function getRoom(code: unknown) {
  return rooms.get(String(code ?? "").toUpperCase());
}

export function createRoom(hostId: string, name: unknown, config?: Partial<RoomConfig>) {
  const code = generateUniqueRoomCode();
  const hostName = sanitize(name);
  const room: Room = {
    code,
    hostId,
    hostName,
    phase: "lobby",
    config: { songsPerPlayer: Number(config?.songsPerPlayer) || 4 },
    players: [],
    submissions: [],
    playlist: [],
    remainingPlaylist: [],
    playedCount: 0,
    currentSong: null,
    cleanupTimer: null,
  };

  addPlayer(room, hostId, hostName);
  rooms.set(code, room);
  return room;
}

export function roomPublic(room: Room): PublicRoom {
  return {
    code: room.code,
    hostId: room.hostId,
    hostName: room.hostName,
    phase: room.phase,
    config: room.config,
    playedCount: room.playedCount,
    players: room.phase === "lobby" ? room.players.filter((player) => player.id !== null) : room.players,
  };
}

export function addPlayer(room: Room, id: string, name: string) {
  room.players.push({ id, name, ready: false, songCount: 0, guess: null, score: 0 });
}

export function upsertPlayer(room: Room, id: string, name: string) {
  const existing = room.players.find((player) => player.name === name);
  if (!existing) {
    addPlayer(room, id, name);
    return { ok: true as const, player: room.players.at(-1) as Player };
  }

  if (existing.id && existing.id !== id) {
    return { ok: false as const, error: "Ce nom est deja pris." };
  }

  existing.id = id;
  return { ok: true as const, player: existing };
}

export function transferHostIfNeeded(room: Room, socketId: string) {
  if (room.hostId !== socketId) return;
  const activePlayers = room.players.filter((player) => player.id !== null);
  const nextHost = activePlayers.at(-1);
  room.hostId = nextHost?.id ?? null;
  room.hostName = nextHost?.name ?? null;
}

export function disconnectPlayer(room: Room, socketId: string) {
  const player = room.players.find((candidate) => candidate.id === socketId);
  if (!player) return false;
  player.id = null;
  transferHostIfNeeded(room, socketId);
  return true;
}

export function hasActivePlayers(room: Room) {
  return room.players.some((player) => player.id !== null);
}

export function scheduleRoomCleanup(room: Room) {
  cancelRoomCleanup(room);
  room.cleanupTimer = setTimeout(() => {
    const current = rooms.get(room.code);
    if (current && !hasActivePlayers(current)) rooms.delete(room.code);
  }, ROOM_RECONNECT_GRACE_MS);
}

export function cancelRoomCleanup(room: Room) {
  if (!room.cleanupTimer) return;
  clearTimeout(room.cleanupTimer);
  room.cleanupTimer = null;
}

export function updateRoomConfig(room: Room, config?: Partial<RoomConfig>) {
  room.config.songsPerPlayer = Math.min(6, Math.max(2, Number(config?.songsPerPlayer) || 4));
}

export function startSubmission(room: Room) {
  room.phase = "submitting";
  room.submissions = [];
  room.playlist = [];
  room.remainingPlaylist = [];
  room.playedCount = 0;
  room.currentSong = null;
  room.players.forEach((player) => {
    player.ready = false;
    player.songCount = 0;
    player.guess = null;
  });
}

export function submitSongs(room: Room, socketId: string, songs: unknown[]) {
  const player = room.players.find((candidate) => candidate.id === socketId);
  if (!player) return { ok: false as const, error: "Joueur introuvable." };
  if (player.ready) return { ok: false as const, error: "Deja soumis." };

  const valid = songs.slice(0, room.config.songsPerPlayer).map(sanitizeSong).filter((song): song is Song => Boolean(song));
  if (valid.length !== room.config.songsPerPlayer) {
    return { ok: false as const, error: `Il faut exactement ${room.config.songsPerPlayer} musiques.` };
  }

  room.submissions = room.submissions.filter((submission) => submission.playerId !== socketId);
  valid.forEach((song) => {
    room.submissions.push({ playerId: socketId, playerName: player.name, song });
  });

  player.ready = true;
  player.songCount = valid.length;

  if (room.players.every((candidate) => candidate.ready)) {
    room.phase = "ready";
    room.playlist = [...room.submissions];
    room.remainingPlaylist = shuffle([...room.submissions]);
  }

  return { ok: true as const };
}

export function launchGame(room: Room) {
  room.phase = "playing";
  room.playedCount = 0;
  room.currentSong = pickRandomSong(room);
  room.players.forEach((player) => {
    player.guess = null;
  });
}

export function submitGuess(room: Room, socketId: string, guess: unknown) {
  const player = room.players.find((candidate) => candidate.id === socketId);
  if (!player) return;
  player.guess = String(guess ?? "").slice(0, 20);
}

export function revealSong(room: Room) {
  room.phase = "reveal";
  const correctPlayerName = room.currentSong?.playerName;
  room.players.forEach((player) => {
    if (player.guess === correctPlayerName && player.name !== correctPlayerName) player.score += 1;
  });
}

export function nextSong(room: Room) {
  room.playedCount += 1;
  if (room.playedCount >= room.playlist.length) {
    room.phase = "finished";
    return;
  }

  room.phase = "playing";
  room.currentSong = pickRandomSong(room);
  room.players.forEach((player) => {
    player.guess = null;
  });
}

export function restartRoom(room: Room) {
  room.phase = "lobby";
  room.submissions = [];
  room.playlist = [];
  room.remainingPlaylist = [];
  room.playedCount = 0;
  room.currentSong = null;
  room.players.forEach((player) => {
    player.ready = false;
    player.songCount = 0;
    player.guess = null;
    player.score = 0;
  });
}

export function computeResults(room: Room) {
  const correctPlayerName = room.currentSong?.playerName;
  return room.players.map((player) => ({
    playerName: player.name,
    correct: player.guess === correctPlayerName,
  }));
}

export function leaderboard(room: Room) {
  return room.players
    .map((player) => ({ name: player.name, score: player.score }))
    .sort((left, right) => right.score - left.score);
}

function pickRandomSong(room: Room) {
  if (!room.remainingPlaylist.length) return null;
  const index = Math.floor(Math.random() * room.remainingPlaylist.length);
  const [song] = room.remainingPlaylist.splice(index, 1);
  return song ?? null;
}

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}
