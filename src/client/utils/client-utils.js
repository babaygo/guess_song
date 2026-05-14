// Utilitaires UI pour le rendu et les interactions
import { actions } from '../state/actions.js';
import { store } from '../state/store.js';
import { socketService } from '../services/socket.js';

export function sanitizeLocal(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 20);
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showError(message) {
  actions.setErrorMsg(message);
  console.error(message);
}

export function persistSession() {
  const state = store.getState();
  if (state.me && state.room) {
    sessionStorage.setItem('gameSession', JSON.stringify({
      me: state.me,
      room: { code: state.room.code },
      timestamp: Date.now()
    }));
  }
}

export function hydrateLocalSession() {
  const session = sessionStorage.getItem('gameSession');
  if (session) {
    try {
      const data = JSON.parse(session);
      // Restore session if less than 2 hours old
      if (Date.now() - data.timestamp < 2 * 60 * 60 * 1000) {
        actions.setMe(data.me);
        actions.setRoom(data.room);
      } else {
        sessionStorage.removeItem('gameSession');
      }
    } catch (error) {
      console.error('Erreur hydratation session:', error);
      sessionStorage.removeItem('gameSession');
    }
  }
}

export function attemptAutoReconnect() {
  const session = sessionStorage.getItem('gameSession');
  if (session) {
    try {
      const data = JSON.parse(session);
      if (Date.now() - data.timestamp < 2 * 60 * 60 * 1000) {
        // Attempt to reconnect with stored session
        socketService.reconnectRoom(
          data.room.code,
          data.me.name,
          (res) => {
            if (res.ok) {
              actions.setMe({ ...data.me, isHost: res.room.hostId === socketService.socket?.id });
              actions.setRoom(res.room);
              actions.setPhase(res.room.phase || 'lobby');
            } else {
              sessionStorage.removeItem('gameSession');
            }
          }
        );
      } else {
        sessionStorage.removeItem('gameSession');
      }
    } catch (error) {
      console.error('Erreur auto-reconnexion:', error);
      sessionStorage.removeItem('gameSession');
    }
  }
}