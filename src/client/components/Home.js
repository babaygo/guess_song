import { store } from '../state/store.js';
import { actions } from '../state/actions.js';
import { socketService } from '../services/socket.js';
import { GAME_PHASES } from '../../shared/constants.js';
import { esc, sanitizeLocal, showError, persistSession } from '../utils/client-utils.js';

// Composant Home - Créer ou rejoindre une partie
export function renderHome() {
  const state = store.getState();

  return `
    <div class="screen" style="min-height: 0;">
      <h1 class="title">Guess the Song</h1>
      <p class="subtitle">Chacun ajoute ses musiques depuis son téléphone,<br>puis on devine qui a mis quoi !</p>

      ${state.errorMsg ? `<div class="error-msg">${esc(state.errorMsg)}</div>` : ''}

      <div class="card">
        <span class="section-label">Mon pseudo</span>
        <input class="input" id="input-name" type="text"
          placeholder="ex: John Doe" maxlength="20"
          value="${esc(state.me.name)}"
          oninput="handleNameChange(this.value)" />
      </div>

      <button class="btn btn-primary btn-lg" onclick="handleCreateRoom()">
        Créer une partie
      </button>

      <div style="display:flex;align-items:center;gap:0.75rem">
        <hr class="divider" style="flex:1" />
        <span style="color:var(--text-muted);font-size:0.85rem">ou</span>
        <hr class="divider" style="flex:1" />
      </div>

      <div class="card" style="display:flex;flex-direction:column;gap:0.75rem">
        <span class="section-label">Rejoindre avec un code</span>
        <input class="input" id="input-code" type="text"
          placeholder="ex: A3F2" maxlength="4"
          style="text-transform:uppercase;letter-spacing:0.15em;font-size:1.2rem;font-weight:700"
          oninput="this.value=this.value.toUpperCase()" />
        <button class="btn btn-primary" style="width:100%" onclick="handleJoinRoom()">
          Rejoindre une partie
        </button>
      </div>
    </div>
  `;
}

// Handlers pour Home
window.handleNameChange = (value) => {
  actions.setMe({ name: value.trim() });
};

window.handleCreateRoom = () => {
  const name = sanitizeLocal(store.getState().me.name);
  if (!name) {
    showError('Entre ton pseudo !');
    return;
  }
  actions.setMe({ name });
  actions.setErrorMsg('');

  socketService.createRoom(name, { songsPerPlayer: 4 }, (res) => {
    if (!res.ok) {
      showError(res.error ?? 'Erreur création salle');
      return;
    }
    actions.setMe({ isHost: true });
    actions.setRoom(res.room);
    actions.setPhase(GAME_PHASES.LOBBY);
    persistSession();
  });
};

window.handleJoinRoom = () => {
  const code = document.getElementById('input-code').value.trim().toUpperCase();
  const name = sanitizeLocal(store.getState().me.name);

  if (!code) {
    showError('Entre un code de salle !');
    return;
  }
  if (!name) {
    showError('Entre ton pseudo !');
    return;
  }

  socketService.joinRoom(code, name, (res) => {
    if (!res.ok) {
      showError(res.error ?? 'Erreur rejoindre salle');
      return;
    }
    actions.setRoom(res.room);
    actions.setPhase(GAME_PHASES.LOBBY);
    persistSession();
  });
};