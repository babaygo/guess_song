import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, setConsent } from "../utils/consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(() => getConsent() === null);

  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener("guess-song-consent-open", open);
    return () => window.removeEventListener("guess-song-consent-open", open);
  }, []);

  if (!visible) return null;

  const choose = (measurement: boolean) => {
    setConsent(measurement);
    setVisible(false);
  };

  return (
    <div className="cookie-banner" role="dialog" aria-label="Gestion des cookies">
      <p className="cookie-text">
        Ce jeu utilise un stockage local strictement nécessaire pour te reconnecter
        à ta partie. Avec ton accord, nous pourrons activer une mesure d'audience
        anonyme afin de l'améliorer.{" "}
        <Link className="cookie-link" to="/confidentialite">
          En savoir plus
        </Link>
      </p>
      <div className="cookie-actions">
        <button className="btn btn-secondary" onClick={() => choose(false)} type="button">
          Refuser
        </button>
        <button className="btn btn-primary" onClick={() => choose(true)} type="button">
          Accepter
        </button>
      </div>
    </div>
  );
}
