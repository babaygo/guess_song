import { useEffect, useSyncExternalStore } from 'react';
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

export function App() {
  const state = useSyncExternalStore(
    (notify) => store.subscribe(notify),
    () => store.getState(),
    () => store.getState(),
  );

  useEffect(() => {
    if (state.phase !== GAME_PHASES.PLAYING) {
      audioService.stop();
    }
  }, [state.phase]);

  const renderScreen = renderMap[state.phase] ?? renderHome;

  return <div dangerouslySetInnerHTML={{ __html: renderScreen() }} />;
}
