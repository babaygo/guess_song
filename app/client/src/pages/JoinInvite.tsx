import type { FormEvent } from "react";

type JoinInviteProps = {
  code: string;
  error: string;
  goHome: () => void;
  joinRoom: (event?: FormEvent) => void;
  name: string;
  setName: (value: string) => void;
};

export function JoinInvite({ code, error, goHome, joinRoom, name, setName }: JoinInviteProps) {
  return (
    <main className="app-shell">
      <form className="screen home-screen" onSubmit={joinRoom}>
        <button className="btn btn-ghost invite-back" onClick={goHome} type="button">
          <span className="material-symbols-outlined">arrow_back</span>
          Accueil
        </button>

        <h1 className="title">Rejoindre la partie</h1>
        <p className="subtitle">Tu as été invité·e à jouer à Guess the Song !</p>
        {error ? <div className="error-msg">{error}</div> : null}

        <div className="card">
          <span className="section-label">Code de la partie</span>
          <input
            aria-label="Code de la partie"
            className="input code-input"
            disabled
            readOnly
            value={code}
          />
        </div>

        <div className="card">
          <label className="section-label" htmlFor="invite-name">
            Mon pseudo
          </label>
          <input
            autoFocus
            className="input"
            id="invite-name"
            maxLength={20}
            onChange={(event) => setName(event.target.value)}
            placeholder="ex: Anonyme"
            type="text"
            value={name}
          />
        </div>

        <button className="btn btn-primary btn-lg" type="submit">
          Rejoindre la partie
        </button>
      </form>
    </main>
  );
}
