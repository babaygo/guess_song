import { useState } from "react";
import { LeaveButton } from "../components/LeaveButton";
import type { Room } from "../types/game";

type LobbyProps = {
  copyRoomCode: () => void;
  isHost: boolean;
  kickPlayer: (name: string) => void;
  leaveGame: () => void;
  name: string;
  room: Room;
  shareInvite: () => Promise<"shared" | "copied" | "error">;
  startSubmission: () => void;
  updateConfig: (songsPerPlayer: number) => void;
};

export function Lobby({ copyRoomCode, isHost, kickPlayer, leaveGame, name, room, shareInvite, startSubmission, updateConfig }: LobbyProps) {
  const [shareNote, setShareNote] = useState("");

  const onShare = async () => {
    const result = await shareInvite();
    if (result === "shared") return;
    setShareNote(result === "copied" ? "Lien copié !" : "Copie impossible — partage le code.");
    window.setTimeout(() => setShareNote(""), 2500);
  };

  return (
    <main className="app-shell">
      <section className="screen">
        <div className="col-center">
          <h2 className="ui-heading">Salle de jeu</h2>
          <p className="ui-meta">Partage le lien ou le code</p>
          <div className="room-code-row">
            <div className="room-code">{room.code}</div>
            <button aria-label="Copier le code" className="icon-btn is-play" onClick={copyRoomCode} title="Copier le code" type="button">
              <span className="material-symbols-outlined">content_copy</span>
            </button>
          </div>
          <button className="btn btn-secondary btn-share" onClick={onShare} type="button">
            <span className="material-symbols-outlined">share</span>
            Partager l'invitation
          </button>
          {shareNote ? <p className="ui-meta share-note">{shareNote}</p> : null}
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
              ) : (
                <div className="ready-dot no" />
              )}
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
