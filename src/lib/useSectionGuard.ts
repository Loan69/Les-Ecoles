"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMyRights } from "./useMyRights";
import type { Section } from "./roles";

// Garde d'accès d'une page rattachée à une section (voir R-NIV-11).
// Au niveau « Aucun » (0), l'onglet est masqué ET la page est interdite : quelqu'un
// qui connaît l'URL est renvoyé à l'accueil.
//
// Renvoie `true` seulement quand les droits sont chargés ET l'accès autorisé.
// Tant que c'est `false`, la page ne doit rien rendre (sinon on affiche brièvement
// un contenu interdit avant la redirection).
export function useSectionGuard(section: Section): boolean {
  const router = useRouter();
  const { canAccess, loading } = useMyRights();
  const allowed = canAccess(section);

  useEffect(() => {
    if (!loading && !allowed) router.replace("/homePage");
  }, [loading, allowed, router]);

  return !loading && allowed;
}
