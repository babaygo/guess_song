// Constantes partagées entre client et serveur
export const GAME_PHASES = {
  HOME: 'home',
  LOBBY: 'lobby',
  SUBMITTING: 'submitting',
  WAITING: 'waiting',
  READY: 'ready',
  PLAYING: 'playing',
  REVEAL: 'reveal',
  FINISHED: 'finished',
};

export const BLANK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231e1e35' width='1' height='1'/%3E%3C/svg%3E";

export const ROOM_RECONNECT_GRACE_MS = 120000;