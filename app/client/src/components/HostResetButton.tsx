type HostResetButtonProps = {
  isHost: boolean;
  restartGame: () => void;
};

export function HostResetButton({ isHost, restartGame }: HostResetButtonProps) {
  if (!isHost) return null;

  const onClick = () => {
    const ok = window.confirm(
      "Revenir au salon ? La partie en cours sera réinitialisée pour tout le monde.",
    );
    if (ok) restartGame();
  };

  return (
    <button className="btn btn-ghost host-reset" onClick={onClick} type="button">
      <span className="material-symbols-outlined">restart_alt</span>
      Retour au salon
    </button>
  );
}
