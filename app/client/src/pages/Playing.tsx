import { BLANK_IMG } from "../constants/game";
import { LeaveButton } from "../components/LeaveButton";
import type { CurrentSong, Player } from "../types/game";

type PlayingProps = {
  activePlayers: Player[];
  currentSong: CurrentSong;
  guess: string | null;
  isHost: boolean;
  leaveGame: () => void;
  makeGuess: (playerName: string) => void;
  revealSong: () => void;
  toggleHostPlayback: () => void;
};

export function Playing({ activePlayers, currentSong, guess, isHost, leaveGame, makeGuess, revealSong, toggleHostPlayback }: PlayingProps) {
  const everyoneGuessed = activePlayers.length > 1 && activePlayers.every((player) => player.guess !== null);

  return (
    <main className="app-shell">
      <section className="screen">
        <LeaveButton onLeave={leaveGame} />
        <p className="progress-text">
          Musique {currentSong.index + 1} / {currentSong.total}
        </p>
        <img
          alt=""
          className="playing-art"
          onError={(event) => {
            event.currentTarget.src = BLANK_IMG;
          }}
          src={currentSong.song.artwork || BLANK_IMG}
        />
        <div>
          <div className="playing-title">{currentSong.song.title}</div>
          <div className="playing-artist">{currentSong.song.artist}</div>
        </div>

        {isHost ? (
          <button className="btn btn-secondary host-play-button" onClick={toggleHostPlayback} type="button">
            <span>Lecture / pause</span>
            <span className="material-symbols-outlined">pause</span>
          </button>
        ) : null}

        <div className="card">
          <span className="section-label">Qui a mis cette musique ?</span>
          <div className="scroll-list">
            {activePlayers.map((player) => (
              <button className={`player-entry guess-entry ${guess === player.name ? "selected" : ""}`} key={player.name} onClick={() => makeGuess(player.name)} type="button">
                <span>{player.name}</span>
                {guess === player.name ? <span className="material-symbols-outlined">check_circle</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="spacer" />
        {isHost ? (
          <button className="btn btn-primary btn-lg" disabled={!everyoneGuessed} onClick={revealSong} type="button">
            <span>Révéler qui a ajouté ça</span>
            <span className="material-symbols-outlined">visibility</span>
          </button>
        ) : null}
      </section>
    </main>
  );
}
