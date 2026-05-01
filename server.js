'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory rooms ──────────────────────────────────────────────────────────
// rooms[code] = {
//   code, hostId,
//   phase: 'lobby' | 'submitting' | 'ready' | 'playing' | 'reveal' | 'finished',
//   config: { songsPerPlayer, timerDuration },
//   players: [{ id, name, ready, songCount }],
//   submissions: [{ playerId, playerName, song }],
//   playlist: [],   // shuffled
//   currentIndex: 0,
// }
const rooms = {};

function makeCode() {
  return crypto.randomBytes(2).toString('hex').toUpperCase(); // e.g. "A3F2"
}

function getRoom(code) { return rooms[code]; }
function roomPublic(room) {
  return {
    code: room.code,
    phase: room.phase,
    config: room.config,
    players: room.players,
  };
}
function playlistEntry(room) {
  const entry = room.playlist[room.currentIndex];
  return {
    index: room.currentIndex,
    total: room.playlist.length,
    song: entry.song,
    // We never send playerName/playerId here — revealed separately
  };
}

// ── Socket events ─────────────────────────────────────────────────────────────
io.on('connection', socket => {

  // ── create room ──
  socket.on('createRoom', ({ name, config }, cb) => {
    const code = makeCode();
    rooms[code] = {
      code,
      hostId: socket.id,
      phase: 'lobby',
      config: {
        songsPerPlayer: Number(config?.songsPerPlayer) || 4,
        timerDuration: Number(config?.timerDuration) || 20,
      },
      players: [],
      submissions: [],
      playlist: [],
      currentIndex: 0,
    };
    socket.join(code);
    addPlayer(rooms[code], socket.id, sanitize(name));
    cb({ ok: true, code, room: roomPublic(rooms[code]) });
  });

  // ── join room ──
  socket.on('joinRoom', ({ code, name }, cb) => {
    const room = getRoom(code?.toUpperCase());
    if (!room) return cb({ ok: false, error: 'Salle introuvable.' });
    if (room.phase !== 'lobby') return cb({ ok: false, error: 'La partie a déjà commencé.' });
    if (room.players.length >= 8) return cb({ ok: false, error: 'La salle est pleine (8 max).' });
    const clean = sanitize(name);
    if (!clean) return cb({ ok: false, error: 'Nom invalide.' });
    if (room.players.some(p => p.name === clean))
      return cb({ ok: false, error: 'Ce nom est déjà pris.' });
    socket.join(code);
    addPlayer(room, socket.id, clean);
    io.to(code).emit('roomUpdate', roomPublic(room));
    cb({ ok: true, room: roomPublic(room) });
  });

  // ── host updates config ──
  socket.on('updateConfig', ({ code, config }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    room.config.songsPerPlayer = Math.min(6, Math.max(2, Number(config.songsPerPlayer) || 4));
    room.config.timerDuration = [10, 20, 30].includes(Number(config.timerDuration))
      ? Number(config.timerDuration) : 20;
    io.to(code).emit('roomUpdate', roomPublic(room));
  });

  // ── host starts submission phase ──
  socket.on('startSubmission', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    if (room.players.length < 2) return;
    room.phase = 'submitting';
    room.submissions = [];
    room.players.forEach(p => { p.ready = false; p.songCount = 0; });
    io.to(code).emit('phaseChange', { phase: 'submitting' });
    io.to(code).emit('roomUpdate', roomPublic(room));
  });

  // ── player submits their songs ──
  socket.on('submitSongs', ({ code, songs }, cb) => {
    const room = getRoom(code);
    if (!room || room.phase !== 'submitting') return cb?.({ ok: false });
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return cb?.({ ok: false });

    const limit = room.config.songsPerPlayer;
    const valid = (Array.isArray(songs) ? songs : []).slice(0, limit).map(sanitizeSong).filter(Boolean);
    if (valid.length !== limit) return cb?.({ ok: false, error: `Il faut exactement ${limit} musiques.` });

    // Replace if already submitted
    room.submissions = room.submissions.filter(s => s.playerId !== socket.id);
    valid.forEach(song => {
      room.submissions.push({ playerId: socket.id, playerName: player.name, song });
    });

    player.ready = true;
    player.songCount = valid.length;
    io.to(code).emit('roomUpdate', roomPublic(room));

    const allReady = room.players.every(p => p.ready);
    if (allReady) {
      room.phase = 'ready';
      room.playlist = shuffle([...room.submissions]);
      io.to(code).emit('phaseChange', { phase: 'ready' });
      io.to(code).emit('roomUpdate', roomPublic(room));
    }
    cb?.({ ok: true });
  });

  // ── host launches game ──
  socket.on('launchGame', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'ready') return;
    room.phase = 'playing';
    room.currentIndex = 0;
    io.to(code).emit('phaseChange', { phase: 'playing' });
    io.to(code).emit('songUpdate', playlistEntry(room));
  });

  // ── host reveals current song ──
  socket.on('revealSong', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'playing') return;
    const entry = room.playlist[room.currentIndex];
    room.phase = 'reveal';
    io.to(code).emit('phaseChange', { phase: 'reveal' });
    io.to(code).emit('reveal', { playerName: entry.playerName, song: entry.song });
  });

  // ── host goes to next song ──
  socket.on('nextSong', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'reveal') return;
    room.currentIndex++;
    if (room.currentIndex >= room.playlist.length) {
      room.phase = 'finished';
      io.to(code).emit('phaseChange', { phase: 'finished' });
      // Send full recap (now it's over, we can reveal all)
      const recap = room.playlist.map(e => ({ song: e.song, playerName: e.playerName }));
      io.to(code).emit('recap', { recap });
    } else {
      room.phase = 'playing';
      io.to(code).emit('phaseChange', { phase: 'playing' });
      io.to(code).emit('songUpdate', playlistEntry(room));
    }
  });

  // ── host restarts ──
  socket.on('restartGame', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id) return;
    room.phase = 'lobby';
    room.submissions = [];
    room.playlist = [];
    room.currentIndex = 0;
    room.players.forEach(p => { p.ready = false; p.songCount = 0; });
    io.to(code).emit('phaseChange', { phase: 'lobby' });
    io.to(code).emit('roomUpdate', roomPublic(room));
  });

  // ── disconnect ──
  socket.on('disconnect', () => {
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx === -1) continue;
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        delete rooms[code];
      } else {
        if (room.hostId === socket.id) room.hostId = room.players[0].id;
        io.to(code).emit('roomUpdate', roomPublic(room));
      }
      break;
    }
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function addPlayer(room, id, name) {
  room.players.push({ id, name, ready: false, songCount: 0 });
}

function sanitize(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 20);
}

function sanitizeSong(song) {
  if (!song || typeof song !== 'object') return null;
  const id = Number(song.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    title: String(song.title ?? '').slice(0, 200),
    artist: String(song.artist ?? '').slice(0, 200),
    artwork: validateArtworkUrl(song.artwork),
    preview: validatePreviewUrl(song.preview),
  };
}

function validateArtworkUrl(url) {
  try {
    const u = new URL(String(url ?? ''));
    if (!['https:'].includes(u.protocol)) return '';
    if (!u.hostname.endsWith('mzstatic.com')) return '';
    return u.href;
  } catch { return ''; }
}

function validatePreviewUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(String(url));
    if (u.protocol !== 'https:') return null;
    const allowed = ['audio-ssl.itunes.apple.com', 'aod.itunes.apple.com', 'audio.itunes.apple.com'];
    if (!allowed.some(h => u.hostname.endsWith(h))) return null;
    return u.href;
  } catch { return null; }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Guess the Song running on port ${PORT}`));
