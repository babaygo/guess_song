import { Link } from "react-router-dom";
import { LegalLayout } from "../components/LegalLayout";

export function CGU() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" updated="28 juin 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales d'utilisation (CGU) encadrent l'accès et
        l'usage du jeu « Guess the Song » (le « Service »). En utilisant le Service,
        tu acceptes ces CGU.
      </p>

      <h2>2. Accès au Service</h2>
      <p>
        Le Service est accessible gratuitement. Aucune inscription n'est requise :
        tu choisis un pseudo pour rejoindre ou créer une partie. Tu es responsable de
        ton matériel et de ta connexion.
      </p>

      <h2>3. Âge minimum</h2>
      <p>
        Le Service est destiné aux personnes âgées d'au moins 15 ans. Les mineurs de
        moins de 15 ans doivent obtenir l'accord d'un titulaire de l'autorité
        parentale.
      </p>

      <h2>4. Comportement des utilisateurs</h2>
      <p>Tu t'engages à ne pas :</p>
      <ul>
        <li>
          utiliser un pseudo injurieux, diffamatoire, haineux ou portant atteinte aux
          droits de tiers ;
        </li>
        <li>
          perturber le fonctionnement du Service (triche, automatisation, surcharge) ;
        </li>
        <li>soumettre des contenus illicites.</li>
      </ul>
      <p>
        L'éditeur peut suspendre l'accès d'un joueur ou fermer une partie en cas de
        manquement.
      </p>

      <h2>5. Musique et propriété intellectuelle</h2>
      <p>
        Les extraits musicaux sont diffusés via des services de streaming tiers et
        restent la propriété de leurs ayants droit. Le Service ne confère aucun droit
        sur ces contenus.
      </p>

      <h2>6. Données personnelles</h2>
      <p>
        Le traitement de tes données est décrit dans notre{" "}
        <Link to="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        Le Service est fourni « en l'état », sans garantie de disponibilité continue.
        L'éditeur ne saurait être tenu responsable des interruptions, pertes de données
        de partie (les salons sont temporaires) ou usages non conformes.
      </p>

      <h2>8. Modification des CGU</h2>
      <p>
        L'éditeur peut modifier les présentes CGU. La version applicable est celle en
        ligne au moment de ton utilisation.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Les présentes CGU sont régies par le droit français. En cas de litige, et à
        défaut de résolution amiable, les tribunaux français sont compétents.
      </p>
    </LegalLayout>
  );
}
