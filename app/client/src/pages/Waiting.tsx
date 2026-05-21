import { LeaveButton } from "../components/LeaveButton";
import type { Room } from "../types/game";

type WaitingProps = {
  leaveGame: () => void;
  room: Room;
};

export function Waiting({ leaveGame, room }: WaitingProps) {
  const readyCount = room.players.filter((player) => player.ready).length;

  return (
    <main className="app-shell">
      <section className="screen">
        <LeaveButton onLeave={leaveGame} />
        <div className="center-screen">
          <div className="waiting-anim">...</div>
          <div>
            <h2 className="ui-heading">Musiques envoyées !</h2>
            <p className="subtitle">En attente des autres joueurs...</p>
          </div>
          <div className="card narrow-card">
            <span className="section-label">
              Prêts {readyCount} / {room.players.length}
            </span>
            {room.players.map((player) => (
              <div className="player-entry" key={player.name}>
                <span>{player.name}</span>
                <div className={`ready-dot ${player.ready ? "yes" : "no"}`} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
