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

app.get('/api/search', async (req, res) => {
  const q = sanitizeSearchTerm(req.query.q);
  if (!q || q.length < 2) return res.json({ results: [] });

  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);

  try {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const upstream = await fetch(`https://api.deezer.com/search?${params.toString()}`, {
      headers: { 'User-Agent': 'guess-the-song/1.0', 'Accept': 'application/json' },
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: `Deezer ${upstream.status}`, results: [] });
    const data = await upstream.json();
    const results = (Array.isArray(data.data) ? data.data : [])
      .filter(r => r.id && r.title)
      .map(r => ({
        id: r.id,
        title: r.title ?? 'Titre inconnu',
        artist: r.artist?.name ?? '',
        artwork: validateArtworkUrl(r.album?.cover_medium ?? ''),
        preview: validatePreviewUrl(r.preview ?? null),
      }));
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({ results });
  } catch (_) {
    return res.status(502).json({ error: 'Erreur Deezer', results: [] });
  }
});

const rooms = {};

function makeCode() {
  return crypto.randomBytes(2).toString('hex').toUpperCase(); // e.g. "A3F2"
}

function getRoom(code) { return rooms[code]; }
const ROOM_RECONNECT_GRACE_MS = 120000;
function roomPublic(room) {
  return {
    code: room.code,
    phase: room.phase,
    config: room.config,
    // In lobby, hide disconnected slots; in active phases keep them visible.
    players: room.phase === 'lobby'
      ? room.players.filter(p => p.id !== null)
      : room.players,
  };
}
function playlistEntry(room) {
  const entry = room.playlist[room.currentIndex];
  return {
    index: room.currentIndex,
    total: room.playlist.length,
    song: entry.song,
  };
}

// Socket events
io.on('connection', socket => {

  // create room
  socket.on('createRoom', ({ name, config }, cb) => {
    const code = makeCode();
    rooms[code] = {
      code,
      hostId: socket.id,
      hostName: sanitize(name),
      phase: 'lobby',
      config: {
        songsPerPlayer: Number(config?.songsPerPlayer) || 4,
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

  // reconnect room after page refresh
  socket.on('reconnectRoom', ({ code, name }, cb) => {
    const room = getRoom(code?.toUpperCase());
    const clean = sanitize(name);
    if (!room || !clean) return cb?.({ ok: false, error: 'Session introuvable.' });
    cancelRoomCleanup(room);

    let player = room.players.find(p => p.name === clean);

    // If player no longer exists (removed on disconnect), re-add to recover session.
    if (!player) {
      if (room.players.length >= 8) return cb?.({ ok: false, error: 'Salle pleine.' });
      addPlayer(room, socket.id, clean);
      player = room.players.find(p => p.name === clean);
    } else {
      if (player.id && player.id !== socket.id) {
        return cb?.({ ok: false, error: 'Session déjà active sur un autre appareil.' });
      }
      player.id = socket.id;
    }

    // Restore host privileges if reconnecting player is the original host name.
    if (room.hostName === clean) room.hostId = socket.id;

    socket.join(room.code);
    io.to(room.code).emit('roomUpdate', roomPublic(room));

    const payload = {
      ok: true,
      room: roomPublic(room),
      isHost: room.hostId === socket.id,
      phase: room.phase,
    };

    if (room.phase === 'playing' && room.currentSong) {
      payload.currentSong = {
        index: room.playedCount ?? 0,
        total: room.playlist.length,
        song: room.currentSong.song,
      };
    }

    if (room.phase === 'reveal' && room.currentSong) {
      payload.currentSong = {
        index: room.playedCount ?? 0,
        total: room.playlist.length,
        song: room.currentSong.song,
      };
      payload.reveal = {
        playerName: room.currentSong.playerName,
        song: room.currentSong.song,
      };
      payload.revealResults = computeResults(room);
    }

    if (room.phase === 'finished') {
      payload.recap = room.playlist.map(e => ({ song: e.song, playerName: e.playerName }));
    }

    cb?.(payload);
  });

  // join room
  socket.on('joinRoom', ({ code, name }, cb) => {
    const room = getRoom(code?.toUpperCase());
    if (!room) return cb({ ok: false, error: 'Salle introuvable.' });
    cancelRoomCleanup(room);
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

  // leave room
  socket.on('leaveRoom', ({ code }) => {
    const room = getRoom(code);
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (idx === -1) return;

    // Remove player from room
    room.players.splice(idx, 1);

    // If player was host, reassign host to another player if available
    if (room.hostId === socket.id) {
      room.hostId = room.players.length > 0 ? room.players[0].id : null;
    }

    socket.leave(code);

    // If no players left, schedule cleanup
    if (room.players.length === 0) {
      scheduleRoomCleanup(room);
    } else {
      io.to(code).emit('roomUpdate', roomPublic(room));
    }
  });

  // host updates config
  socket.on('updateConfig', ({ code, config }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    room.config.songsPerPlayer = Math.min(6, Math.max(2, Number(config.songsPerPlayer) || 4));
    io.to(code).emit('roomUpdate', roomPublic(room));
  });

  // host starts submission phase
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

  // player submits their songs
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
      room.playlist = [...room.submissions];
      room.remainingPlaylist = shuffle([...room.submissions]);
      room.playedCount = 0;
      io.to(code).emit('phaseChange', { phase: 'ready' });
      io.to(code).emit('roomUpdate', roomPublic(room));
    }
    cb?.({ ok: true });
  });

  // host launches game
  socket.on('launchGame', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'ready') return;
    room.phase = 'playing';
    room.playedCount = 0;
    room.currentSong = pickRandomSong(room);
    room.players.forEach(p => { p.guess = null; });
    io.to(code).emit('phaseChange', { phase: 'playing' });
    io.to(code).emit('songUpdate', {
      index: room.playedCount,
      total: room.playlist.length,
      song: room.currentSong.song,
    });
  });

  // player submits their guess
  socket.on('submitGuess', ({ code, guess }) => {
    const room = getRoom(code);
    if (!room || room.phase !== 'playing') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    player.guess = String(guess ?? '').slice(0, 20);
    io.to(code).emit('roomUpdate', roomPublic(room));
  });

  // host reveals current song
  socket.on('revealSong', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'playing') return;
    if (!room.currentSong) return;
    room.phase = 'reveal';
    io.to(code).emit('phaseChange', { phase: 'reveal' });
    io.to(code).emit('reveal', { playerName: room.currentSong.playerName, song: room.currentSong.song });
    io.to(code).emit('revealResults', { results: computeResults(room) });
  });

  // host goes to next song
  socket.on('nextSong', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id || room.phase !== 'reveal') return;
    room.playedCount++;
    if (room.playedCount >= room.playlist.length) {
      room.phase = 'finished';
      io.to(code).emit('phaseChange', { phase: 'finished' });
      const recap = room.playlist.map(e => ({ song: e.song, playerName: e.playerName }));
      io.to(code).emit('recap', { recap });
    } else {
      room.phase = 'playing';
      room.currentSong = pickRandomSong(room);
      room.players.forEach(p => { p.guess = null; });
      io.to(code).emit('phaseChange', { phase: 'playing' });
      io.to(code).emit('songUpdate', {
        index: room.playedCount,
        total: room.playlist.length,
        song: room.currentSong.song,
      });
    }
  });

  // host restarts
  socket.on('restartGame', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id) return;
    room.phase = 'lobby';
    room.submissions = [];
    room.playlist = [];
    room.remainingPlaylist = [];
    room.playedCount = 0;
    room.currentSong = null;
    room.players.forEach(p => { p.ready = false; p.songCount = 0; p.guess = null; });
    io.to(code).emit('phaseChange', { phase: 'lobby' });
    io.to(code).emit('roomUpdate', roomPublic(room));
  });

  // disconnect
  socket.on('disconnect', () => {
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx === -1) continue;

      // Keep slot in all phases so F5 can recover (lobby included).
      room.players[idx].id = null;
      if (room.hostId === socket.id) room.hostId = null;
      const hasActive = room.players.some(p => p.id !== null);
      if (!hasActive) scheduleRoomCleanup(room);

      io.to(code).emit('roomUpdate', roomPublic(room));
      break;
    }
  });
});

// Helpers
function addPlayer(room, id, name) {
  room.players.push({ id, name, ready: false, songCount: 0, guess: null });
}

function scheduleRoomCleanup(room) {
  if (!room) return;
  cancelRoomCleanup(room);
  room.cleanupTimer = setTimeout(() => {
    const current = getRoom(room.code);
    if (!current) return;
    if (current.players.length === 0) delete rooms[room.code];
  }, ROOM_RECONNECT_GRACE_MS);
}

function cancelRoomCleanup(room) {
  if (!room?.cleanupTimer) return;
  clearTimeout(room.cleanupTimer);
  room.cleanupTimer = null;
}

function pickRandomSong(room) {
  if (!room.remainingPlaylist || room.remainingPlaylist.length === 0) return null;
  const idx = Math.floor(Math.random() * room.remainingPlaylist.length);
  const song = room.remainingPlaylist[idx];
  room.remainingPlaylist.splice(idx, 1);
  return song;
}

function computeResults(room) {
  if (!room.currentSong) return [];
  const correctPlayerName = room.currentSong.playerName;
  return room.players.map(p => ({
    playerName: p.name,
    correct: p.guess === correctPlayerName,
  }));
}

function sanitize(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 20);
}

function sanitizeSearchTerm(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 100);
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
    if (u.protocol !== 'https:') return '';
    if (!u.hostname.endsWith('dzcdn.net') && !u.hostname.endsWith('mzstatic.com')) return '';
    return u.href;
  } catch { return ''; }
}

function validatePreviewUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(String(url));
    if (u.protocol !== 'https:') return null;
    if (!u.hostname.endsWith('dzcdn.net')) return null;
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

// Start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Guess the Song running on  http://localhost:${PORT}`));
