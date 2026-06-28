import { HostResetButton } from "../components/HostResetButton";
import { LeaveButton } from "../components/LeaveButton";
import type { Room } from "../types/game";

type WaitingProps = {
  isHost: boolean;
  kickPlayer: (name: string) => void;
  leaveGame: () => void;
  name: string;
  restartGame: () => void;
  room: Room;
};

export function Waiting({ isHost, kickPlayer, leaveGame, name, restartGame, room }: WaitingProps) {
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
                <span>
                  {player.name}
                  {player.name === name ? <span className="muted"> (moi)</span> : null}
                </span>
                <span className="player-entry-side">
                  <div className={`ready-dot ${player.ready ? "yes" : "no"}`} />
                  {isHost && player.name !== name ? (
                    <button
                      aria-label={`Retirer ${player.name}`}
                      className="icon-btn is-remove"
                      onClick={() => kickPlayer(player.name)}
                      title={`Retirer ${player.name}`}
                      type="button"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          <HostResetButton isHost={isHost} restartGame={restartGame} />
        </div>
      </section>
    </main>
  );
}
