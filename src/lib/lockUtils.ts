import { formatDateKeyLocal } from "./utilDate";

export interface LockState {
  locked: boolean;
  lockedValues: string[];
  message: string;
}

/**
 * Calcule l'état de verrouillage des repas pour une date donnée.
 *
 * Règle : clôture LE JOUR MÊME à l'heure de verrouillage.
 * - Jours passés            → verrouillé
 * - Aujourd'hui après lock  → verrouillé
 * - Weekend si option activée et vendredi après lock (ou sam/dim) → verrouillé
 * - Sinon                   → libre
 * Un blocage plus anticipé (X jours avant) se règle par option via le délai de commande.
 */
export function computeLockState(
  selectedDate: Date,
  settings: { verrouillage_repas?: string; verrouillage_weekend?: string }
): LockState {
  const now = new Date();
  const parisNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
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

  // Verrouillage anticipé du weekend
  const weekendLockEnabled = settings.verrouillage_weekend === "true";
  if (weekendLockEnabled) {
    const currentDayOfWeek = parisNow.getDay();
    const selectedDayOfWeek = selectedDate.getDay();
    const isSelectedDayWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;

    const isWeekendLockActive =
      (currentDayOfWeek === 5 && afterLock) ||
      currentDayOfWeek === 6 ||
      currentDayOfWeek === 0;

    if (isWeekendLockActive && isSelectedDayWeekend && isUpcomingWeekend(parisNow, selectedDate)) {
      return {
        locked: true,
        lockedValues: [],
        message: `Les présences aux repas du weekend sont verrouillées dès le vendredi ${settings.verrouillage_repas}.`,
      };
    }
  }

  return { locked: false, lockedValues: [], message: "" };
}

function isUpcomingWeekend(parisNow: Date, selectedDate: Date): boolean {
  const currentDayOfWeek = parisNow.getDay();

  if (currentDayOfWeek === 5) {
    const friday = new Date(parisNow);
    friday.setHours(0, 0, 0, 0);
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return sel.getTime() === saturday.getTime() || sel.getTime() === sunday.getTime();
  }

  if (currentDayOfWeek === 6 || currentDayOfWeek === 0) {
    const saturday = new Date(parisNow);
    saturday.setHours(0, 0, 0, 0);
    saturday.setDate(parisNow.getDate() - (currentDayOfWeek === 6 ? 0 : 1));
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return sel.getTime() === saturday.getTime() || sel.getTime() === sunday.getTime();
  }

  return false;
}
