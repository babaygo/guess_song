import { LeaveButton } from "../components/LeaveButton";
import type { Room } from "../types/game";

type LobbyProps = {
  copyRoomCode: () => void;
  isHost: boolean;
  leaveGame: () => void;
  name: string;
  room: Room;
  startSubmission: () => void;
  updateConfig: (songsPerPlayer: number) => void;
};

export function Lobby({ copyRoomCode, isHost, leaveGame, name, room, startSubmission, updateConfig }: LobbyProps) {
  return (
    <main className="app-shell">
      <section className="screen">
        <div className="col-center">
          <h2 className="ui-heading">Salle de jeu</h2>
          <p className="ui-meta">Partage le code</p>
          <div className="room-code-row">
            <div className="room-code">{room.code}</div>
            <button aria-label="Copier le code" className="icon-btn is-play" onClick={copyRoomCode} title="Copier le code" type="button">
              <span className="material-symbols-outlined">content_copy</span>
            </button>
          </div>
        </div>

        <div className="card">
          <span className="section-label">Joueurs ({room.players.length})</span>
          {room.players.map((player) => (
            <div className="player-entry" key={player.name}>
              <span>
                {player.name}
                {player.name === name ? <span className="muted"> (moi)</span> : null}
                {player.id === room.hostId ? (
                  <span className="host-crown" title="Hôte">
                    <span className="material-symbols-outlined">military_tech</span>
                  </span>
                ) : null}
              </span>
              <div className="ready-dot no" />
            </div>
          ))}
        </div>

        <div className="card">
          <span className="section-label">Musiques par joueur {!isHost ? <span className="muted">(hôte seulement)</span> : null}</span>
          <div className="option-row">
            {[2, 3, 4, 5, 6].map((count) => (
              <button
                className={`option-btn ${room.config.songsPerPlayer === count ? "active" : ""}`}
                disabled={!isHost}
                key={count}
                onClick={() => updateConfig(count)}
                type="button"
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="spacer" />
        {isHost ? (
          <button className="btn btn-primary btn-lg" disabled={room.players.length < 2} onClick={startSubmission} type="button">
            {room.players.length < 2 ? "Attends un autre joueur..." : "Tout le monde est là ? C'est parti !"}
          </button>
        ) : (
          <div className="center-screen small-center">
            <div className="waiting-anim">...</div>
            <p className="subtitle">En attente que l'hôte lance la partie...</p>
          </div>
        )}
        <LeaveButton onLeave={leaveGame} variant="full" />
      </section>
    </main>
  );
}
