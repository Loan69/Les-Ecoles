// Brique commune de ciblage de visibilité — événements, options de repas, rubriques
// Administratif. Ces trois objets stockent le même format dans une colonne `visibilite` :
//
//   { residence: [], etage: [], chambre: [], groupes: [], exclusions: [] }
//
// Quatre dimensions de ciblage combinées en **union** (l'une OU l'autre suffit), puis les
// **exclusions nominatives** retirent des personnes au cas par cas. `chambre` n'est plus
// proposé à la saisie : il est conservé pour les événements créés avant 2026-07.
//
// Les **groupes** (voir supabase/groupes.sql) sont des étiquettes libres posées sur des
// comptes. Contrairement au ciblage résidence/étage — dynamique, une arrivante y entre
// toute seule — un groupe est **statique** : il faut y ajouter les nouvelles personnes.
//
// ⚠️ Ce module ne dit PAS à lui seul si un contenu est visible : chaque écran ajoute ses
// propres règles (lieu de l'événement, réservé au staff, résidence sélectionnée à
// l'accueil…). Il ne répond qu'à « cette personne est-elle dans le périmètre ciblé ? »,
// pour que cette réponse soit la même partout.

export interface Cible {
  residence?: string[];
  etage?: string[];
  chambre?: string[]; // hérité (anciens événements) — plus proposé à la saisie
  groupes?: string[]; // identifiants de `groupes`
  exclusions?: string[]; // user_ids explicitement décochés
}

export interface CibleViewer {
  residence?: string | null;
  etage?: string | null;
  chambre?: string | null;
  user_id?: string | null;
  groupes?: string[]; // identifiants des groupes de la personne
}

// Aucun critère de ciblage renseigné ? Selon l'écran, cela signifie « visible par toutes »
// (options de repas, rubriques) ou « ciblage à compléter » (événements) — d'où le choix
// laissé à l'appelant plutôt qu'une convention imposée ici.
export function cibleEstVide(c?: Cible | null): boolean {
  if (!c) return true;
  return (
    (c.residence?.length ?? 0) === 0 &&
    (c.etage?.length ?? 0) === 0 &&
    (c.chambre?.length ?? 0) === 0 &&
    (c.groupes?.length ?? 0) === 0
  );
}

// Retirée nommément du ciblage ?
export function estExclue(c: Cible | null | undefined, v: CibleViewer): boolean {
  if (!c || !v.user_id) return false;
  return (c.exclusions ?? []).includes(v.user_id);
}

// Dans le périmètre ciblé ? (union des quatre dimensions ; n'applique PAS les exclusions)
export function dansCible(c: Cible | null | undefined, v: CibleViewer): boolean {
  if (!c) return false;
  const mesGroupes = v.groupes ?? [];
  return (
    (v.residence != null && (c.residence ?? []).includes(v.residence)) ||
    (v.etage != null && (c.etage ?? []).includes(v.etage)) ||
    (v.chambre != null && (c.chambre ?? []).includes(v.chambre)) ||
    (c.groupes ?? []).some((g) => mesGroupes.includes(g))
  );
}

// ─── Qui voit un contenu MALGRÉ son ciblage ? ────────────────────────────────
//
// Une exception existait : toute personne ayant un droit d'intendance sur la section
// recevait TOUT, ciblage compris. Elle n'était pas là pour donner un droit de regard,
// mais pour empêcher un **enfermement** — cibler un contenu en s'excluant soi-même le
// faisait disparaître de son propre écran de modification, et il devenait
// irrécupérable sans passer par la base.
//
// Le remède visait trop large : il suffit de **l'autrice**. Tant qu'elle voit ce
// qu'elle a écrit, personne ne s'enferme dehors — et le ciblage redevient vrai, y
// compris entre administratrices. C'est ce que demandait la cliente : pouvoir réserver
// un événement sans que toute l'intendance le lise.
//
// ⚠️ Le **super-admin n'est PAS dans la liste** : il peut y en avoir plusieurs, et
// l'exception se rouvrirait aussitôt. La seule clé de secours est le **compte
// technique**, unique par foyer et hors hiérarchie. Conséquence à assumer : lire
// `is_technique` DIRECTEMENT, jamais via `isSuperAdmin()` de `roles.ts`, qui renvoie
// `is_super_admin || is_technique` et réintégrerait les super-admins par la bande.
//
// ⚠️ Ce contournement donne de la **discrétion, pas de la confidentialité**. Pour les
// événements, le ciblage n'est appliqué qu'à l'écran : la RLS laisse lire toute la
// table dès `niveau_evenements >= 1`. Et un super-admin peut de toute façon s'ajouter
// au groupe ciblé. Arbitré comme tel — le besoin était de ne pas encombrer les autres,
// pas de leur cacher quoi que ce soit.
export interface ContournementViewer {
  user_id?: string | null;
  /** Compte technique : clé de secours du foyer, unique, jamais listée. */
  estTechnique?: boolean;
  /**
   * Rattrapage de gestion, pour les contenus **sans autrice enregistrée** seulement.
   *
   * Les rubriques créées avant le 2026-09-11 n'ont pas d'auteur, et rien ne permet de
   * le reconstituer. Sans ce rattrapage, une rubrique restreinte d'avant la migration
   * deviendrait irrécupérable — exactement le mal qu'on cherche à éviter. L'écran qui
   * *gère* le contenu passe donc ici le droit d'intendance correspondant.
   *
   * À ne PAS passer depuis un écran de simple consultation : l'accueil et la semaine
   * des repas n'ont jamais eu cette exception, et la leur ajouter remettrait sous les
   * yeux de l'intendance ce qu'on vient tout juste de lui retirer.
   */
  rattrapageGestion?: boolean;
}

export function contourneLeCiblage(
  auteur: string | null | undefined,
  v: ContournementViewer,
): boolean {
  if (v.estTechnique) return true;
  // Autrice connue : elle, et personne d'autre.
  if (auteur != null) return !!v.user_id && auteur === v.user_id;
  // Autrice inconnue (contenu antérieur, ou compte supprimé) : ancienne règle.
  return v.rattrapageGestion === true;
}
