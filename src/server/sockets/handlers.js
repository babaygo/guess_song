import crypto from 'crypto';
import { sanitize } from '../../shared/utils.js';
import { ROOM_RECONNECT_GRACE_MS, GAME_PHASES } from '../../shared/constants.js';
import {
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  roomPublic,
  cancelRoomCleanup,
  scheduleRoomCleanup,
  buildPlaylist,
  getCurrentSong,
  nextSong,
  computeResults,
  updateScores,
  getLeaderboard,
} from '../game/room.js';

export function setupSocketHandlers(io) {
  io.on('connection', socket => {
    console.log(`Client connecté: ${socket.id}`);

    // ========================================
    // ROOM CREATION & JOINING
    // ========================================

    socket.on('createRoom', ({ name, config }, cb) => {
      const room = createRoom(socket.id, name, config);
      socket.join(room.code);
      addPlayer(room, socket.id, name);
      cb({ ok: true, code: room.code, room: roomPublic(room) });
    });

    socket.on('joinRoom', ({ code, name }, cb) => {
      const room = getRoom(code);
      if (!room) return cb?.({ ok: false, error: 'Salle introuvable.' });
      const clean = sanitize(name);
      if (!clean) return cb?.({ ok: false, error: 'Pseudo invalide.' });
      if (room.players.length >= 8) return cb?.({ ok: false, error: 'Salle pleine.' });

      socket.join(room.code);
      addPlayer(room, socket.id, clean);
      io.to(room.code).emit('roomUpdate', roomPublic(room));
      cb({ ok: true, room: roomPublic(room) });
    });

    socket.on('reconnectRoom', ({ code, name }, cb) => {
      const room = getRoom(code);
      const clean = sanitize(name);
      if (!room || !clean) return cb?.({ ok: false, error: 'Session introuvable.' });

      cancelRoomCleanup(room);

      let player = room.players.find(p => p.name === clean);

      // If player no longer exists, re-add to recover session
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

      // Restore host if needed
      if (room.hostName === clean) room.hostId = socket.id;

      socket.join(room.code);
      io.to(room.code).emit('roomUpdate', roomPublic(room));

      const payload = {
        ok: true,
        room: roomPublic(room),
        isHost: room.hostId === socket.id,
        phase: room.phase,
      };

      if ((room.phase === GAME_PHASES.PLAYING || room.phase === GAME_PHASES.REVEAL) && room.currentSong) {
        payload.currentSong = {
          index: room.playedCount,
          total: room.playlist.length,
          song: room.currentSong.song,
        };
      }

      cb(payload);
    });

    // ========================================
    // GAME EVENTS
    // ========================================

    socket.on('submitSongs', ({ code, songs }, cb) => {
      const room = getRoom(code);
      if (!room) return cb?.({ ok: false });

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return cb?.({ ok: false });

      room.submissions.push({
        playerName: player.name,
        songs: songs || [],
      });

      // Check if all players submitted
      if (room.submissions.length === room.players.length) {
        room.phase = GAME_PHASES.READY;
        io.to(room.code).emit('phaseChange', { phase: GAME_PHASES.READY });
        
        // Auto-start game after countdown (5 seconds)
        setTimeout(() => {
          if (getRoom(code) && getRoom(code).phase === GAME_PHASES.READY) {
            const updatedRoom = getRoom(code);
            buildPlaylist(updatedRoom);
            updatedRoom.phase = GAME_PHASES.PLAYING;
            updatedRoom.currentSong = getCurrentSong(updatedRoom);
            
            io.to(code).emit('phaseChange', { phase: GAME_PHASES.PLAYING });
            io.to(code).emit('songUpdate', {
              song: updatedRoom.currentSong.song,
              index: updatedRoom.currentIndex,
              total: updatedRoom.playlist.length,
            });
          }
        }, 5000);
      }

      cb?.({ ok: true });
    });

    socket.on('startGame', ({ code }, cb) => {
      const room = getRoom(code);
      if (!room) return cb?.({ ok: false });

      // Only host can start
      if (room.hostId !== socket.id) return cb?.({ ok: false });

      // Reset submissions and move to SUBMITTING phase
      room.submissions = [];
      room.phase = GAME_PHASES.SUBMITTING;
      io.to(room.code).emit('phaseChange', { phase: GAME_PHASES.SUBMITTING });

      cb?.({ ok: true });
    });

    socket.on('guess', ({ code, guess }, cb) => {
      const room = getRoom(code);
      if (!room) return cb?.({ ok: false });

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return cb?.({ ok: false });

      player.guess = sanitize(guess);
      io.to(room.code).emit('roomUpdate', roomPublic(room));

      cb?.({ ok: true });
    });

    socket.on('revealSong', ({ code }, cb) => {
      const room = getRoom(code);
      if (!room) return cb?.({ ok: false });

      const results = computeResults(room);
      updateScores(room, results);

      room.phase = GAME_PHASES.REVEAL;
      io.to(room.code).emit('reveal', {
        playerName: room.currentSong.playerName,
        song: room.currentSong.song,
      });
      io.to(room.code).emit('revealResults', { results });

      cb?.({ ok: true });
    });

    socket.on('nextSong', ({ code }, cb) => {
      const room = getRoom(code);
      if (!room) return cb?.({ ok: false });

      // Reset guesses
      room.players.forEach(p => p.guess = null);

      const song = nextSong(room);
      if (!song) {
        room.phase = GAME_PHASES.FINISHED;
        const leaderboard = getLeaderboard(room);
        io.to(room.code).emit('leaderboard', { leaderboard });
      } else {
        room.phase = GAME_PHASES.PLAYING;
        io.to(room.code).emit('songUpdate', {
          song: song.song,
          index: song.index,
          total: song.total,
        });
      }

      cb?.({ ok: true });
    });

    // ========================================
    // CLEANUP
    // ========================================

    socket.on('leaveRoom', ({ code }, cb) => {
      const room = getRoom(code);
      if (!room) return cb?.({ ok: false });

      removePlayer(room, socket.id);
      socket.leave(room.code);

      if (room.players.filter(p => p.id !== null).length === 0) {
        deleteRoom(code);
      } else {
        io.to(room.code).emit('roomUpdate', roomPublic(room));
        scheduleRoomCleanup(room);
      }

      cb?.({ ok: true });
    });

    socket.on('disconnect', () => {
      console.log(`Client déconnecté: ${socket.id}`);
      // TODO: Handle disconnect cleanup
    });
  });
}