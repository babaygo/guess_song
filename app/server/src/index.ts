import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { searchHandler } from "./deezer.js";
import { rateLimit } from "./rateLimit.js";
import { registerSocketHandlers } from "./socket.js";

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.get(
  "/api/search",
  rateLimit({ max: 240, windowMs: 60000 }),
  searchHandler,
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
  },
});

registerSocketHandlers(io);

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Guess the Song server listening on ${port}`);
});
