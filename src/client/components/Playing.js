import { store } from '../state/store.js';
import { socketService } from '../services/socket.js';
import { audioService } from '../services/audio.js';
import { actions } from '../state/actions.js';
import { esc } from '../utils/client-utils.js';

const BLANK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231e1e35' width='1' height='1'/%3E%3C/svg%3E";

export function renderPlaying() {
  const state = store.getState();
  if (!state.currentSong) return '';
  
  const { song, index, total } = state.currentSong;
  const isHost = state.me.isHost;
  const activePlayers = (state.room?.players ?? []).filter(p => p.id !== null);

  let playerList = `
    <div class="card">
      <span class="section-label">Qui a mis cette musique ?</span>
      <div class="scroll-list">
        ${activePlayers.map(p => `
          <div class="player-entry" data-player-name="${esc(p.name)}" style="cursor:pointer;background:${state.guess === p.name ? '#4a7c59' : 'transparent'};padding:0.5rem;border-radius:6px" onclick="makeGuess(this.dataset.playerName)"
                  title="${state.guess === p.name ? 'Sélectionné' : 'Cliquer pour deviner'}">
            <span>${esc(p.name)}</span>
                  ${state.guess === p.name ? '<span style="color:#00ff00;font-weight:bold">OK</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return `
    <div class="screen">
      <div class="logout-btn" onclick="leaveGame()" title="Quitter la partie">
        <span class="material-symbols-outlined">logout</span>
      </div>
      <p class="progress-text">Musique ${index + 1} / ${total}</p>

      <img class="playing-art" src="${esc(song.artwork)}" alt="${esc(song.title)}"
        onerror="this.src='${BLANK_IMG}'" />

      <div>
        <div class="playing-title">${esc(song.title)}</div>
        <div class="playing-artist">${esc(song.artist)}</div>
      </div>

      ${isHost
      ? `<div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem">
           <button class="btn btn-secondary" id="play-btn" onclick="togglePlayPause()"
             style="min-width:160px"><span>Pause</span><span class="material-symbols-outlined">pause</span></button>
         </div>`
      : ''}

      <div id="player-list">${playerList}</div>

      <div class="spacer"></div>
      ${isHost
      ? `<button class="btn btn-primary btn-lg" id="reveal-btn" onclick="revealSong()" ${(state.room?.players?.filter(p => p.id !== null).every(p => p.guess !== null) && state.room?.players?.filter(p => p.id !== null).length > 1) ? '' : 'disabled'
      }>
             <span>Révéler qui a ajouté ça</span>
             <span class="material-symbols-outlined">visibility</span>
           </button>`
      : ''
    }
    </div>
  `;
}

window.togglePlayPause = () => {
  const state = store.getState();
  if (!state.currentSong || !state.me.isHost) return;
  const { song } = state.currentSong;
  
  if (!state.audio) {
    if (song.preview && state.audio?.src !== song.preview) {
      audioService.play(song.preview);
    }
    if (song.preview) {
      audioService.play(song.preview);
    }
    setPlayButtonState('pause', 'Pause');
  } else {
    audioService.stop();
    setPlayButtonState('play_arrow', 'Reprendre');
  }
};

window.makeGuess = (playerName) => {
  const state = store.getState();
  if (!state.room) return;
  actions.setGuess(playerName);
  socketService.makeGuess(state.room.code, playerName);
  
  const playerListEl = document.querySelector('#player-list');
  if (playerListEl) {
    const activePlayers = (state.room?.players ?? []).filter(p => p.id !== null);
    playerListEl.innerHTML = `
      <div class="card">
        <span class="section-label">Qui a mis cette musique ?</span>
        <div class="scroll-list">
          ${activePlayers.map(p => `
            <div class="player-entry" data-player-name="${esc(p.name)}" style="cursor:pointer;background:${state.guess === p.name ? '#4a7c59' : 'transparent'};padding:0.5rem;border-radius:6px" onclick="makeGuess(this.dataset.playerName)"
              title="${state.guess === p.name ? 'Sélectionné' : 'Cliquer pour deviner'}">
              <span>${esc(p.name)}</span>
              ${state.guess === p.name ? '<span style="color:#00ff00"><span class="material-symbols-outlined">check_circle</span></span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  const revealBtn = document.getElementById('reveal-btn');
  if (revealBtn && state.room?.players?.every(p => p.guess !== null) && state.room?.players?.length > 1) {
    revealBtn.disabled = false;
  }
};

window.revealSong = () => {
  const state = store.getState();
  if (!state.me.isHost || !state.room) return;
  audioService.stop();
  socketService.revealSong(state.room.code);
};

function setPlayButtonState(iconName, label) {
  const btn = document.getElementById('play-btn');
  if (!btn) return;
  btn.innerHTML = `<span>${esc(label)}</span><span class="material-symbols-outlined">${iconName}</span>`;
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