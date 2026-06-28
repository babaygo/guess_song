import { BLANK_IMG } from "../constants/game";
import { HostResetButton } from "../components/HostResetButton";
import { LeaveButton } from "../components/LeaveButton";
import type { CurrentSong, Player } from "../types/game";

type PlayingProps = {
  participants: Player[];
  currentSong: CurrentSong;
  guess: string | null;
  isHost: boolean;
  leaveGame: () => void;
  makeGuess: (playerName: string) => void;
  restartGame: () => void;
  revealSong: () => void;
  toggleHostPlayback: () => void;
};

export function Playing({ participants, currentSong, guess, isHost, leaveGame, makeGuess, restartGame, revealSong, toggleHostPlayback }: PlayingProps) {
  const activeParticipants = participants.filter((player) => player.id !== null);
  const guessedCount = activeParticipants.filter((player) => player.guess !== null).length;
  const everyoneGuessed = activeParticipants.length > 1 && guessedCount === activeParticipants.length;

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
            {participants.map((player) => (
              <button className={`player-entry guess-entry ${guess === player.name ? "selected" : ""}`} key={player.name} onClick={() => makeGuess(player.name)} type="button">
                <span>{player.name}</span>
                {guess === player.name ? <span className="material-symbols-outlined">check_circle</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="spacer" />
        {isHost ? (
          <>
            {!everyoneGuessed ? (
              <p className="ui-meta vote-hint">
                {guessedCount} / {activeParticipants.length} ont voté — tu peux révéler quand tu veux
              </p>
            ) : null}
            <button className="btn btn-primary btn-lg" onClick={revealSong} type="button">
              <span>Révéler qui a ajouté ça</span>
              <span className="material-symbols-outlined">visibility</span>
            </button>
            <HostResetButton isHost={isHost} restartGame={restartGame} />
          </>
        ) : null}
      </section>
    </main>
  );
}
