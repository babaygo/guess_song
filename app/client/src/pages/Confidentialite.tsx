import { useState } from "react";
import { LegalLayout } from "../components/LegalLayout";
import { clearLocalData } from "../utils/localData";
import { openConsent } from "../utils/consent";

export function Confidentialite() {
  const [cleared, setCleared] = useState(false);

  const handleClear = () => {
    clearLocalData();
    setCleared(true);
  };

  return (
    <LegalLayout title="Politique de confidentialité" updated="28 juin 2026">
      <h2>Responsable du traitement</h2>
      <p>
        Le responsable du traitement est l'éditeur du jeu (voir les mentions légales).
        Contact :{" "}
        <a href="mailto:email pro ">email pro </a>.
      </p>

      <h2>Données traitées</h2>
      <ul>
        <li>
          <strong>Pseudo</strong> que tu choisis pour jouer ;
        </li>
        <li>
          <strong>Jeton de session</strong> (identifiant aléatoire) et{" "}
          <strong>code de salon</strong>, stockés localement dans ton navigateur pour
          te reconnecter après un rafraîchissement ;
        </li>
        <li>
          <strong>Adresse IP</strong>, traitée temporairement côté serveur à des fins
          de sécurité et de limitation d'abus (anti-spam). Elle n'est pas conservée.
        </li>
      </ul>

      <h2>Finalités et bases légales</h2>
      <ul>
        <li>
          Faire fonctionner le jeu et permettre la reconnexion — exécution du service ;
        </li>
        <li>
          Sécurité et prévention des abus — intérêt légitime ;
        </li>
        <li>
          Mesure d'audience anonyme éventuelle — uniquement avec ton consentement.
        </li>
      </ul>

      <h2>Durées de conservation</h2>
      <ul>
        <li>
          Sessions locales : 24 heures, puis suppression automatique ;
        </li>
        <li>
          Salons de jeu : conservés en mémoire le temps de la partie, supprimés une
          fois la partie terminée ou abandonnée ;
        </li>
        <li>
          Données de limitation par IP : temporaires, le temps de la fenêtre anti-abus.
        </li>
      </ul>

      <h2>Destinataires</h2>
      <p>
        Les données ne sont pas vendues. Elles peuvent être traitées par notre
        hébergeur et, le cas échéant, par les services de streaming utilisés pour la
        lecture musicale et un futur prestataire de paiement, dans la limite de ces
        finalités.
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        Le jeu utilise un stockage local <strong>strictement nécessaire</strong> à son
        fonctionnement (reconnexion), qui ne requiert pas de consentement. Toute mesure
        d'audience ou intégration tierce non essentielle n'est activée qu'après ton
        accord.
      </p>
      <button className="btn btn-secondary" onClick={openConsent} type="button">
        Modifier mes choix cookies
      </button>

      <h2>Tes droits</h2>
      <p>
        Conformément au RGPD, tu disposes d'un droit d'accès, de rectification,
        d'effacement, d'opposition et à la portabilité. Pour les exercer, écris à{" "}
        <a href="mailto:email pro ">email pro </a>. Tu peux aussi
        introduire une réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" rel="noreferrer" target="_blank">
          cnil.fr
        </a>
        ).
      </p>

      <h2>Effacer mes données locales</h2>
      <p>
        Tu peux supprimer immédiatement les données stockées par le jeu dans ce
        navigateur (sessions, code de salon, choix de cookies).
      </p>
      <button className="btn btn-secondary" onClick={handleClear} type="button">
        Effacer mes données locales
      </button>
      {cleared ? (
        <p className="legal-note">Tes données locales ont été effacées.</p>
      ) : null}
    </LegalLayout>
  );
}
