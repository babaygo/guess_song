import { store } from '../state/store.js';
import { actions } from '../state/actions.js';
import { socketService } from '../services/socket.js';
import { esc } from '../utils/client-utils.js';
import { GAME_PHASES } from '../../shared/constants.js';

// Composant Lobby - Attendre que les joueurs rejoignent
export function renderLobby() {
  const state = store.getState();
  const room = state.room;

  if (!room) return '<div>Chargement...</div>';

  const players = room.players || [];
  const config = room.config || {};
  const isHost = state.me.isHost;

  const playerRows = players.map(p => {
    const isMe = p.name === state.me.name;
    return `
      <div class="player-entry">
        <span>${esc(p.name)}${isMe ? ' <span style="color:var(--text-muted);font-size:0.8rem">(moi)</span>' : ''}
          ${p.id === room.hostId ? '<span class="host-crown" title="Hôte"><span class="material-symbols-outlined">military_tech</span></span>' : ''}
        </span>
        <div class="ready-dot no" title="En attente"></div>
      </div>
    `;
  }).join('');

  const songOpts = [2, 3, 4, 5, 6].map(n => `
    <button class="option-btn ${config.songsPerPlayer === n ? 'active' : ''}"
      ${isHost ? `onclick="updateConfig('songsPerPlayer',${n})"` : 'disabled'}>${n}</button>
  `).join('');

  return `
    <div class="screen">
      <div class="col-center">
        <div class="col-center">
          <h2 class="ui-heading">Salle de jeu</h2>
          <p class="ui-meta">Partage le code</p>
        </div>

        <div style="display:flex;align-items:center;gap:0.5rem">
          <div class="room-code">${esc(room.code)}</div>
          <button class="icon-btn is-play" onclick="copyRoomCode()" title="Copier le code" aria-label="Copier le code">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
        </div>
      </div>

      <div class="card">
        <span class="section-label">Joueurs (${players.length})</span>
        ${playerRows}
      </div>

      <div class="card">
        <span class="section-label">Musiques par joueur ${!isHost ? '<span style="color:var(--text-muted)">(hôte seulement)</span>' : ''}</span>
        <div class="option-row">${songOpts}</div>
      </div>

      <div class="spacer"></div>
      ${isHost
      ? `<button class="btn btn-primary btn-lg"
            onclick="startSubmission()"
            ${players.length < 2 ? 'disabled' : ''}>
            ${players.length < 2 ? 'Attends un autre joueur…' : 'Tout le monde est là ? C\'est parti !'}
           </button>
           <button class="btn btn-ghost" style="width:100%;margin-top:0.5rem" onclick="leaveRoom()">
             <span class="material-symbols-outlined">logout</span>
             <span>Quitter la salle</span>
           </button>`
      : `<div class="center-screen" style="flex:0">
             <div class="waiting-anim">...</div>
             <p class="subtitle">En attente que l'hôte lance la partie…</p>
           </div>
           <button class="btn btn-ghost" style="width:100%" onclick="leaveRoom()">
             <span class="material-symbols-outlined">logout</span>
             <span>Quitter la salle</span>
           </button>`
    }
    </div>
  `;
}

// Handlers pour Lobby
window.updateConfig = (key, value) => {
  if (!state.me.isHost || !state.room) return;
  socketService.updateConfig(state.room.code, { [key]: value });
};

window.copyRoomCode = async () => {
  const code = store.getState().room?.code;
  if (!code) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
      return;
    }
  } catch (_) { }

  const ta = document.createElement('textarea');
  ta.value = code;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
};

window.startSubmission = () => {
  const state = store.getState();
  if (!state.me.isHost || !state.room) return;
  socketService.startSubmission(state.room.code);
};

window.leaveRoom = () => {
  const state = store.getState();
  if (!state.room) return;
  socketService.leaveRoom(state.room.code);
  actions.setRoom(null);
  actions.setPhase(GAME_PHASES.HOME);
};