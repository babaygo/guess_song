import { useEffect } from "react";
import "./App.css";
import { socket } from "./services/socket";

function App() {
  useEffect(() => {
    socket.emit("join_room", "test-room");
  }, []);
  return (
    <>
      <h1>Guess The Song</h1>
    </>
  );
}

export default App;
