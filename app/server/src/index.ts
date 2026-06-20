import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { searchHandler } from "./deezer/deezer.js";
import { rateLimit } from "./utils/rateLimit.js";
import { registerSocketHandlers } from "./socket.js";

const app = express();

// Behind a reverse proxy (e.g. Render), the socket address is the proxy's, so
// req.ip must be resolved from X-Forwarded-For — otherwise every client shares
// one rate-limit bucket and a single abuser throttles everyone.
app.set("trust proxy", env.TRUST_PROXY);

// Security headers (nosniff, HSTS, frameguard, etc.). This is a JSON API
// consumed cross-origin by a separate client, so CSP — which protects rendered
// HTML — belongs on the client host, and resources must stay cross-origin
// readable for the configured client.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.get(
  "/api/search",
  rateLimit({ max: 240, windowMs: 60000 }),
  searchHandler,
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CLIENT_ORIGIN,
  },
});

registerSocketHandlers(io);

server.listen(env.PORT, () => {
  console.log(`Guess the Song server listening on ${env.PORT}`);
});
