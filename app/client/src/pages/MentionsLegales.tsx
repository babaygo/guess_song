import { LegalLayout } from "../components/LegalLayout";

export function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales" updated="28 juin 2026">
      <h2>Éditeur</h2>
      <p>
        Le site et le jeu « Guess the Song » sont édités par{" "}
        <strong>[Nom / raison sociale à compléter]</strong>.
      </p>
      <ul>
        <li>Statut : [auto-entreprise / société à compléter]</li>
        <li>SIRET : [numéro à compléter une fois immatriculé]</li>
        <li>Adresse : [adresse à compléter]</li>
        <li>
          Contact : <a href="mailto:email pro ">email pro </a>
        </li>
      </ul>

      <h2>Directeur de la publication</h2>
      <p>[Nom du directeur de la publication à compléter].</p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <strong>Render Services, Inc.</strong>, 525 Brannan
        Street, Suite 300, San Francisco, CA 94107, États-Unis —{" "}
        <a href="https://render.com" rel="noreferrer" target="_blank">
          render.com
        </a>
        . (À vérifier et compléter selon ton hébergement réel.)
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le code, l'interface, les graphismes et les éléments de marque du jeu sont
        la propriété de l'éditeur, sauf mention contraire. Les extraits musicaux,
        pochettes et métadonnées proviennent de services tiers (plateformes de
        streaming) et restent la propriété de leurs ayants droit respectifs.
      </p>

      <h2>Signalement</h2>
      <p>
        Pour signaler un contenu illicite ou faire valoir un droit, écris à{" "}
        <a href="mailto:email pro ">email pro </a>.
      </p>
    </LegalLayout>
  );
}
