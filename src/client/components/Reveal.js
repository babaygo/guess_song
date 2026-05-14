import { store } from '../state/store.js';
import { socketService } from '../services/socket.js';
import { esc } from '../utils/client-utils.js';

const BLANK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231e1e35' width='1' height='1'/%3E%3C/svg%3E";

export function renderReveal() {
  const state = store.getState();
  if (!state.revealData || !state.currentSong) return '';
  
  const { playerName, song, results } = state.revealData;
  const { index, total } = state.currentSong;
  const isLast = index >= total - 1;

  let resultsHtml = '';
  if (results && Array.isArray(results)) {
    resultsHtml = `
      <div class="card">
        <span class="section-label">Résultats</span>
        <div class="scroll-list">
          ${results.map(r => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;margin-top:0.5rem;border-radius:6px;background:${r.correct ? '#0d3b2f' : '#3b0d0d'}">
              <span style="flex:1">${esc(r.playerName)}</span>
              <span style="display:inline-flex;align-items:center;gap:0.35rem;font-weight: 500;color:${r.correct ? '#ffffff' : '#ffffff'}">${r.correct ? 'Bien joué !' : 'Nop :('}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="screen">
      <div class="logout-btn" onclick="leaveGame()" title="Quitter la partie">
        <span class="material-symbols-outlined">logout</span>
      </div>
      <p class="progress-text">Musique ${index + 1} / ${total}</p>

      <div class="card row" style="gap:1rem">
        <img style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0"
          src="${esc(song.artwork)}" alt=""
          onerror="this.src='${BLANK_IMG}'" />
        <div>
          <div style="font-weight:700;font-size:1rem">${esc(song.title)}</div>
          <div class="ui-meta">${esc(song.artist)}</div>
        </div>
      </div>

      <div class="reveal-card">
        <div class="reveal-label">Cette musique a été ajoutée par</div>
        <div class="reveal-name">${esc(playerName)}</div>
      </div>

      ${resultsHtml}

      <div class="spacer"></div>
      ${state.me.isHost
      ? `<button class="btn btn-primary btn-lg" onclick="nextSong()">
             <span>${isLast ? 'Voir le récap' : 'Musique suivante'}</span>
             <span class="material-symbols-outlined">${isLast ? 'flag' : 'arrow_forward'}</span>
           </button>`
      : `<div class="info-box">L'hôte passe à la suite…</div>`
    }
    </div>
  `;
}

window.nextSong = () => {
  const state = store.getState();
  if (!state.me.isHost || !state.room) return;
  socketService.nextSong(state.room.code);
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
    m.actions.setPhase('home');
  });
};