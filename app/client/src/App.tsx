import { useEffect } from "react";
import "./App.css";
import { socket } from "./types/socket";

function App() {
  useEffect(() => {
    socket.emit("join_room", "test-room");
  }, []);
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
      <h1 className="text-5xl font-bold">
        Guess The Song
      </h1>
    </div>
  );
}

export default App;
