import { formatDateKeyLocal, parseDateKeyLocal } from "./utilDate";
import { IDENTITE_DEFAUT } from "./foyer";

// Verrouillage de la présence au foyer (R-LOCK-09/10/11).
//
// La présence au foyer répond à « qui dort ici cette nuit ». Une fois l'heure limite
// passée, l'intendance compte les lits : la réponse du jour ne doit plus bouger.
//
// Le modèle étant celui des SÉJOURS d'absence (R-FOYER-02) et non plus une déclaration
// jour par jour, on ne verrouille pas « un séjour » mais **les jours dont le statut
// changerait**. Déplacer la date de retour d'un séjour passé de mercredi à jeudi ne
// touche que jeudi : c'est ce jour-là, et lui seul, qui doit être libre.
//
// Le verrou des repas est indépendant (R-LOCK-11) : heures et règles distinctes.

export const HEURE_VERROU_FOYER_DEFAUT = "23:00";

export interface Sejour {
  date_debut: string; // "YYYY-MM-DD"
  date_fin: string;
  repas_non?: boolean;
}

/** Toutes les clés de jour couvertes par un séjour, bornes incluses. */
export function joursDuSejour(debut: string, fin: string): string[] {
  const jours: string[] = [];
  const curseur = parseDateKeyLocal(debut);
  const derniere = parseDateKeyLocal(fin);
  while (curseur <= derniere) {
    jours.push(formatDateKeyLocal(curseur));
    curseur.setDate(curseur.getDate() + 1);
  }
  return jours;
}

/**
 * Un jour est-il verrouillé ?
 *   - jour passé              → oui (R-LOCK-10)
 *   - jour même après l'heure → oui (R-LOCK-09)
 *   - jour futur              → non
 */
export function estJourVerrouille(
  jour: string,
  heureLimite: string = HEURE_VERROU_FOYER_DEFAUT,
  maintenant: Date = new Date(),
  fuseau: string = IDENTITE_DEFAUT.fuseau
): boolean {
  // Même approche que le verrou des repas : on raisonne à l'heure du FOYER (réglage
  // `foyer_fuseau`), pas à celle du téléphone, sans quoi une résidente en voyage
  // aurait un verrou décalé.
  const local = new Date(maintenant.toLocaleString("en-US", { timeZone: fuseau }));
  const aujourdhui = formatDateKeyLocal(local);

  if (jour < aujourdhui) return true;
  if (jour > aujourdhui) return false;

  const [h, m] = (heureLimite || HEURE_VERROU_FOYER_DEFAUT).split(":").map(Number);
  const heure = Number.isFinite(h) ? h : 23;
  const minute = Number.isFinite(m) ? m : 0;
  return local.getHours() > heure || (local.getHours() === heure && local.getMinutes() >= minute);
}

/**
 * Jours **verrouillés dont le statut changerait** si l'on passait de `avant` à `apres`.
 * `avant` vaut null pour une création, `apres` null pour une suppression.
 *
 * On compare les deux ensembles de jours couverts : leur différence symétrique donne les
 * jours qui passent de présente à absente (ou l'inverse). Un jour couvert des deux côtés
 * ne change pas de statut — il n'y a donc rien à verrouiller.
 *
 * Cas particulier : basculer « Me noter Non aux repas » sur un séjour ne déplace aucune
 * date, mais change ce qui est compté sur TOUS ses jours. On traite donc ce changement
 * comme touchant l'ensemble des jours du séjour.
 */
export function joursVerrouillesImpactes(
  avant: Sejour | null,
  apres: Sejour | null,
  heureLimite: string = HEURE_VERROU_FOYER_DEFAUT,
  maintenant: Date = new Date(),
  fuseau: string = IDENTITE_DEFAUT.fuseau
): string[] {
  const joursAvant = avant ? new Set(joursDuSejour(avant.date_debut, avant.date_fin)) : new Set<string>();
  const joursApres = apres ? new Set(joursDuSejour(apres.date_debut, apres.date_fin)) : new Set<string>();

  const impactes = new Set<string>();
  for (const j of joursAvant) if (!joursApres.has(j)) impactes.add(j);
  for (const j of joursApres) if (!joursAvant.has(j)) impactes.add(j);

  const repasNonChange =
    avant != null && apres != null && (avant.repas_non ?? true) !== (apres.repas_non ?? true);
  if (repasNonChange) for (const j of joursAvant) impactes.add(j);

  return [...impactes].filter((j) => estJourVerrouille(j, heureLimite, maintenant, fuseau)).sort();
}

/** Message d'explication destiné à l'utilisatrice, ou null si rien n'est verrouillé. */
export function messageVerrouFoyer(
  joursVerrouilles: string[],
  heureLimite: string = HEURE_VERROU_FOYER_DEFAUT,
  locale: string = IDENTITE_DEFAUT.locale
): string | null {
  if (joursVerrouilles.length === 0) return null;
  const enFr = (j: string) =>
    parseDateKeyLocal(j).toLocaleDateString(locale, { day: "numeric", month: "long" });
  const liste =
    joursVerrouilles.length === 1
      ? `du ${enFr(joursVerrouilles[0])}`
      : `des ${enFr(joursVerrouilles[0])} et ${enFr(joursVerrouilles[joursVerrouilles.length - 1])}`;
  return `La présence ${liste} n'est plus modifiable : elle est verrouillée à ${heureLimite} le jour même. Demandez à l'intendance si c'est nécessaire.`;
}
