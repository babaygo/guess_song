import { store } from '../state/store.js';
import { socketService } from '../services/socket.js';
import { esc } from '../utils/client-utils.js';
import { actions } from '../state/actions.js';
import { GAME_PHASES } from '../../shared/constants.js';

export function renderFinished() {
  const state = store.getState();
  const leaderboard = state.leaderboard || [];
  const isHost = state.me.isHost;

  const items = leaderboard.map(({ name, score }, index) => `
    <div class="leaderboard-item ${name === state.me.name ? 'me' : ''}">
      <div class="rank">${index + 1}</div>
      <div class="player-name">${esc(name)}${name === state.me.name ? ' (toi)' : ''}</div>
      <div class="score">${score} pt${score > 1 ? 's' : ''}</div>
    </div>
  `).join('');

  return `
    <div class="screen">
      <div class="logout-btn" onclick="leaveGame()" title="Quitter la partie">
        <span class="material-symbols-outlined">logout</span>
      </div>
      <h1 class="title">Fin de partie !</h1>
      <p class="subtitle">Classement final</p>
      <div class="card">
        <span class="section-label">Scores</span>
        <div class="scroll-list">${items}</div>
      </div>
      <div class="spacer"></div>
      ${isHost
      ? `<button class="btn btn-primary btn-lg" onclick="restartGame()"><span>Rejouer</span><span class="material-symbols-outlined">refresh</span></button>`
      : `<div class="info-box">L'hôte peut lancer une nouvelle partie…</div>`
    }
    </div>
  `;
}

window.restartGame = () => {
  const state = store.getState();
  if (!state.me.isHost || !state.room) return;
  socketService.restartGame(state.room.code);
};

window.leaveGame = () => {
  const state = store.getState();
  if (state.room) {
    import('../services/socket.js').then(m => {
      m.socketService.leaveRoom(state.room.code);
    });
  }
  actions.setRoom(null);
  actions.setPhase(GAME_PHASES.HOME);
};