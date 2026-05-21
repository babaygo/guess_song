import type { FormEvent } from "react";
import { sanitizeCode } from "../utils/sanitize";

type HomeProps = {
  createRoom: () => void;
  error: string;
  joinCode: string;
  joinRoom: (event?: FormEvent) => void;
  name: string;
  setJoinCode: (value: string) => void;
  setName: (value: string) => void;
};

export function Home({ createRoom, error, joinCode, joinRoom, name, setJoinCode, setName }: HomeProps) {
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

        <div className="card">
          <label className="section-label" htmlFor="input-name">
            Mon pseudo
          </label>
          <input
            className="input"
            id="input-name"
            maxLength={20}
            onChange={(event) => setName(event.target.value)}
            placeholder="ex: Simon"
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
