import { CalendarEvent } from "@/types/CalendarEvent";
import { cibleEstVide, dansCible, estExclue, type CibleViewer } from "@/lib/visibilite";

// --- « Cette personne a-t-elle le droit de voir cet événement ? » -------------
//
// Une seule règle, un seul endroit. Elle était auparavant réécrite à chaque écran —
// ou oubliée. Cinq défauts en découlaient :
//
//   · la carte « Événements » de l'accueil appelait `dansCible` SANS le garde
//     `cibleEstVide` : un événement créé sans ciblage — le cas le plus courant —
//     n'apparaissait JAMAIS, alors que le même événement s'affichait bien en rappel
//     « Aujourd'hui », qui avait le garde. Deux chemins, deux réponses opposées ;
//   · les rappels n'étaient filtrés par RIEN : chacune voyait le titre d'événements
//     qui ne la ciblaient pas ;
//   · le calendrier non plus : `select("*")` passé tel quel à la vue ;
//   · l'absence de profil était traitée comme « invitée », ce qui privait une
//     super-administratrice sans chambre de presque tout (voir plus bas) ;
//   · cette fonction elle-même existait, inutilisée, avec le même oubli de garde.
//
// ⚠️ Cette règle ne dit PAS *où* l'événement s'affiche. Le lieu décide de l'onglet
// qui l'accueille (ou du rappel « Aujourd'hui » s'il n'est rattaché à aucun bloc) ;
// il ne décide pas du droit de le voir. Mélanger les deux est ce qui a produit
// l'incohérence entre les deux chemins de l'accueil.

export type EventViewer = CibleViewer & {
  /**
   * A-t-elle une ligne `residentes` ? Et NON « a-t-elle une chambre ».
   *
   * La distinction compte depuis qu'une super-administratrice s'invite sans place :
   * son profil existe, mais `residence` y est nulle. Tester la résidence revenait à
   * la traiter comme une invitée externe — elle ne voyait plus que les événements
   * explicitement ouverts aux invitées, soit presque rien.
   */
  estResidente: boolean;
};

export function evenementVisiblePour(event: CalendarEvent, v: EventViewer): boolean {
  // Invitée externe : uniquement ce qui lui est explicitement ouvert.
  if (!v.estResidente) return event.visible_invites === true;

  // Décochée nommément à la création : prime sur tout le reste.
  if (estExclue(event.visibilite, v)) return false;

  // Aucun ciblage renseigné = visible par toutes. C'est le cas par défaut à la
  // création, et l'écran de saisie présente bien la visibilité comme facultative.
  if (cibleEstVide(event.visibilite)) return true;

  return dansCible(event.visibilite, v);
}

/**
 * L'événement concerne-t-il le lieu de vie de cette personne ?
 *
 * Complément de `evenementVisiblePour`, et volontairement séparé : le lieu dit *où*
 * l'événement s'affiche, pas *qui* a le droit de le voir.
 *
 * Un événement **sans lieu** concerne tout le monde — c'est ainsi qu'on annonce ce qui
 * ne se rattache à aucun bâtiment. Avec un lieu, il concerne les blocs cités.
 */
export function evenementConcerneLeLieu(event: CalendarEvent, residence?: string | null): boolean {
  const lieux = event.lieu ?? [];
  if (lieux.length === 0) return true;
  return residence != null && lieux.includes(residence);
}
