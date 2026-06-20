import type { FormEvent } from "react";
import { sanitizeCode } from "../utils/sanitize";
import type { RecentRoom } from "../types/game";

type HomeProps = {
  createRoom: () => void;
  error: string;
  joinCode: string;
  joinRoom: (event?: FormEvent) => void;
  name: string;
  recentRooms: RecentRoom[];
  rejoinRoom: (code: string) => void;
  setJoinCode: (value: string) => void;
  setName: (value: string) => void;
};

const PHASE_LABELS: Record<RecentRoom["phase"], string> = {
  lobby: "Salon",
  submitting: "Choix des musiques",
  ready: "Prête à démarrer",
  playing: "Partie en cours",
  reveal: "Partie en cours",
  finished: "Terminée",
};

function playerCountLabel(count: number) {
  return `${count} joueur${count > 1 ? "s" : ""}`;
}

export function Home({
  createRoom,
  error,
  joinCode,
  joinRoom,
  name,
  recentRooms,
  rejoinRoom,
  setJoinCode,
  setName,
}: HomeProps) {
  return (
    <main className="app-shell">
      <form className="screen home-screen" onSubmit={joinRoom}>
        <h1 className="title">Guess the Song</h1>
        <p className="subtitle">
          Chacun ajoute ses musiques depuis son téléphone,
          <br />
          puis on devine qui a mis quoi !
        </p>
        {error ? <div className="error-msg">{error}</div> : null}

        {recentRooms.length > 0 ? (
          <div className="card recent-rooms">
            <span className="section-label">Reprendre une partie</span>
            <div className="recent-room-list">
              {recentRooms.map((entry) => (
                <button
                  className="recent-room"
                  key={entry.code}
                  onClick={() => rejoinRoom(entry.code)}
                  type="button"
                >
                  <span className="recent-room-main">
                    <span className="recent-room-code">{entry.code}</span>
                    {entry.name ? (
                      <span className="recent-room-name">en tant que {entry.name}</span>
                    ) : null}
                  </span>
                  <span className="recent-room-meta">
                    <span className="recent-room-phase">{PHASE_LABELS[entry.phase]}</span>
                    <span className="recent-room-count">
                      {playerCountLabel(entry.playerCount)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="card">
          <label className="section-label" htmlFor="input-name">
            Mon pseudo
          </label>
          <input
            className="input"
            id="input-name"
            maxLength={20}
            onChange={(event) => setName(event.target.value)}
            placeholder="ex: Anonyme"
            type="text"
            value={name}
          />
        </div>

        <button className="btn btn-primary btn-lg" onClick={createRoom} type="button">
          Créer une partie
        </button>

        <div className="or-row">
          <hr className="divider" />
          <span>ou</span>
          <hr className="divider" />
        </div>

        <div className="card form-card">
          <label className="section-label" htmlFor="input-code">
            Rejoindre avec un code
          </label>
          <input
            className="input code-input"
            id="input-code"
            maxLength={6}
            onChange={(event) => setJoinCode(sanitizeCode(event.target.value))}
            placeholder="ex: A3F29B"
            value={joinCode}
          />
          <button className="btn btn-primary" type="submit">
            Rejoindre une partie
          </button>
        </div>
      </form>
    </main>
  );
}
