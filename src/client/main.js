import { store } from './state/store.js';
import { socketService } from './services/socket.js';
import { renderApp } from './components/App.js';
import { hydrateLocalSession, attemptAutoReconnect } from './utils/client-utils.js';

// Point d'entrée de l'application client
window.addEventListener('DOMContentLoaded', () => {
  // Hydrater la session locale
  hydrateLocalSession();

  // Initialiser la connexion socket
  socketService.connect();

  // Tenter la reconnexion automatique
  attemptAutoReconnect();

  // Initialiser le rendu
  renderApp();

  // S'abonner aux changements de state pour re-render
  store.subscribe((state) => {
    renderApp();
  });
});