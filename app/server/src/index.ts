import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { env } from "./config/env.js";
import { searchHandler } from "./deezer/deezer.js";
import { rateLimit } from "./utils/rateLimit.js";
import { registerSocketHandlers } from "./socket.js";

const app = express();

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
