'use strict';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CIRC     = 2 * Math.PI * 45;
const BLANK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231e1e35' width='1' height='1'/%3E%3C/svg%3E";

// ─── STATE ────────────────────────────────────────────────────────────────────
const s = {
  socket:      null,
  me:          { name: '', isHost: false },
  room:        null,   // roomPublic from server
  phase:       'home', // home | lobby | submitting | waiting | ready | playing | reveal | finished

  // Submission
  myList:          [],
  searchResults:   [],
  searchQuery:     '',
  searchDebounce:  null,
  isSearching:     false,
  previewingId:    null,

  // Playing
  currentSong:     null,  // { song, index, total }
  timerInterval:   null,
  timerRemaining:  0,
  timerStarted:    false,
  audio:           null,

  // Reveal
  revealData:      null,  // { playerName, song }

  // Finished
  recap:           [],

  errorMsg:        '',
};

// ─── BOOT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  s.socket = io();
  bindSocketEvents();
  render();
});

// ─── SOCKET EVENTS ───────────────────────────────────────────────────────────
function bindSocketEvents() {
  const { socket } = s;

  socket.on('roomUpdate', room => {
    s.room = room;
    // Sync config if we're host
    if (s.me.isHost) s.me.isHost = true;
    refreshLobby();
  });

  socket.on('phaseChange', ({ phase }) => {
    s.phase = phase;
    if (phase === 'submitting') {
      s.myList = [];
      s.searchResults = [];
      s.searchQuery = '';
    }
    if (phase === 'playing') {
      s.timerStarted = false;
      clearTimer();
      stopAudio();
    }
    render();
  });

  socket.on('songUpdate', data => {
    s.currentSong = data;
    s.timerStarted = false;
    s.phase = 'playing';
    clearTimer();
    stopAudio();
    render();
  });

  socket.on('reveal', data => {
    s.revealData = data;
    s.phase = 'reveal';
    render();
  });

  socket.on('recap', ({ recap }) => {
    s.recap = recap;
    s.phase = 'finished';
    render();
  });

  socket.on('disconnect', () => {
    s.errorMsg = 'Connexion perdue. Rechargement…';
    render();
    setTimeout(() => location.reload(), 2500);
  });
}

// ─── RENDER DISPATCHER ───────────────────────────────────────────────────────
function render() {
  stopAudio();
  const app = document.getElementById('app');
  const map = {
    home:       renderHome,
    lobby:      renderLobby,
    submitting: renderSubmitting,
    waiting:    renderWaiting,
    ready:      renderReady,
    playing:    renderPlaying,
    reveal:     renderReveal,
    finished:   renderFinished,
  };
  app.innerHTML = (map[s.phase] ?? renderHome)();
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME — create or join
// ─────────────────────────────────────────────────────────────────────────────
function renderHome() {
  return `
    <div class="screen">
      <div class="logo">🎵</div>
      <h1 class="title">Guess the Song</h1>
      <p class="subtitle">Chacun ajoute ses musiques depuis son téléphone,<br>puis on devine qui a mis quoi !</p>

      ${s.errorMsg ? `<div class="error-msg">${esc(s.errorMsg)}</div>` : ''}

      <div class="card">
        <span class="section-label">Mon prénom</span>
        <input class="input" id="input-name" type="text"
          placeholder="ex: Lucas" maxlength="20"
          value="${esc(s.me.name)}"
          oninput="s.me.name = this.value.trim()" />
      </div>

      <button class="btn btn-primary btn-lg" onclick="createRoom()">
        Créer une partie 🎮
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
        <button class="btn btn-secondary" style="width:100%" onclick="joinRoom()">
          Rejoindre →
        </button>
      </div>
    </div>
  `;
}

function createRoom() {
  const name = sanitizeLocal(s.me.name);
  if (!name) { showError('Entre ton prénom !'); return; }
  s.me.name = name;
  s.errorMsg = '';
  s.socket.emit('createRoom', { name, config: { songsPerPlayer: 4, timerDuration: 20 } }, res => {
    if (!res.ok) { showError(res.error ?? 'Erreur création salle'); return; }
    s.me.isHost = true;
    s.room = res.room;
    s.phase = 'lobby';
    render();
  });
}

function joinRoom() {
  const name = sanitizeLocal(s.me.name);
  const code = (document.getElementById('input-code')?.value ?? '').trim().toUpperCase();
  if (!name) { showError('Entre ton prénom !'); return; }
  if (code.length < 4) { showError('Entre le code à 4 lettres.'); return; }
  s.me.name = name;
  s.errorMsg = '';
  s.socket.emit('joinRoom', { code, name }, res => {
    if (!res.ok) { showError(res.error ?? 'Erreur'); return; }
    s.me.isHost = false;
    s.room = res.room;
    s.phase = 'lobby';
    render();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LOBBY
// ─────────────────────────────────────────────────────────────────────────────
function renderLobby() {
  if (!s.room) return renderHome();
  const { code, players, config } = s.room;
  const isHost = s.me.isHost;

  const playerRows = players.map(p => {
    const isMe = p.name === s.me.name;
    return `
      <div class="player-entry">
        <span>${esc(p.name)}${isMe ? ' <span style="color:var(--text-muted);font-size:0.8rem">(moi)</span>' : ''}
          ${p.id === s.room.hostId ? '<span class="host-crown">👑</span>' : ''}
        </span>
        <div class="ready-dot no" title="En attente"></div>
      </div>
    `;
  }).join('');

  const songOpts = [2, 3, 4, 5, 6].map(n => `
    <button class="option-btn ${config.songsPerPlayer === n ? 'active' : ''}"
      ${isHost ? `onclick="updateConfig('songsPerPlayer',${n})"` : 'disabled'}>${n}</button>
  `).join('');

  const timerOpts = [10, 20, 30].map(t => `
    <button class="option-btn ${config.timerDuration === t ? 'active' : ''}"
      ${isHost ? `onclick="updateConfig('timerDuration',${t})"` : 'disabled'}>${t}s</button>
  `).join('');

  return `
    <div class="screen">
      <div class="row-between" style="align-items:flex-start">
        <div>
          <h2 style="font-size:1.2rem;font-weight:800">Salle de jeu</h2>
          <p style="color:var(--text-muted);font-size:0.82rem">Partage le code</p>
        </div>
        <div class="room-code">${esc(code)}</div>
      </div>

      <div class="info-box">📱 Chaque joueur ouvre cette page sur son téléphone et entre le code <strong>${esc(code)}</strong></div>

      <div class="card">
        <span class="section-label">Joueurs (${players.length})</span>
        ${playerRows}
      </div>

      <div class="card">
        <span class="section-label">Musiques par joueur ${!isHost ? '<span style="color:var(--text-muted)">(hôte seulement)</span>' : ''}</span>
        <div class="option-row">${songOpts}</div>
      </div>

      <div class="card">
        <span class="section-label">Temps de réflexion ${!isHost ? '<span style="color:var(--text-muted)">(hôte seulement)</span>' : ''}</span>
        <div class="option-row">${timerOpts}</div>
      </div>

      <div class="spacer"></div>
      ${isHost
        ? `<button class="btn btn-primary btn-lg"
            onclick="startSubmission()"
            ${players.length < 2 ? 'disabled' : ''}>
            ${players.length < 2 ? 'Attends un autre joueur…' : 'Tout le monde est là ? C\'est parti ! 🚀'}
           </button>`
        : `<div class="center-screen" style="flex:0">
             <div class="waiting-anim">⏳</div>
             <p class="subtitle">En attente que l'hôte lance la partie…</p>
           </div>`
      }
    </div>
  `;
}

function refreshLobby() {
  if (s.phase === 'lobby') render();
}

function updateConfig(key, value) {
  if (!s.me.isHost || !s.room) return;
  const config = { ...s.room.config, [key]: value };
  s.socket.emit('updateConfig', { code: s.room.code, config });
}

function startSubmission() {
  if (!s.me.isHost || !s.room) return;
  s.socket.emit('startSubmission', { code: s.room.code });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────
function renderSubmitting() {
  if (!s.room) return '';
  const needed = s.room.config.songsPerPlayer;
  const count  = s.myList.length;
  const done   = count >= needed;

  return `
    <div class="screen">
      <div class="row-between">
        <div>
          <h2 style="font-size:1.3rem;font-weight:800">${esc(s.me.name)}</h2>
          <p style="color:var(--text-muted);font-size:0.82rem">${count} / ${needed} musiques</p>
        </div>
        <span class="badge">${count}/${needed}</span>
      </div>

      <div class="info-box">🔒 Les autres ne voient pas ce que tu ajoutes</div>

      <div class="card">
        <span class="section-label">Rechercher une musique</span>
        <input class="input" id="search-input" type="search"
          placeholder="Titre, artiste…"
          autocomplete="off" autocorrect="off"
          value="${esc(s.searchQuery)}"
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
        ${done ? `Valider mes musiques ✓` : `Ajoute encore ${needed - count} musique${needed - count > 1 ? 's' : ''}`}
      </button>
    </div>
  `;
}

function renderSearchResults() {
  if (s.isSearching) {
    return `<div class="search-hint"><div class="loading-dots"><span></span><span></span><span></span></div></div>`;
  }
  if (s.searchResults.length > 0) {
    return s.searchResults.map((song, i) => {
      const added   = s.myList.some(x => x.id === song.id);
      const playing = s.previewingId === song.id;
      return `
        <div class="song-item">
          <img class="song-art" src="${esc(song.artwork)}" alt="" loading="lazy"
            onerror="this.src='${BLANK_IMG}'" />
          <div class="song-info">
            <div class="song-title">${esc(song.title)}</div>
            <div class="song-artist">${esc(song.artist)}</div>
          </div>
          ${song.preview
            ? `<button class="icon-btn is-play" onclick="togglePreview(${i})">${playing ? '⏸' : '▶'}</button>`
            : ''}
          <button class="icon-btn ${added ? 'is-remove' : 'is-add'}"
            onclick="toggleSong(${i})">${added ? '−' : '+'}</button>
        </div>
      `;
    }).join('');
  }
  if (s.searchQuery) return `<div class="search-hint">Aucun résultat pour « ${esc(s.searchQuery)} »</div>`;
  return `<div class="search-hint">Tape le titre ou l'artiste 🔍</div>`;
}

function renderMyList() {
  return s.myList.map((song, i) => `
    <div class="song-item">
      <img class="song-art" src="${esc(song.artwork)}" alt="" loading="lazy"
        onerror="this.src='${BLANK_IMG}'" />
      <div class="song-info">
        <div class="song-title">${esc(song.title)}</div>
        <div class="song-artist">${esc(song.artist)}</div>
      </div>
      <button class="icon-btn is-remove" onclick="removeFromList(${i})">✕</button>
    </div>
  `).join('');
}

function onSearch(value) {
  s.searchQuery = value.trim();
  clearTimeout(s.searchDebounce);
  if (s.searchQuery.length < 2) {
    s.searchResults = [];
    s.isSearching = false;
    refreshSearchUI();
    return;
  }
  s.isSearching = true;
  refreshSearchUI();
  s.searchDebounce = setTimeout(async () => {
    try { s.searchResults = await searchItunes(s.searchQuery); }
    catch (_) { s.searchResults = []; }
    s.isSearching = false;
    refreshSearchUI();
  }, 500);
}

function refreshSearchUI() {
  const el = document.getElementById('search-results');
  if (el) el.innerHTML = renderSearchResults();
}

function togglePreview(i) {
  const song = s.searchResults[i];
  if (!song?.preview) return;
  if (s.previewingId === song.id) {
    stopAudio();
    s.previewingId = null;
  } else {
    stopAudio();
    s.audio = new Audio(song.preview);
    s.audio.volume = 0.8;
    s.previewingId = song.id;
    s.audio.play().catch(() => {});
    s.audio.addEventListener('ended', () => { s.previewingId = null; refreshSearchUI(); });
  }
  refreshSearchUI();
}

function toggleSong(i) {
  const song = s.searchResults[i];
  if (!song) return;
  const idx = s.myList.findIndex(x => x.id === song.id);
  if (idx >= 0) {
    s.myList.splice(idx, 1);
  } else if (s.myList.length < (s.room?.config.songsPerPlayer ?? 4)) {
    s.myList.push(song);
  }
  render();
  setTimeout(() => {
    const inp = document.getElementById('search-input');
    if (inp) { inp.value = s.searchQuery; inp.focus(); }
  }, 0);
}

function removeFromList(i) {
  s.myList.splice(i, 1);
  render();
  setTimeout(() => {
    const inp = document.getElementById('search-input');
    if (inp) inp.value = s.searchQuery;
  }, 0);
}

function submitSongs() {
  const needed = s.room?.config.songsPerPlayer ?? 4;
  if (s.myList.length < needed) return;
  s.socket.emit('submitSongs', { code: s.room.code, songs: s.myList }, res => {
    if (!res || !res.ok) { showError(res?.error ?? 'Erreur envoi'); return; }
    if (s.phase === 'submitting') {
      s.phase = 'waiting';
      render();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WAITING (submitted, waiting for others)
// ─────────────────────────────────────────────────────────────────────────────
function renderWaiting() {
  const players = s.room?.players ?? [];
  const readyCount  = players.filter(p => p.ready).length;
  const totalCount  = players.length;

  const rows = players.map(p => `
    <div class="player-entry">
      <span>${esc(p.name)}</span>
      <div class="ready-dot ${p.ready ? 'yes' : 'no'}" title="${p.ready ? 'Prêt' : 'En cours…'}"></div>
    </div>
  `).join('');

  return `
    <div class="screen">
      <div class="center-screen">
        <div class="waiting-anim">🎵</div>
        <div>
          <h2 style="font-size:1.5rem;font-weight:800">Musiques envoyées !</h2>
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

// ─────────────────────────────────────────────────────────────────────────────
// READY (all submitted, host launches)
// ─────────────────────────────────────────────────────────────────────────────
function renderReady() {
  const players  = s.room?.players ?? [];
  const total    = players.length * (s.room?.config.songsPerPlayer ?? 4);
  const isHost   = s.me.isHost;

  const rows = players.map(p => `
    <div class="player-entry">
      <span>${esc(p.name)}</span>
      <span class="badge badge-green">✓ Prêt</span>
    </div>
  `).join('');

  return `
    <div class="screen">
      <div class="center-screen">
        <div style="font-size:3.5rem">🎉</div>
        <div>
          <h1 class="title">Tout le monde est prêt !</h1>
          <p class="subtitle" style="margin-top:0.4rem">${total} musiques à deviner</p>
        </div>
        <div class="card" style="width:100%;max-width:300px;text-align:left">${rows}</div>
        ${isHost
          ? `<button class="btn btn-primary btn-lg" style="max-width:300px" onclick="launchGame()">
               Lancer la partie 🚀
             </button>`
          : `<p class="subtitle">⏳ L'hôte va lancer la partie…</p>`
        }
      </div>
    </div>
  `;
}

function launchGame() {
  if (!s.me.isHost || !s.room) return;
  s.socket.emit('launchGame', { code: s.room.code });
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYING
// ─────────────────────────────────────────────────────────────────────────────
function renderPlaying() {
  if (!s.currentSong) return '';
  const { song, index, total } = s.currentSong;
  const isHost = s.me.isHost;

  return `
    <div class="screen">
      <p class="progress-text">Musique ${index + 1} / ${total}</p>

      <img class="playing-art" src="${esc(song.artwork)}" alt="${esc(song.title)}"
        onerror="this.src='${BLANK_IMG}'" />

      <div>
        <div class="playing-title">${esc(song.title)}</div>
        <div class="playing-artist">${esc(song.artist)}</div>
      </div>

      <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem">
        <div class="timer-wrapper">
          <svg class="timer-svg" viewBox="0 0 100 100">
            <circle class="timer-track" cx="50" cy="50" r="45" />
            <circle class="timer-fill" cx="50" cy="50" r="45" id="timer-circle"
              style="stroke-dasharray:${CIRC};stroke-dashoffset:0" />
          </svg>
          <div class="timer-number" id="timer-time">${s.room?.config.timerDuration ?? 20}</div>
        </div>
        <button class="btn btn-secondary" id="play-btn" onclick="togglePlayPause()"
          style="min-width:160px">▶ Lancer</button>
      </div>

      <div class="spacer"></div>
      ${isHost
        ? `<button class="btn btn-primary btn-lg" id="reveal-btn" onclick="revealSong()">
             Révéler qui a ajouté ça 🎯
           </button>`
        : `<div class="info-box" style="text-align:center">👆 Pointez du doigt la personne que vous pensez !<br>L'hôte révèle quand tout le monde est prêt.</div>`
      }
    </div>
  `;
}

function togglePlayPause() {
  if (!s.currentSong) return;
  const { song } = s.currentSong;
  if (!s.audio) s.audio = new Audio();

  if (s.audio.paused) {
    if (!s.timerStarted && song.preview) s.audio.src = song.preview;
    if (song.preview) s.audio.play().catch(() => {});
    if (!s.timerStarted) { startTimer(); s.timerStarted = true; }
    const btn = document.getElementById('play-btn');
    if (btn) btn.textContent = '⏸ Pause';
  } else {
    s.audio.pause();
    const btn = document.getElementById('play-btn');
    if (btn) btn.textContent = '▶ Reprendre';
  }
}

function startTimer() {
  const duration = s.room?.config.timerDuration ?? 20;
  s.timerRemaining = duration;
  updateTimerDisplay(duration);
  s.timerInterval = setInterval(() => {
    s.timerRemaining = Math.max(0, s.timerRemaining - 1);
    updateTimerDisplay(duration);
    if (s.timerRemaining === 0) {
      clearInterval(s.timerInterval); s.timerInterval = null;
      const circle = document.getElementById('timer-circle');
      if (circle) circle.classList.add('urgent');
      const btn = document.getElementById('reveal-btn');
      if (btn) btn.classList.add('btn-pulse');
    }
  }, 1000);
}

function updateTimerDisplay(duration) {
  const dur    = duration ?? (s.room?.config.timerDuration ?? 20);
  const timeEl = document.getElementById('timer-time');
  const circEl = document.getElementById('timer-circle');
  if (timeEl) timeEl.textContent = s.timerRemaining > 0 ? s.timerRemaining : '🎯';
  if (circEl) circEl.style.strokeDashoffset = CIRC * (1 - s.timerRemaining / dur);
}

function revealSong() {
  if (!s.me.isHost || !s.room) return;
  if (s.audio) s.audio.pause();
  clearTimer();
  s.socket.emit('revealSong', { code: s.room.code });
}

// ─────────────────────────────────────────────────────────────────────────────
// REVEAL
// ─────────────────────────────────────────────────────────────────────────────
function renderReveal() {
  if (!s.revealData || !s.currentSong) return '';
  const { playerName, song } = s.revealData;
  const { index, total }     = s.currentSong;
  const isLast = index >= total - 1;

  return `
    <div class="screen">
      <p class="progress-text">Musique ${index + 1} / ${total}</p>

      <div class="card row" style="gap:1rem">
        <img style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0"
          src="${esc(song.artwork)}" alt=""
          onerror="this.src='${BLANK_IMG}'" />
        <div>
          <div style="font-weight:700;font-size:1rem">${esc(song.title)}</div>
          <div style="color:var(--text-muted);font-size:0.82rem">${esc(song.artist)}</div>
        </div>
      </div>

      <div class="reveal-card">
        <div class="reveal-label">Cette musique a été ajoutée par</div>
        <div class="reveal-name">${esc(playerName)}</div>
        <div style="font-size:2.2rem;margin-top:0.6rem">🎉</div>
      </div>

      <div class="spacer"></div>
      ${s.me.isHost
        ? `<button class="btn btn-primary btn-lg" onclick="nextSong()">
             ${isLast ? 'Voir le récap 🏁' : 'Musique suivante →'}
           </button>`
        : `<div class="info-box">⏳ L'hôte passe à la suite…</div>`
      }
    </div>
  `;
}

function nextSong() {
  if (!s.me.isHost || !s.room) return;
  s.socket.emit('nextSong', { code: s.room.code });
}

// ─────────────────────────────────────────────────────────────────────────────
// FINISHED
// ─────────────────────────────────────────────────────────────────────────────
function renderFinished() {
  const items = s.recap.map(({ song, playerName }) => `
    <div class="result-item">
      <img style="width:42px;height:42px;border-radius:6px;object-fit:cover;flex-shrink:0"
        src="${esc(song.artwork)}" alt=""
        onerror="this.src='${BLANK_IMG}'" />
      <div style="flex:1;min-width:0">
        <div style="font-size:0.88rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${esc(song.title)}</div>
        <div style="font-size:0.76rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${esc(song.artist)}</div>
      </div>
      <span class="player-tag">${esc(playerName)}</span>
    </div>
  `).join('');

  return `
    <div class="screen">
      <div class="logo">🏁</div>
      <h1 class="title">Fin de partie !</h1>
      <p class="subtitle">Toutes les musiques ont été jouées</p>
      <div class="card">
        <span class="section-label">Récapitulatif</span>
        <div class="scroll-list">${items}</div>
      </div>
      <div class="spacer"></div>
      ${s.me.isHost
        ? `<button class="btn btn-primary btn-lg" onclick="restartGame()">Rejouer 🔄</button>`
        : `<div class="info-box">⏳ L'hôte peut lancer une nouvelle partie…</div>`
      }
    </div>
  `;
}

function restartGame() {
  if (!s.me.isHost || !s.room) return;
  s.socket.emit('restartGame', { code: s.room.code });
}

// ─────────────────────────────────────────────────────────────────────────────
// iTunes SEARCH
// ─────────────────────────────────────────────────────────────────────────────
async function searchItunes(query) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=8&country=fr`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const data = await res.json();
  return data.results.map(r => ({
    id:      r.trackId,
    title:   r.trackName   ?? 'Titre inconnu',
    artist:  r.artistName  ?? '',
    artwork: (r.artworkUrl100 ?? '').replace('100x100bb', '300x300bb').replace('100x100', '300x300'),
    preview: r.previewUrl  ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function stopAudio() {
  if (s.audio) { s.audio.pause(); s.audio.src = ''; s.audio = null; }
  s.previewingId = null;
}
function clearTimer() {
  if (s.timerInterval) { clearInterval(s.timerInterval); s.timerInterval = null; }
}
function showError(msg) {
  s.errorMsg = msg;
  render();
}
function sanitizeLocal(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 20);
}
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
