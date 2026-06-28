import { Link } from "react-router-dom";
import { openConsent } from "../utils/consent";

export function Footer() {
  return (
    <footer className="site-footer">
      <nav className="footer-links">
        <Link to="/mentions-legales">Mentions légales</Link>
        <Link to="/cgu">CGU</Link>
        <Link to="/confidentialite">Confidentialité</Link>
        <button className="footer-link-btn" onClick={openConsent} type="button">
          Cookies
        </button>
      </nav>
      <p className="footer-copy">© 2026 Guess the Song</p>
    </footer>
  );
}
