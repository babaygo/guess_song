import { store } from '../state/store.js';
import { socketService } from '../services/socket.js';
import { esc } from '../utils/client-utils.js';
import { GAME_PHASES } from '../../shared/constants.js';

export function renderReady() {
  const state = store.getState();
  const room = state.room;

  if (!room) {
    return '<div class="screen"><div class="card"><p>Chargement...</p></div></div>';
  }

  const players = room.players || [];
  const total = players.length * (room.config?.songsPerPlayer || 4);
  const isHost = state.me.isHost;

  const rows = players.map(p => `
    <div class="player-entry">
      <span>${esc(p.name)}</span>
      <span class="badge badge-green">Prêt</span>
    </div>
  `).join('');

  return `
    <div class="screen">
      <div class="logout-btn" onclick="leaveGame()" title="Quitter la partie">
        <span class="material-symbols-outlined">logout</span>
      </div>
      <div class="center-screen">
        <div class="ui-kicker">Prêts</div>
        <div>
          <h1 class="title">Tout le monde est prêt !</h1>
          <p class="subtitle" style="margin-top:0.4rem">${total} musiques à deviner</p>
        </div>
        <div class="card" style="width:100%;max-width:300px;text-align:left">${rows}</div>
        ${isHost
      ? `<button class="btn btn-primary btn-lg" style="max-width:300px" onclick="launchGame()">
               Lancer la partie
             </button>`
      : `<p class="subtitle">L'hôte va lancer la partie…</p>`
    }
      </div>
    </div>
  `;
}

window.launchGame = () => {
  const state = store.getState();
  if (!state.me.isHost || !state.room) return;
  socketService.launchGame(state.room.code);
};

window.leaveGame = () => {
  const state = store.getState();
  if (state.room) {
    import('../services/socket.js').then(m => {
      m.socketService.leaveRoom(state.room.code);
    });
  }
  import('../state/actions.js').then(m => {
    m.actions.setRoom(null);
    m.actions.setPhase(GAME_PHASES.HOME);
  });
};