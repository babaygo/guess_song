type ErrorScreenProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function ErrorScreen({ message, actionLabel, onAction }: ErrorScreenProps) {
  return (
    <main className="app-shell">
      <section className="screen error-screen">
        <span className="material-symbols-outlined error-icon">sentiment_dissatisfied</span>
        <h1 className="ui-kicker">Oups</h1>
        <p className="muted">{message}</p>
        <button className="btn btn-primary btn-lg" onClick={onAction} type="button">
          {actionLabel}
        </button>
      </section>
    </main>
  );
}
