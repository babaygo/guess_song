import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { searchHandler } from "./deezer.js";
import { registerSocketHandlers } from "./socket.js";

const app = express();

app.use(cors());
app.get("/api/search", searchHandler);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  },
});

registerSocketHandlers(io);

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Guess the Song server listening on ${port}`);
});
