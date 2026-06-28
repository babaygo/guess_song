import { BLANK_IMG } from "../constants/game";
import { HostResetButton } from "../components/HostResetButton";
import { LeaveButton } from "../components/LeaveButton";
import type { CurrentSong, RevealData } from "../types/game";

type RevealProps = {
  currentSong: CurrentSong;
  isHost: boolean;
  leaveGame: () => void;
  nextSong: () => void;
  restartGame: () => void;
  reveal: RevealData;
};

export function Reveal({ currentSong, isHost, leaveGame, nextSong, restartGame, reveal }: RevealProps) {
  const isLast = currentSong.index >= currentSong.total - 1;

  return (
    <main className="app-shell">
      <section className="screen">
        <LeaveButton onLeave={leaveGame} />
        <p className="progress-text">
          Musique {currentSong.index + 1} / {currentSong.total}
        </p>
        <div className="card row">
          <img
            alt=""
            className="mini-art"
            onError={(event) => {
              event.currentTarget.src = BLANK_IMG;
            }}
            src={reveal.song.artwork || BLANK_IMG}
          />
          <div>
            <div className="song-title visible-title">{reveal.song.title}</div>
            <div className="ui-meta">{reveal.song.artist}</div>
          </div>
        </div>
        <div className="reveal-card">
          <div className="reveal-label">Cette musique a été ajoutée par</div>
          <div className="reveal-name">{reveal.playerName}</div>
        </div>
        {reveal.results?.length ? (
          <div className="card">
            <span className="section-label">Résultats</span>
            <div className="scroll-list">
              {reveal.results.map((result) => (
                <div className={`result-row ${result.correct ? "correct" : "wrong"}`} key={result.playerName}>
                  <span>{result.playerName}</span>
                  <span>{result.correct ? "Bien joué !" : "Dommage !"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="spacer" />
        {isHost ? (
          <>
            <button className="btn btn-primary btn-lg" onClick={nextSong} type="button">
              <span>{isLast ? "Voir le récap" : "Musique suivante"}</span>
              <span className="material-symbols-outlined">{isLast ? "flag" : "arrow_forward"}</span>
            </button>
            <HostResetButton isHost={isHost} restartGame={restartGame} />
          </>
        ) : (
          <div className="info-box">L'hôte passe à la suite...</div>
        )}
      </section>
    </main>
  );
}
