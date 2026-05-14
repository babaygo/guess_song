import { store } from '../state/store.js';
import { audioService } from '../services/audio.js';
import { GAME_PHASES } from '../../shared/constants.js';
import { renderHome } from './Home.js';
import { renderLobby } from './Lobby.js';
import { renderSubmitting } from './Submitting.js';
import { renderWaiting } from './Waiting.js';
import { renderReady } from './Ready.js';
import { renderPlaying } from './Playing.js';
import { renderReveal } from './Reveal.js';
import { renderFinished } from './Finished.js';

// Dispatcher de rendu principal
export function renderApp() {
  const state = store.getState();
  const app = document.getElementById('app');

  if (!app) return;

  // Stop audio if not in playing phase
  if (state.phase !== GAME_PHASES.PLAYING) {
    audioService.stop();
  }

  const renderMap = {
    [GAME_PHASES.HOME]: renderHome,
    [GAME_PHASES.LOBBY]: renderLobby,
    [GAME_PHASES.SUBMITTING]: renderSubmitting,
    [GAME_PHASES.WAITING]: renderWaiting,
    [GAME_PHASES.READY]: renderReady,
    [GAME_PHASES.PLAYING]: renderPlaying,
    [GAME_PHASES.REVEAL]: renderReveal,
    [GAME_PHASES.FINISHED]: renderFinished,
  };

  app.innerHTML = (renderMap[state.phase] ?? renderHome)();
}