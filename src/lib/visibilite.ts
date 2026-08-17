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
