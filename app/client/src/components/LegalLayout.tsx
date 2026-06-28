import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type LegalLayoutProps = {
  title: string;
  updated?: string;
  children: ReactNode;
};

export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <main className="app-shell legal-shell">
      <div className="screen legal-screen">
        <Link className="invite-back legal-back" to="/">
          <span className="material-symbols-outlined">arrow_back</span>
          Retour à l'accueil
        </Link>
        <h1 className="title legal-title">{title}</h1>
        {updated ? (
          <p className="muted legal-updated">Dernière mise à jour : {updated}</p>
        ) : null}
        <div className="card legal-content">{children}</div>
      </div>
    </main>
  );
}
