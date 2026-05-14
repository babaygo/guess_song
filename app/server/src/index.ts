import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  socket.on("join_room", (roomId: string) => {
    socket.join(roomId);

    console.log(`${socket.id} joined ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("server listening on 3000");
});
