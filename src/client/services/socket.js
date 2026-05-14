import { io } from "socket.io-client";
import { actions } from '../state/actions.js';
import { store } from '../state/store.js';
import { audioService } from './audio.js';
import { GAME_PHASES } from '../../shared/constants.js';

// Service de gestion Socket.IO
export class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    this.socket = io();
    actions.setSocket(this.socket);
    this.bindEvents();
    return this.socket;
  }

  bindEvents() {
    const { socket } = this;

    socket.on('roomUpdate', room => {
      actions.setRoom(room);
      // Track current host based on the latest server state.
      const state = store.getState();
      actions.setMe({ isHost: !!(room.hostId && socket?.id && room.hostId === socket.id) });
      // Update UI if in playing phase (for guess updates)
      if (state.phase === GAME_PHASES.PLAYING) {
        // Player list is updated automatically through roomUpdate
      }
      // UI is refreshed automatically through store subscribe
    });

    socket.on('phaseChange', ({ phase }) => {
      actions.setPhase(phase);
      if (phase === GAME_PHASES.SUBMITTING) {
        actions.resetSubmission();
      }
      if (phase === GAME_PHASES.PLAYING) {
        audioService.stop();
      }
    });

    socket.on('songUpdate', data => {
      actions.setCurrentSong(data);
      audioService.stop();
      actions.setCurrentSong(data);
      actions.setPhase(GAME_PHASES.PLAYING);
      actions.setGuess(null);
    });

    socket.on('reveal', data => {
      actions.setRevealData(data);
      actions.setPhase(GAME_PHASES.REVEAL);
      // TODO: render();
    });
    socket.on('revealResults', data => {
        const currentReveal = store.getState().revealData;
        actions.setRevealData({ ...currentReveal, results: data.results });
        // TODO: render();
    });
    socket.on('leaderboard', ({ leaderboard }) => {
      actions.setLeaderboard(leaderboard);
      actions.setPhase(GAME_PHASES.FINISHED);
      // TODO: render();
    });
    
    socket.on('disconnect', () => {
      actions.setErrorMsg('Connexion perdue. Rechargement…');
      // TODO: render();
      setTimeout(() => location.reload(), 2500);
    })
  }
  // Actions socket
  createRoom(name, config, callback) {
    this.socket.emit('createRoom', { name, config }, callback);
  }

  joinRoom(code, name, callback) {
    this.socket.emit('joinRoom', { code, name }, callback);
  }

  reconnectRoom(code, name, callback) {
    this.socket.emit('reconnectRoom', { code, name }, callback);
  }

  updateConfig(code, config) {
    this.socket.emit('updateConfig', { code, config });
  }

  startSubmission(code) {
    this.socket.emit('startGame', { code });
  }

  launchGame(code = store.getState().room?.code) {
    if (!code) return;
    this.socket.emit('launchGame', { code });
  }

  submitSongs(codeOrSongs, maybeSongs, callback) {
    const room = store.getState().room;
    if (!room) return;
    const code = Array.isArray(codeOrSongs) ? room.code : codeOrSongs;
    const songs = Array.isArray(codeOrSongs) ? codeOrSongs : maybeSongs;
    this.socket.emit('submitSongs', { code, songs }, callback);
  }

  startGame() {
    const room = store.getState().room;
    if (!room) return;
    this.socket.emit('startGame', { code: room.code });
  }

  makeGuess(codeOrGuess, maybeGuess) {
    const room = store.getState().room;
    if (!room) return;
    const code = maybeGuess === undefined ? room.code : codeOrGuess;
    const guess = maybeGuess === undefined ? codeOrGuess : maybeGuess;
    actions.setGuess(guess);
    this.socket.emit('guess', { code, guess });
  }

  revealSong(code = store.getState().room?.code) {
    const room = store.getState().room;
    if (!room || !code) return;
    this.socket.emit('revealSong', { code });
  }

  nextSong(code = store.getState().room?.code) {
    const room = store.getState().room;
    if (!room || !code) return;
    this.socket.emit('nextSong', { code });
  }

  restartGame(code = store.getState().room?.code) {
    if (!code) return;
    this.socket.emit('startGame', { code });
  }

  leaveRoom(code = store.getState().room?.code) {
    const room = store.getState().room;
    if (room && code) {
      this.socket.emit('leaveRoom', { code });
    }
  }
}

export const socketService = new SocketService();
