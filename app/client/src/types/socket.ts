import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_CLIENT_SOCKET || "http://localhost:3000", {
  transports: ["websocket", "polling"],
});
