import { formatDateKeyLocal } from "./utilDate";
import { IDENTITE_DEFAUT } from "./foyer";

export interface LockState {
  locked: boolean;
  lockedValues: string[];
  message: string;
}

/** Numéros de jour au sens `Date.getDay()` : 0 = dimanche … 6 = samedi. */
export type JourSemaine = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Ordre d'affichage des cases à cocher : la semaine commence le lundi. */
export const JOURS_SEMAINE: JourSemaine[] = [1, 2, 3, 4, 5, 6, 0];

export const JOUR_LABEL: Record<JourSemaine, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  0: "Dimanche",
};

/**
 * Jours dont les repas se ferment **par anticipation**, réglés par l'intendance.
 *
 * Stocké dans `app_settings.verrouillage_jours_anticipes` sous la forme « 6,0 »
 * (samedi, dimanche). Une valeur vide = aucun verrouillage anticipé.
 *
 * Compatibilité : avant 2026-08-31 le réglage était le booléen `verrouillage_weekend`,
 * qui codait en dur « samedi + dimanche ». Tant qu'un foyer n'a pas joué la migration
 * (`supabase/verrouillage-jours-anticipes.sql`), on retombe dessus — sans quoi les repas
 * du week-end rouvriraient du jour au lendemain dans les foyers en service.
 */
export function joursAnticipes(settings: {
  verrouillage_jours_anticipes?: string;
  verrouillage_weekend?: string;
}): Set<JourSemaine> {
  const brut = settings.verrouillage_jours_anticipes;
  if (brut == null) {
    return settings.verrouillage_weekend === "true" ? new Set<JourSemaine>([6, 0]) : new Set();
  }
  const jours = brut
    .split(",")
    .map((s) => s.trim())
    // ⚠️ Écarter les fragments vides AVANT de convertir : `Number("")` vaut 0, soit
    // dimanche. Sans ce filtre, une valeur vide — ce qu'écrit la migration pour un foyer
    // qui n'avait pas de verrouillage anticipé — fermerait tous les dimanches.
    .filter((s) => s !== "")
    .map(Number)
    .filter((n): n is JourSemaine => Number.isInteger(n) && n >= 0 && n <= 6);
  return new Set(jours);
}

/** Sérialise pour `app_settings` : « 6,0 ». */
export function serialiseJoursAnticipes(jours: Iterable<JourSemaine>): string {
  const set = new Set(jours);
  return JOURS_SEMAINE.filter((j) => set.has(j)).join(",");
}

/**
 * Calcule l'état de verrouillage des repas pour une date donnée.
 *
 * Règle : clôture LE JOUR MÊME à l'heure de verrouillage.
 * - Jours passés                     → verrouillé
 * - Aujourd'hui après lock           → verrouillé
 * - Jour réglé « fermé d'avance »    → verrouillé dès la veille de sa série (voir plus bas)
 * - Sinon                            → libre
 * Un blocage plus anticipé encore se règle par option via le délai de commande.
 */
export function computeLockState(
  selectedDate: Date,
  settings: { verrouillage_repas?: string; verrouillage_jours_anticipes?: string; verrouillage_weekend?: string },
  // Fuseau du foyer (réglage `foyer_fuseau`) : l'heure de verrouillage est celle
  // du foyer, pas celle du téléphone — sinon une résidente en voyage aurait un
  // verrou décalé. Le défaut couvre les foyers de métropole.
  fuseau: string = IDENTITE_DEFAUT.fuseau,
  locale: string = IDENTITE_DEFAUT.locale
): LockState {
  const now = new Date();
  const parisNow = new Date(now.toLocaleString("en-US", { timeZone: fuseau }));
  const [lockHour, lockMinute] = (settings.verrouillage_repas || "21:00").split(":").map(Number);

  const afterLock =
    parisNow.getHours() > lockHour ||
    (parisNow.getHours() === lockHour && parisNow.getMinutes() >= lockMinute);

  const selectedDay = formatDateKeyLocal(selectedDate);
  const parisToday = formatDateKeyLocal(parisNow);

  const isPastDay = selectedDay < parisToday;
  const isToday = selectedDay === parisToday;

  const lockLabel = settings.verrouillage_repas || "21:00";

  // Jour passé : verrouillé.
  if (isPastDay) {
    return { locked: true, lockedValues: [], message: "" };
  }

  // Jour même : verrouillé une fois l'heure de verrouillage passée (clôture le jour même).
  if (isToday && afterLock) {
    return {
      locked: true,
      lockedValues: [],
      message: `Les inscriptions du jour ne sont plus modifiables après ${lockLabel}.`,
    };
  }

  // Verrouillage anticipé des jours réglés par l'intendance.
  const veille = veilleDeSerie(selectedDate, joursAnticipes(settings));
  if (veille) {
    const instantVerrou = new Date(veille);
    instantVerrou.setHours(lockHour || 0, lockMinute || 0, 0, 0);
    if (parisNow >= instantVerrou) {
      const nomJour = (d: Date) => d.toLocaleDateString(locale, { weekday: "long" });
      return {
        locked: true,
        lockedValues: [],
        message: `Les repas du ${nomJour(selectedDate)} sont verrouillés dès le ${nomJour(veille)} ${lockLabel}.`,
      };
    }
  }

  return { locked: false, lockedValues: [], message: "" };
}

/**
 * Date de la **veille du premier jour** de la série de jours fermés d'avance qui contient
 * `selectedDate` — ou null si ce jour-là n'est pas réglé comme fermé d'avance.
 *
 * On remonte le calendrier tant que le jour rencontré est dans la liste : samedi et dimanche
 * cochés forment une seule série qui commence le samedi, donc les deux se ferment le vendredi
 * (comportement historique du réglage « week-end »). Cocher le seul mercredi ferme le mardi.
 * La semaine est **cyclique** : dimanche + lundi cochés forment aussi une seule série, qui
 * commence le dimanche et se ferme donc le samedi.
 *
 * Travailler sur des dates réelles plutôt que sur des numéros de jour règle gratuitement le cas
 * des séries à venir : la veille d'un samedi dans trois semaines est un vendredi dans trois
 * semaines, encore à venir — rien n'est verrouillé.
 */
function veilleDeSerie(selectedDate: Date, jours: Set<JourSemaine>): Date | null {
  if (jours.size === 0 || !jours.has(selectedDate.getDay() as JourSemaine)) return null;
  // Les 7 jours cochés n'ont pas de début de série : le réglage est refusé à la saisie
  // (voir MealLockSettings), mais une base incohérente ne doit pas boucler à l'infini.
  if (jours.size === 7) return null;

  const curseur = new Date(selectedDate);
  curseur.setHours(0, 0, 0, 0);
  while (jours.has(curseur.getDay() as JourSemaine)) {
    curseur.setDate(curseur.getDate() - 1);
  }
  return curseur;
}
