import { store } from '../state/store.js';
import { actions } from '../state/actions.js';
import { socketService } from '../services/socket.js';
import { apiService } from '../services/api.js';
import { audioService } from '../services/audio.js';
import { esc, showError } from '../utils/client-utils.js';
import { GAME_PHASES } from '../../shared/constants.js';

const BLANK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231e1e35' width='1' height='1'/%3E%3C/svg%3E";

export function renderSubmitting() {
  const state = store.getState();
  const { myList, searchResults, isSearching, searchError, previewingId, searchQuery } = state;
  const needed = state.room?.config?.songsPerPlayer || 4;
  const count = myList.length;
  const done = count >= needed;

  return `
    <div class="screen">
      <div class="row-between">
        <div>
          <h2 class="ui-heading">${esc(state.me.name)}</h2>
          <p class="ui-meta">${count} / ${needed} musiques</p>
        </div>
        <span class="badge">${count}/${needed}</span>
      </div>

      <div class="info-box">Les autres ne voient pas ce que tu ajoutes</div>

      <div class="card">
        <span class="section-label">Rechercher une musique</span>
        <input class="input" id="search-input" type="search"
          placeholder="Titre, artiste…"
          autocomplete="off" autocorrect="off"
          value="${esc(searchQuery)}"
          oninput="onSearch(this.value)" />
        <div id="search-results" style="margin-top:0.7rem" class="scroll-list">
          ${renderSearchResults()}
        </div>
      </div>

      ${count > 0 ? `
        <div class="card">
          <span class="section-label">Ma liste <span class="badge" style="margin-left:0.3rem">${count}</span></span>
          <div class="scroll-list">${renderMyList()}</div>
        </div>
      ` : ''}

      <div class="spacer"></div>
      <button class="btn btn-primary btn-lg ${done ? 'btn-pulse' : ''}"
        onclick="submitSongs()"
        ${done ? '' : 'disabled'}>
        ${done ? `Valider mes musiques` : `Ajoute encore ${needed - count} musique${needed - count > 1 ? 's' : ''}`}
      </button>
      <button class="btn btn-ghost" style="width:100%;margin-top:0.5rem" onclick="leaveRoom()">
        <span class="material-symbols-outlined">logout</span>
        <span>Quitter la salle</span>
      </button>
    </div>
  `;
}

function renderSearchResults() {
  const state = store.getState();
  const { searchResults, isSearching, searchError, searchQuery, previewingId, myList } = state;
  
  if (isSearching) {
    return `<div class="search-hint"><div class="loading-dots"><span></span><span></span><span></span></div></div>`;
  }
  if (searchError) {
    return `<div class="search-hint" style="color:#ff6b6b">${esc(searchError)}</div>`;
  }
  if (searchResults.length > 0) {
    return searchResults.map((song, i) => {
      const added = myList.some(x => x.id === song.id);
      const playing = previewingId === song.id;
      return `
        <div class="song-item">
          <img class="song-art" src="${esc(song.artwork)}" alt="" loading="lazy"
            onerror="this.src='${BLANK_IMG}'" />
          <div class="song-info">
            <div class="song-title">${esc(song.title)}</div>
            <div class="song-artist">${esc(song.artist)}</div>
          </div>
          ${song.preview
          ? `<button class="icon-btn is-play" onclick="togglePreview(${i})" title="${playing ? 'Pause' : 'Lecture'}"><span class="material-symbols-outlined">${playing ? 'pause' : 'play_arrow'}</span></button>`
          : ''}
          <button class="icon-btn ${added ? 'is-remove' : 'is-add'}"
            onclick="toggleSong(${i})">${added ? '−' : '+'}</button>
        </div>
      `;
    }).join('');
  }
  if (searchQuery) return `<div class="search-hint">Aucun résultat pour « ${esc(searchQuery)} »</div>`;
  return `<div class="search-hint">Tape le titre ou l'artiste</div>`;
}

function renderMyList() {
  const state = store.getState();
  const { myList } = state;
  return myList.map((song, i) => `
    <div class="song-item">
      <img class="song-art" src="${esc(song.artwork)}" alt="" loading="lazy"
        onerror="this.src='${BLANK_IMG}'" />
      <div class="song-info">
        <div class="song-title">${esc(song.title)}</div>
        <div class="song-artist">${esc(song.artist)}</div>
      </div>
      <button class="icon-btn is-remove" onclick="removeFromList(${i})" title="Retirer"><span class="material-symbols-outlined">close</span></button>
    </div>
  `).join('');
}

window.onSearch = (value) => {
  const state = store.getState();
  const query = value.trim();
  
  actions.setSearchQuery(query);
  
  if (state.searchDebounce) {
    clearTimeout(state.searchDebounce);
  }
  
  if (query.length < 2) {
    actions.setSearchResults([]);
    actions.setSearchError(null);
    actions.setIsSearching(false);
    refreshSearchUI();
    return;
  }
  
  actions.setIsSearching(true);
  actions.setSearchError(null);
  refreshSearchUI();
  
  const timeout = setTimeout(async () => {
    try { 
      const results = await apiService.searchSongs(query);
      actions.setSearchResults(results || []);
      actions.setSearchError(null);
    }
    catch (_) { 
      actions.setSearchResults([]);
      actions.setSearchError('Erreur réseau. Réessayez.');
    }
    actions.setIsSearching(false);
    refreshSearchUI();
  }, 500);
  
  actions.setSearchDebounce(timeout);
};

function refreshSearchUI() {
  const el = document.getElementById('search-results');
  if (el) el.innerHTML = renderSearchResults();
}

window.togglePreview = (i) => {
  const state = store.getState();
  const song = state.searchResults[i];
  if (!song?.preview) return;
  
  if (state.previewingId === song.id) {
    audioService.stop();
    actions.setPreviewingId(null);
  } else {
    audioService.stop();
    audioService.play(song.preview);
    actions.setPreviewingId(song.id);
  }
  refreshSearchUI();
};

window.toggleSong = (i) => {
  const state = store.getState();
  const song = state.searchResults[i];
  if (!song) return;
  
  const idx = state.myList.findIndex(x => x.id === song.id);
  if (idx >= 0) {
    actions.setMyList(state.myList.filter((_, index) => index !== idx));
  } else if (state.myList.length < (state.room?.config?.songsPerPlayer ?? 4)) {
    actions.setMyList([...state.myList, song]);
  }
  
  setTimeout(() => {
    const inp = document.getElementById('search-input');
    if (inp) { inp.value = state.searchQuery; inp.focus(); }
  }, 0);
};

window.removeFromList = (i) => {
  const state = store.getState();
  actions.setMyList(state.myList.filter((_, index) => index !== i));
  
  setTimeout(() => {
    const inp = document.getElementById('search-input');
    if (inp) inp.value = state.searchQuery;
  }, 0);
};

window.submitSongs = () => {
  const state = store.getState();
  const needed = state.room?.config?.songsPerPlayer ?? 4;
  if (state.myList.length < needed) return;
  
  socketService.submitSongs(state.room.code, state.myList, (res) => {
    if (!res || !res.ok) { 
      showError(res?.error ?? 'Erreur envoi'); 
      return; 
    }
    if (state.phase === GAME_PHASES.SUBMITTING) {
      actions.setPhase(GAME_PHASES.WAITING);
    }
  });
};

window.leaveRoom = () => {
  const state = store.getState();
  if (!state.room) return;
  socketService.leaveRoom(state.room.code);
  actions.setRoom(null);
  actions.setPhase(GAME_PHASES.HOME);
};
