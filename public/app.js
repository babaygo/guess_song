'use strict';

// CONSTANTS 
const BLANK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231e1e35' width='1' height='1'/%3E%3C/svg%3E";

// STATE 
const s = {
  socket: null,
  me: { name: '', isHost: false },
  room: null,   // roomPublic from server
  phase: 'home', // home | lobby | submitting | waiting | ready | playing | reveal | finished
  currentSessionKey: null, // for localStorage per room

  // Submission
  myList: [],
  searchResults: [],
  searchQuery: '',
  searchDebounce: null,
  isSearching: false,
  searchError: null,
  previewingId: null,

  // Playing
  currentSong: null,  // { song, index, total }
  audio: null,
  guess: null,  // guessed player name

  // Reveal
  revealData: null,  // { playerName, song }

  // Finished
  leaderboard: [],

  errorMsg: '',
};

// BOOT
window.addEventListener('DOMContentLoaded', () => {
  s.socket = io();
  bindSocketEvents();
  hydrateLocalSession();
  render();
  attemptAutoReconnect();
});

// SOCKET EVENTS
function bindSocketEvents() {
  const { socket } = s;

  socket.on('roomUpdate', room => {
    s.room = room;
    // Track current host based on the latest server state.
    s.me.isHost = !!(s.room.hostId && s.socket?.id && s.room.hostId === s.socket.id);
    // Update UI if in playing phase (for guess updates)
    if (s.phase === 'playing') {
      const playerListEl = document.querySelector('#player-list');
      if (playerListEl) {
        const players = s.room?.players ?? [];
        playerListEl.innerHTML = `
          <div class="card">
            <span class="section-label">Qui a mis cette musique ?</span>
            <div class="scroll-list">
              ${players.map(p => `
                <div class="player-entry" data-player-name="${esc(p.name)}" style="cursor:pointer;background:${s.guess === p.name ? '#4a7c59' : 'transparent'};padding:0.5rem;border-radius:6px" onclick="makeGuess(this.dataset.playerName)"
                  title="${s.guess === p.name ? 'Sélectionné' : 'Cliquer pour deviner'}">
                  <span>${esc(p.name)}</span>
                  ${s.guess === p.name ? '<span style="color:#00ff00"><span class="material-symbols-outlined">check_circle</span></span>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      const revealBtn = document.getElementById('reveal-btn');
      if (revealBtn && s.me.isHost) {
        if (s.room?.players?.every(p => p.guess !== null) && s.room?.players?.length > 1) {
          revealBtn.disabled = false;
        } else {
          revealBtn.disabled = true;
        }
      }
    }
    refreshLobby();
  });

  socket.on('phaseChange', ({ phase }) => {
    s.phase = phase;
    if (phase === 'submitting') {
      s.myList = [];
      s.searchResults = [];
      s.searchQuery = '';
    }
    if (phase === 'playing') stopAudio();
    render();
  });

  socket.on('songUpdate', data => {
    s.currentSong = data;
    s.phase = 'playing';
    s.guess = null;
    stopAudio();
    render();
    playCurrentSongFromStart();
  });

  socket.on('reveal', data => {
    s.revealData = data;
    s.phase = 'reveal';
    render();
  });

  socket.on('revealResults', data => {
    s.revealData = { ...s.revealData, results: data.results };
    render();
  });

  socket.on('leaderboard', ({ leaderboard }) => {
    s.leaderboard = leaderboard;
    s.phase = 'finished';
    render();
  });

  socket.on('disconnect', () => {
    s.errorMsg = 'Connexion perdue. Rechargement…';
    render();
    setTimeout(() => location.reload(), 2500);
  });
}

// RENDER DISPATCHER 
function render() {
  stopAudio();
  const app = document.getElementById('app');
  const map = {
    home: renderHome,
    lobby: renderLobby,
    submitting: renderSubmitting,
    waiting: renderWaiting,
    ready: renderReady,
    playing: renderPlaying,
    reveal: renderReveal,
    finished: renderFinished,
  };
  app.innerHTML = (map[s.phase] ?? renderHome)();
}

// HOME — create or join
function renderHome() {
  return `
    <div class="screen" style="min-height: 0;">
      <h1 class="title">Guess the Song</h1>
      <p class="subtitle">Chacun ajoute ses musiques depuis son téléphone,<br>puis on devine qui a mis quoi !</p>

      ${s.errorMsg ? `<div class="error-msg">${esc(s.errorMsg)}</div>` : ''}

      <div class="card">
        <span class="section-label">Mon pseudo</span>
        <input class="input" id="input-name" type="text"
          placeholder="ex: John Doe" maxlength="20"
          value="${esc(s.me.name)}"
          oninput="s.me.name = this.value.trim()" />
      </div>

      <button class="btn btn-primary btn-lg" onclick="createRoom()">
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
        <button class="btn btn-primary" style="width:100%" onclick="joinRoom()">
          Rejoindre une partie
        </button>
      </div>
    </div>
  `;
}

function createRoom() {
  const name = sanitizeLocal(s.me.name);
  if (!name) { showError('Entre ton pseudo !'); return; }
  s.me.name = name;
  s.errorMsg = '';
  s.socket.emit('createRoom', { name, config: { songsPerPlayer: 4 } }, res => {
    if (!res.ok) { showError(res.error ?? 'Erreur création salle'); return; }
    s.me.isHost = true;
    s.room = res.room;
    s.phase = 'lobby';
    persistSession();
    render();
  });
}

function renderLogoutBtn() {
  return `
    <div class="logout-btn" onclick="leaveGame()" title="Quitter la partie">
      <span class="material-symbols-outlined">logout</span>
    </div>
  `;
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
    persistSession();
    render();
  });
}

// LOBBY
function renderLobby() {
  if (!s.room) return renderHome();
  const { code, players, config } = s.room;
  const isHost = s.me.isHost;

  const playerRows = players.map(p => {
    const isMe = p.name === s.me.name;
    return `
      <div class="player-entry">
        <span>${esc(p.name)}${isMe ? ' <span style="color:var(--text-muted);font-size:0.8rem">(moi)</span>' : ''}
          ${p.id === s.room.hostId ? '<span class="host-crown" title="Hôte"><span class="material-symbols-outlined">military_tech</span></span>' : ''}
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
          <div class="room-code">${esc(code)}</div>
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

function refreshLobby() {
  if (s.phase === 'lobby') render();
}

function updateConfig(key, value) {
  if (!s.me.isHost || !s.room) return;
  const config = { ...s.room.config, [key]: value };
  s.socket.emit('updateConfig', { code: s.room.code, config });
}

async function copyRoomCode() {
  const code = s.room?.code;
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
}

function startSubmission() {
  if (!s.me.isHost || !s.room) return;
  s.socket.emit('startSubmission', { code: s.room.code });
}

function leaveRoom() {
  if (!s.room) return;
  s.socket.emit('leaveRoom', { code: s.room.code });
  clearSession();
  s.room = null;
  s.phase = 'home';
  render();
}

// SUBMISSION
function renderSubmitting() {
  if (!s.room) return '';
  const needed = s.room.config.songsPerPlayer;
  const count = s.myList.length;
  const done = count >= needed;

  return `
    <div class="screen">
      <div class="row-between">
        <div>
          <h2 class="ui-heading">${esc(s.me.name)}</h2>
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
  if (s.isSearching) {
    return `<div class="search-hint"><div class="loading-dots"><span></span><span></span><span></span></div></div>`;
  }
  if (s.searchError) {
    return `<div class="search-hint" style="color:#ff6b6b">${esc(s.searchError)}</div>`;
  }
  if (s.searchResults.length > 0) {
    return s.searchResults.map((song, i) => {
      const added = s.myList.some(x => x.id === song.id);
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
          ? `<button class="icon-btn is-play" onclick="togglePreview(${i})" title="${playing ? 'Pause' : 'Lecture'}"><span class="material-symbols-outlined">${playing ? 'pause' : 'play_arrow'}</span></button>`
          : ''}
          <button class="icon-btn ${added ? 'is-remove' : 'is-add'}"
            onclick="toggleSong(${i})">${added ? '−' : '+'}</button>
        </div>
      `;
    }).join('');
  }
  if (s.searchQuery) return `<div class="search-hint">Aucun résultat pour « ${esc(s.searchQuery)} »</div>`;
  return `<div class="search-hint">Tape le titre ou l'artiste</div>`;
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
      <button class="icon-btn is-remove" onclick="removeFromList(${i})" title="Retirer"><span class="material-symbols-outlined">close</span></button>
    </div>
  `).join('');
}

function onSearch(value) {
  s.searchQuery = value.trim();
  clearTimeout(s.searchDebounce);
  if (s.searchQuery.length < 2) {
    s.searchResults = [];
    s.searchError = null;
    s.isSearching = false;
    refreshSearchUI();
    return;
  }
  s.isSearching = true;
  s.searchError = null;
  refreshSearchUI();
  s.searchDebounce = setTimeout(async () => {
    try { 
      s.searchResults = await search(s.searchQuery);
      s.searchError = null;
    }
    catch (_) { 
      s.searchResults = []; 
      s.searchError = 'Erreur réseau. Réessayez.';
    }
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
    s.audio.play().catch(() => { });
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

// WAITING (submitted, waiting for others)
function renderWaiting() {
  const players = s.room?.players ?? [];
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
      ${renderLogoutBtn()}
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

// READY (all submitted, host launches)
function renderReady() {
  const players = s.room?.players ?? [];
  const total = players.length * (s.room?.config.songsPerPlayer ?? 4);
  const isHost = s.me.isHost;

  const rows = players.map(p => `
    <div class="player-entry">
      <span>${esc(p.name)}</span>
      <span class="badge badge-green">Prêt</span>
    </div>
  `).join('');

  return `
    <div class="screen">
      ${renderLogoutBtn()}
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

function launchGame() {
  if (!s.me.isHost || !s.room) return;
  s.socket.emit('launchGame', { code: s.room.code });
}

// PLAYING
function renderPlaying() {
  if (!s.currentSong) return '';
  const { song, index, total } = s.currentSong;
  const isHost = s.me.isHost;
  const activePlayers = (s.room?.players ?? []).filter(p => p.id !== null);

  let playerList = `
    <div class="card">
      <span class="section-label">Qui a mis cette musique ?</span>
      <div class="scroll-list">
        ${activePlayers.map(p => `
          <div class="player-entry" data-player-name="${esc(p.name)}" style="cursor:pointer;background:${s.guess === p.name ? '#4a7c59' : 'transparent'};padding:0.5rem;border-radius:6px" onclick="makeGuess(this.dataset.playerName)"
                  title="${s.guess === p.name ? 'Sélectionné' : 'Cliquer pour deviner'}">
            <span>${esc(p.name)}</span>
                  ${s.guess === p.name ? '<span style="color:#00ff00;font-weight:bold">OK</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return `
    <div class="screen">
      ${renderLogoutBtn()}
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
      ? `<button class="btn btn-primary btn-lg" id="reveal-btn" onclick="revealSong()" ${(s.room?.players?.filter(p => p.id !== null).every(p => p.guess !== null) && s.room?.players?.filter(p => p.id !== null).length > 1) ? '' : 'disabled'
      }>
             <span>Révéler qui a ajouté ça</span>
             <span class="material-symbols-outlined">visibility</span>
           </button>`
      : ''
    }
    </div>
  `;
}

function togglePlayPause() {
  if (!s.currentSong || !s.me.isHost) return;
  const { song } = s.currentSong;
  if (!s.audio) s.audio = new Audio();

  if (s.audio.paused) {
    if (song.preview && s.audio.src !== song.preview) s.audio.src = song.preview;
    if (song.preview) s.audio.play().catch(() => { });
    setPlayButtonState('pause', 'Pause');
  } else {
    s.audio.pause();
    setPlayButtonState('play_arrow', 'Reprendre');
  }
}

function makeGuess(playerName) {
  if (!s.room) return;
  s.guess = playerName;
  s.socket.emit('submitGuess', { code: s.room.code, guess: playerName });
  const playerListEl = document.querySelector('#player-list');
  if (playerListEl) {
    const activePlayers = (s.room?.players ?? []).filter(p => p.id !== null);
    playerListEl.innerHTML = `
      <div class="card">
        <span class="section-label">Qui a mis cette musique ?</span>
        <div class="scroll-list">
          ${activePlayers.map(p => `
            <div class="player-entry" data-player-name="${esc(p.name)}" style="cursor:pointer;background:${s.guess === p.name ? '#4a7c59' : 'transparent'};padding:0.5rem;border-radius:6px" onclick="makeGuess(this.dataset.playerName)"
              title="${s.guess === p.name ? 'Sélectionné' : 'Cliquer pour deviner'}">
              <span>${esc(p.name)}</span>
              ${s.guess === p.name ? '<span style="color:#00ff00"><span class="material-symbols-outlined">check_circle</span></span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  const revealBtn = document.getElementById('reveal-btn');
  if (revealBtn && s.room?.players?.every(p => p.guess !== null) && s.room?.players?.length > 1) {
    revealBtn.disabled = false;
  }
}

function playCurrentSongFromStart() {
  if (!s.me.isHost) return;
  const preview = s.currentSong?.song?.preview;
  if (!preview) {
    setPlayButtonState('music_off', 'Aucun extrait');
    return;
  }
  s.audio = new Audio(preview);
  s.audio.volume = 0.8;
  s.audio.currentTime = 0;
  s.audio.addEventListener('ended', () => {
    setPlayButtonState('replay', 'Rejouer');
  });
  s.audio.play().catch(() => {
    setPlayButtonState('play_arrow', 'Lancer');
  });
}

function revealSong() {
  if (!s.me.isHost || !s.room) return;
  if (s.audio) s.audio.pause();
  s.socket.emit('revealSong', { code: s.room.code });
}

// REVEAL
function renderReveal() {
  if (!s.revealData || !s.currentSong) return '';
  const { playerName, song, results } = s.revealData;
  const { index, total } = s.currentSong;
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
      ${renderLogoutBtn()}
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
      ${s.me.isHost
      ? `<button class="btn btn-primary btn-lg" onclick="nextSong()">
             <span>${isLast ? 'Voir le récap' : 'Musique suivante'}</span>
             <span class="material-symbols-outlined">${isLast ? 'flag' : 'arrow_forward'}</span>
           </button>`
      : `<div class="info-box">L'hôte passe à la suite…</div>`
    }
    </div>
  `;
}

function nextSong() {
  if (!s.me.isHost || !s.room) return;
  s.socket.emit('nextSong', { code: s.room.code });
}

// FINISHED
function renderFinished() {
  const items = s.leaderboard.map(({ name, score }, index) => `
    <div class="leaderboard-item ${name === s.me.name ? 'me' : ''}">
      <div class="rank">${index + 1}</div>
      <div class="player-name">${esc(name)}${name === s.me.name ? ' (toi)' : ''}</div>
      <div class="score">${score} pt${score > 1 ? 's' : ''}</div>
    </div>
  `).join('');

  return `
    <div class="screen">
      ${renderLogoutBtn()}
      <h1 class="title">Fin de partie !</h1>
      <p class="subtitle">Classement final</p>
      <div class="card">
        <span class="section-label">Scores</span>
        <div class="scroll-list">${items}</div>
      </div>
      <div class="spacer"></div>
      ${s.me.isHost
      ? `<button class="btn btn-primary btn-lg" onclick="restartGame()"><span>Rejouer</span><span class="material-symbols-outlined">refresh</span></button>`
      : `<div class="info-box">L'hôte peut lancer une nouvelle partie…</div>`
    }
    </div>
  `;
}

function setPlayButtonState(iconName, label) {
  const btn = document.getElementById('play-btn');
  if (!btn) return;
  btn.innerHTML = `<span>${esc(label)}</span><span class="material-symbols-outlined">${iconName}</span>`;
}

function restartGame() {
  if (!s.me.isHost || !s.room) return;
  s.socket.emit('restartGame', { code: s.room.code });
}

function hydrateLocalSession() {
  try {
    // Find the most recent session key
    const keys = Object.keys(localStorage).filter(k => k.startsWith('guess-song-session-'));
    if (keys.length === 0) return;
    const key = keys
      .map(k => ({ k, ts: JSON.parse(localStorage.getItem(k) || '{}')?.ts ?? 0 }))
      .sort((a, b) => b.ts - a.ts)[0]?.k;
    if (!key) return;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.name) s.me.name = sanitizeLocal(data.name);
    s.currentSessionKey = key;
  } catch (_) { }
}

function persistSession() {
  if (!s.room?.code || !s.me.name) return;
  try {
    const key = 'guess-song-session-' + s.room.code;
    s.currentSessionKey = key;
    localStorage.setItem(key, JSON.stringify({
      code: s.room.code,
      name: s.me.name,
      ts: Date.now(),
    }));
  } catch (_) { }
}

function clearSession() {
  try {
    if (s.currentSessionKey) {
      localStorage.removeItem(s.currentSessionKey);
      s.currentSessionKey = null;
    }
  } catch (_) { }
}

function leaveGame() {
  if (s.room) {
    s.socket.emit('leaveRoom', { code: s.room.code });
  }
  s.phase = 'home';
  s.room = null;
  s.me.isHost = false;
  clearSession();
  render();
}

function attemptAutoReconnect() {
  try {
    if (!s.currentSessionKey) return;
    const raw = localStorage.getItem(s.currentSessionKey);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const code = String(saved?.code ?? '').toUpperCase();
    const name = sanitizeLocal(saved?.name ?? '');
    if (!code || !name) return;

    s.me.name = name;
    s.socket.emit('reconnectRoom', { code, name }, res => {
      if (!res?.ok) {
        clearSession();
        return;
      }

      s.me.isHost = !!res.isHost;
      s.room = res.room;
      s.phase = res.phase ?? res.room?.phase ?? 'lobby';

      if (res.currentSong) s.currentSong = res.currentSong;
      if (res.reveal) s.revealData = { ...res.reveal, results: res.revealResults ?? [] };
      if (res.recap) s.recap = res.recap;

      persistSession();
      render();

      if (s.phase === 'playing') playCurrentSongFromStart();
    });
  } catch (_) { }
}

// SEARCH
async function search(query) {
  const url = `/api/search?q=${encodeURIComponent(query)}&limit=8`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

// HELPERS
function stopAudio() {
  if (s.audio) { s.audio.pause(); s.audio.src = ''; s.audio = null; }
  s.previewingId = null;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    s,
    sanitizeLocal,
    esc,
    renderSearchResults,
    renderMyList,
    onSearch,
    toggleSong,
    removeFromList,
    persistSession,
    clearSession,
    hydrateLocalSession,
    attemptAutoReconnect,
    leaveGame,
    search,
  };
}
