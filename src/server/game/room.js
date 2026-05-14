import crypto from 'crypto';
import { sanitize, sanitizeSong } from '../../shared/utils.js';
import { ROOM_RECONNECT_GRACE_MS, GAME_PHASES } from '../../shared/constants.js';

// ========================================
// ROOM MANAGEMENT
// ========================================

const rooms = {};

function generateUniqueRoomCode() {
  let code;
  do { code = crypto.randomBytes(2).toString('hex').toUpperCase(); }
  while (rooms[code]);
  return code;
}

export function createRoom(hostId, hostName, config) {
  const code = generateUniqueRoomCode();
  rooms[code] = {
    code,
    hostId,
    hostName: sanitize(hostName),
    phase: GAME_PHASES.LOBBY,
    config: {
      songsPerPlayer: Number(config?.songsPerPlayer) || 4,
    },
    players: [],
    submissions: [],
    playlist: [],
    currentIndex: 0,
    playedCount: 0,
    currentSong: null,
    cleanupTimeout: null,
  };
  return rooms[code];
}

export function getRoom(code) {
  return rooms[code?.toUpperCase?.()];
}

export function deleteRoom(code) {
  delete rooms[code?.toUpperCase?.()];
}

export function getRoomsList() {
  return Object.values(rooms);
}

export function addPlayer(room, socketId, name) {
  const sanitizedName = sanitize(name);
  
  // Check if player already exists by name
  let player = room.players.find(p => p.name === sanitizedName);
  if (player) {
    player.id = socketId;
    return player;
  }

  // Add new player
  const newPlayer = {
    id: socketId,
    name: sanitizedName,
    guess: null,
    score: 0,
    submissions: [],
  };
  room.players.push(newPlayer);
  return newPlayer;
}

export function removePlayer(room, socketId) {
  const index = room.players.findIndex(p => p.id === socketId);
  if (index !== -1) {
    const removedPlayer = room.players[index];
    removedPlayer.id = null; // Mark as disconnected, keep for leaderboard
    
    // If host left and other players online, assign new host
    if (room.hostId === socketId) {
      const nextHost = room.players.find(p => p.id !== null);
      if (nextHost) {
        room.hostId = nextHost.id;
        room.hostName = nextHost.name;
      }
    }
  }
}

export function roomPublic(room) {
  return {
    code: room.code,
    phase: room.phase,
    config: room.config,
    hostId: room.hostId,
    hostName: room.hostName,
    // In lobby, show only active players; in other phases show all
    players: room.phase === GAME_PHASES.LOBBY
      ? room.players.filter(p => p.id !== null)
      : room.players.map(p => ({
          id: p.id,
          name: p.name,
          guess: p.guess,
          score: p.score,
        })),
  };
}

export function cancelRoomCleanup(room) {
  if (room.cleanupTimeout) {
    clearTimeout(room.cleanupTimeout);
    room.cleanupTimeout = null;
  }
}

export function scheduleRoomCleanup(room, delay = ROOM_RECONNECT_GRACE_MS) {
  cancelRoomCleanup(room);
  room.cleanupTimeout = setTimeout(() => {
    // Clean up players who have been disconnected too long
    const now = Date.now();
    room.players = room.players.filter(p => {
      if (p.id === null && (p.disconnectedAt || now) - now > delay) {
        return false;
      }
      return true;
    });

    // Delete empty room
    if (room.players.length === 0) {
      deleteRoom(room.code);
    }
  }, delay);
}

// ========================================
// PLAYLIST MANAGEMENT
// ========================================

export function buildPlaylist(room) {
  // Flatten all submissions into playlist
  const playlist = [];
  room.submissions.forEach(submission => {
    const validSongs = submission.songs
      .map(sanitizeSong)
      .filter(Boolean);
    validSongs.forEach(song => {
      playlist.push({
        song,
        playerName: submission.playerName,
      });
    });
  });

  // Shuffle playlist
  for (let i = playlist.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
  }

  room.playlist = playlist;
  room.currentIndex = 0;
  return playlist;
}

export function getCurrentSong(room) {
  if (!room.playlist?.length || room.currentIndex >= room.playlist.length) {
    return null;
  }
  const entry = room.playlist[room.currentIndex];
  return {
    song: entry.song,
    playerName: entry.playerName,
    index: room.currentIndex,
    total: room.playlist.length,
  };
}

export function nextSong(room) {
  if (room.currentIndex < room.playlist.length - 1) {
    room.currentIndex++;
    room.playedCount++;
    room.currentSong = getCurrentSong(room);
    return room.currentSong;
  }
  return null;
}

// ========================================
// SCORING
// ========================================

export function computeResults(room) {
  if (!room.currentSong) return [];
  const correctPlayerName = room.currentSong.playerName;
  return room.players.map(p => ({
    playerName: p.name,
    correct: p.guess === correctPlayerName,
    score: p.guess === correctPlayerName ? 1 : 0,
  }));
}

export function updateScores(room, results) {
  results.forEach(result => {
    const player = room.players.find(p => p.name === result.playerName);
    if (player) {
      player.score += result.score;
    }
  });
}

export function getLeaderboard(room) {
  return room.players
    .map(p => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}