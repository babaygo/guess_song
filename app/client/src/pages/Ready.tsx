import { LeaveButton } from "../components/LeaveButton";
import type { Room } from "../types/game";

type ReadyProps = {
  isHost: boolean;
  launchGame: () => void;
  leaveGame: () => void;
  neededSongs: number;
  room: Room;
};

export function Ready({ isHost, launchGame, leaveGame, neededSongs, room }: ReadyProps) {
  const total = room.players.length * neededSongs;

  return (
    <main className="app-shell">
      <section className="screen">
        <LeaveButton onLeave={leaveGame} />
        <div className="center-screen">
          <div className="ui-kicker">Prêts</div>
          <div>
            <h1 className="title">Tout le monde est prêt !</h1>
            <p className="subtitle">{total} musiques à deviner</p>
          </div>
          <div className="card narrow-card">
            {room.players.map((player) => (
              <div className="player-entry" key={player.name}>
                <span>{player.name}</span>
                <span className="badge badge-green">Prêt</span>
              </div>
            ))}
          </div>
          {isHost ? (
            <button className="btn btn-primary btn-lg narrow-card" onClick={launchGame} type="button">
              Lancer la partie
            </button>
          ) : (
            <p className="subtitle">L'hôte va lancer la partie...</p>
          )}
        </div>
      </section>
    </main>
  );
}
