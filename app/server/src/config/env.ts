export const env = {
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  MAX_ACTIVE_ROOMS: Number(process.env.MAX_ACTIVE_ROOMS) || 5000,
  MAX_PLAYERS_PER_ROOM: Number(process.env.MAX_PLAYERS_PER_ROOM) || 8,
  PORT: Number(process.env.PORT) || 3000,
  // Number of trusted reverse-proxy hops in front of the app (Render = 1).
  // Drives Express `trust proxy` and per-client IP resolution for rate limits.
  TRUST_PROXY: Number(process.env.TRUST_PROXY ?? 1),
};
