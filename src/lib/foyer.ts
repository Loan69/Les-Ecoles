
// --- Identité du foyer -----------------------------------------------------
//
// Tout ce qui nommait « Les Écoles » en dur (titre, description, logo, couleur)
// vit désormais dans `app_settings`, sous les clés `foyer_*`. Ces clés sont les
// seules lisibles en anonyme : l'écran de connexion et le manifeste de
// l'application web doivent les afficher AVANT toute connexion.
// Voir supabase/p2-identite-foyer.sql.

// Les clés réglables depuis l'application. Sert de liste blanche à /api/admin/identite :
// sans elle, un appel direct pourrait écrire n'importe quelle ligne d'app_settings.
export const CLES_IDENTITE = [
  'foyer_nom', 'foyer_nom_court', 'foyer_description',
  'foyer_logo_url', 'foyer_icone_url', 'foyer_fuseau', 'foyer_locale',
] as const;
export type CleIdentite = (typeof CLES_IDENTITE)[number];

// Teinte de la barre du navigateur sur Android et de l'écran de démarrage de
// l'application installée. **Constante, et non réglable** : elle ne pilote rien
// dans l'interface — boutons, titres et bandeaux sont des classes Tailwind écrites
// en dur. Un réglage aurait promis un thème qui n'existe pas. Le jour où l'interface
// passera à des variables CSS, cette constante redeviendra un réglage.
export const COULEUR_APPLI = "#004AAD";

export type IdentiteFoyer = {
  nom: string;
  nomCourt: string;
  description: string;
  logoUrl: string | null; // null = pas de logo, on affiche le nom en toutes lettres
  // Icône de l'écran d'accueil : carrée et OPAQUE. Distincte du logo — un logo
  // transparent s'affiche sur fond noir, un logo large devient illisible en carré.
  iconeUrl: string | null;
  fuseau: string;
  locale: string;
};

// Repli neutre : l'application reste lisible si la base ne répond pas, ou tant
// que la migration n'est pas passée. Aucun nom de foyer réel ici.
export const IDENTITE_DEFAUT: IdentiteFoyer = {
  nom: "Foyer",
  nomCourt: "Foyer",
  description: "Espace des résidentes et des invitées",
  logoUrl: null,
  iconeUrl: null,
  fuseau: "Europe/Paris",
  locale: "fr-FR",
};

/** Construit l'identité depuis des lignes `app_settings` (clé/valeur). */
export function identiteDepuisReglages(
  lignes: { key: string; value: string }[] | null | undefined
): IdentiteFoyer {
  const m = new Map((lignes ?? []).map((l) => [l.key, l.value]));
  const lire = (cle: string, defaut: string) => {
    const v = m.get(cle);
    return v != null && v.trim() !== "" ? v.trim() : defaut;
  };
  const logo = (m.get("foyer_logo_url") ?? "").trim();
  const icone = (m.get("foyer_icone_url") ?? "").trim();
  return {
    nom: lire("foyer_nom", IDENTITE_DEFAUT.nom),
    nomCourt: lire("foyer_nom_court", IDENTITE_DEFAUT.nomCourt),
    description: lire("foyer_description", IDENTITE_DEFAUT.description),
    logoUrl: logo === "" ? null : logo,
    iconeUrl: icone === "" ? null : icone,
    fuseau: lire("foyer_fuseau", IDENTITE_DEFAUT.fuseau),
    locale: lire("foyer_locale", IDENTITE_DEFAUT.locale),
  };
}

// `identiteFoyer()` — la lecture en base — vit dans src/lib/foyerServeur.ts.
// Ce fichier reste PUR : les libs de verrouillage y prennent IDENTITE_DEFAUT et sont
// utilisées dans des composants navigateur, qui ne peuvent pas embarquer next/headers.

// --- Listes proposées à l'écran -------------------------------------------
//
// Volontairement courtes : un champ libre laisse écrire « Europe/Pris », qui fait
// silencieusement échouer tous les calculs de verrouillage. Ajouter une entrée ici
// suffit à la proposer partout.

export const FUSEAUX = [
  { value: "Europe/Paris", label: "France métropolitaine (Paris)" },
  { value: "Europe/Brussels", label: "Belgique (Bruxelles)" },
  { value: "Europe/Luxembourg", label: "Luxembourg" },
  { value: "Europe/Zurich", label: "Suisse (Zurich)" },
  { value: "Europe/Madrid", label: "Espagne (Madrid)" },
  { value: "Europe/Lisbon", label: "Portugal (Lisbonne)" },
  { value: "Europe/Rome", label: "Italie (Rome)" },
  { value: "Europe/London", label: "Royaume-Uni (Londres)" },
  { value: "America/Toronto", label: "Québec / Ontario (Toronto)" },
  { value: "America/Guadeloupe", label: "Antilles (Guadeloupe, Martinique)" },
  { value: "Indian/Reunion", label: "La Réunion" },
  { value: "Africa/Abidjan", label: "Afrique de l'Ouest (Abidjan, Dakar)" },
  { value: "Africa/Casablanca", label: "Maroc (Casablanca)" },
] as const;

export const LOCALES = [
  { value: "fr-FR", label: "Français (France) — 24 août 2026" },
  { value: "fr-BE", label: "Français (Belgique)" },
  { value: "fr-CH", label: "Français (Suisse)" },
  { value: "fr-CA", label: "Français (Canada)" },
  { value: "en-GB", label: "Anglais (Royaume-Uni) — 24 August 2026" },
  { value: "es-ES", label: "Espagnol (Espagne)" },
  { value: "it-IT", label: "Italien (Italie)" },
  { value: "pt-PT", label: "Portugais (Portugal)" },
  { value: "de-DE", label: "Allemand (Allemagne)" },
] as const;
