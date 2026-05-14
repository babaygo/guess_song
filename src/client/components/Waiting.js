import { store } from '../state/store.js';
import { esc } from '../utils/client-utils.js';

export function renderWaiting() {
  const state = store.getState();
  const room = state.room;

  if (!room) {
    return '<div class="screen"><div class="card"><p>Chargement...</p></div></div>';
  }

  const players = room.players || [];
  const readyCount = players.filter(p => p.ready).length;
  const totalCount = players.length;

  const rows = players.map(p => `
    <div class="player-entry">
      <span>${esc(p.name)}</span>
      <div class="ready-dot ${p.ready ? 'yes' : 'no'}" title="${p.ready ? 'Prêt' : 'En cours…'}"></div>
    </div>
  `).join('');

  return `
    <div class="screen">
      <div class="logout-btn" onclick="leaveGame()" title="Quitter la partie">
        <span class="material-symbols-outlined">logout</span>
      </div>
      <div class="center-screen">
        <div class="waiting-anim">...</div>
        <div>
          <h2 class="ui-heading">Musiques envoyées !</h2>
          <p class="subtitle" style="margin-top:0.4rem">En attente des autres joueurs…</p>
        </div>
        <div class="card" style="width:100%;max-width:300px">
          <span class="section-label">Prêts ${readyCount} / ${totalCount}</span>
          ${rows}
        </div>
      </div>
    </div>
  `;
}

window.leaveGame = () => {
  const state = store.getState();
  if (state.room) {
    import('../services/socket.js').then(m => {
      m.socketService.leaveRoom(state.room.code);
    });
  }
  import('../state/actions.js').then(m => {
    m.actions.setRoom(null);
    m.actions.setPhase('home');
  });
};