import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.tsx';
import { socketService } from './services/socket.js';
import { hydrateLocalSession, attemptAutoReconnect } from './utils/client-utils.js';
import './styles.css';

hydrateLocalSession();
socketService.connect();
attemptAutoReconnect();

const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error('Root element #app introuvable');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
