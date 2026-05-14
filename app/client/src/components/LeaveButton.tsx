type LeaveButtonProps = {
  onLeave: () => void;
  variant?: "icon" | "full";
};

export function LeaveButton({ onLeave, variant = "icon" }: LeaveButtonProps) {
  if (variant === "full") {
    return (
      <button className="btn btn-ghost leave-button" onClick={onLeave} type="button">
        <span className="material-symbols-outlined">logout</span>
        <span>Quitter la salle</span>
      </button>
    );
  }

  return (
    <button aria-label="Quitter la partie" className="logout-btn" onClick={onLeave} title="Quitter la partie" type="button">
      <span className="material-symbols-outlined">logout</span>
    </button>
  );
}
