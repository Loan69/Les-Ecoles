"use client";

import { useRightsContext } from "@/app/providers";
import { canAccessSection, canViewSection, canEditSection, isSuperAdmin as isSuper, type Rights, type Section } from "@/lib/roles";

export type MyRights = {
  rights: Rights;
  // Groupes de l'utilisatrice : servent au **ciblage de visibilité** uniquement
  // (événements, options de repas, rubriques) — jamais à accorder un droit.
  groupes: string[];
  loading: boolean;
  isSuperAdmin: boolean;
  canAccess: (s: Section) => boolean; // niveau >= 1 : la page/l'onglet existent
  canView: (s: Section) => boolean;
  canEdit: (s: Section) => boolean;
};

// Droits de l'utilisatrice courante, par section, pour piloter l'affichage
// (masquer les commandes d'édition). La sécurité réelle reste côté serveur.
//
// Le chargement a lieu dans `Providers` : **une seule fois par session**, partagé par tous
// les composants. Ce hook n'est plus qu'une lecture de contexte — on peut l'appeler
// librement, sans coût réseau.
export function useMyRights(): MyRights {
  const { rights, groupes, loading } = useRightsContext();

  return {
    rights,
    groupes,
    loading,
    isSuperAdmin: isSuper(rights),
    canAccess: (s) => canAccessSection(rights, s),
    canView: (s) => canViewSection(rights, s),
    canEdit: (s) => canEditSection(rights, s),
  };
}
