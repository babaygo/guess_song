import { LeaveButton } from "../components/LeaveButton";
import type { LeaderboardItem } from "../types/game";

type FinishedProps = {
  isHost: boolean;
  leaderboard: LeaderboardItem[];
  leaveGame: () => void;
  name: string;
  restartGame: () => void;
};

export function Finished({ isHost, leaderboard, leaveGame, name, restartGame }: FinishedProps) {
  return (
    <main className="app-shell">
      <section className="screen">
        <LeaveButton onLeave={leaveGame} />
        <h1 className="title">Fin de partie !</h1>
        <p className="subtitle">Classement final</p>
        <div className="card">
          <span className="section-label">Scores</span>
          <div className="scroll-list">
            {leaderboard.map((item, index) => (
              <div className={`leaderboard-item ${item.name === name ? "me" : ""}`} key={item.name}>
                <div className="rank">{index + 1}</div>
                <div className="player-name">
                  {item.name}
                  {item.name === name ? " (toi)" : ""}
                </div>
                <div className="score">
                  {item.score} pt{item.score > 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="spacer" />
        {isHost ? (
          <button className="btn btn-primary btn-lg" onClick={restartGame} type="button">
            <span>Rejouer</span>
            <span className="material-symbols-outlined">refresh</span>
          </button>
        ) : (
          <div className="info-box">L'hôte peut lancer une nouvelle partie...</div>
        )}
      </section>
    </main>
  );
}
