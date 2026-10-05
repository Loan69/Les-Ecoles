// --- Ordre chronologique des événements d'une journée ------------------------
//
// Le champ « Horaire de l'évènement » (`evenements.heures`) est un texte LIBRE :
// « 18h30 », « 14h - 16h », « de 9:00 à 12:00 », « midi », mais aussi « toute la
// journée », « après le dîner » ou n'importe quoi d'autre. On ne le contraint pas
// (ce serait perdre les plages et les mentions utiles) : on y cherche seulement la
// PREMIÈRE heure lisible, qui sert de clé de tri. Le texte affiché ne change pas.
//
// Un événement sans heure lisible n'est pas une erreur : il passe EN TÊTE de la
// journée (comme un événement « toute la journée » dans un agenda), et ces
// événements-là se classent entre eux par date de création. On ne mêle pas l'heure
// de création aux heures saisies : un événement créé à 23 h il y a trois semaines
// n'a aucune raison de passer après celui de 20 h.

import type { CalendarEvent } from "@/types/CalendarEvent";

// « 18h », « 18h30 », « 18 h 30 », « 18H30 », « 18:30 ». Le « h » ou le « : » est
// exigé : un nombre seul (« salle 12 », « 3 places ») n'est pas une heure.
const HEURE = /(?<!\d)(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?!\d)/i;
const MIDI = /\bmidi\b/i;
const MINUIT = /\bminuit\b/i;

/** Minutes depuis minuit de la première heure lisible du texte, sinon `null`. */
export function minutesDeLHoraire(texte: string | null | undefined): number | null {
  if (!texte) return null;

  // On garde la première mention dans le texte, qu'elle soit chiffrée ou en toutes
  // lettres : « midi - 14h » commence à midi.
  const candidats: { index: number; minutes: number }[] = [];

  const m = HEURE.exec(texte);
  if (m) {
    const h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    // « 25h », « 18h75 » : saisie fantaisiste, on l'ignore plutôt que de deviner.
    if (h <= 23 && min <= 59) candidats.push({ index: m.index, minutes: h * 60 + min });
  }
  const midi = MIDI.exec(texte);
  if (midi) candidats.push({ index: midi.index, minutes: 12 * 60 });
  const minuit = MINUIT.exec(texte);
  if (minuit) candidats.push({ index: minuit.index, minutes: 0 });

  if (candidats.length === 0) return null;
  return candidats.reduce((a, b) => (a.index <= b.index ? a : b)).minutes;
}

function horodatage(evt: CalendarEvent): number {
  const t = evt.created_at ? Date.parse(evt.created_at) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/** Comparateur : sans heure d'abord (par création), puis par heure, puis par création. */
export function comparerEvenementsDuJour(a: CalendarEvent, b: CalendarEvent): number {
  const ha = minutesDeLHoraire(a.heures);
  const hb = minutesDeLHoraire(b.heures);
  if (ha !== hb) {
    if (ha === null) return -1;
    if (hb === null) return 1;
    return ha - hb;
  }
  return horodatage(a) - horodatage(b) || (a.id ?? 0) - (b.id ?? 0);
}

/** Copie triée — ne modifie pas le tableau reçu (souvent un état React). */
export function trierEvenementsDuJour<T extends CalendarEvent>(evenements: T[]): T[] {
  return [...evenements].sort(comparerEvenementsDuJour);
}
