"use client";

import { useMemo } from "react";
import { useResidencesContext } from "@/app/providers";
import { labelResidence, themeResidence, type ThemeResidence } from "@/lib/residences";
import type { Residence } from "@/types/Residence";

export type MesResidences = {
  // Blocs actifs du foyer, dans l'ordre d'affichage. Tout écran qui présente
  // « un encadré par bloc » itère sur cette liste — rien n'est écrit en dur.
  residences: Residence[];
  loading: boolean;
  label: (value?: string | null) => string;
  theme: (value?: string | null) => ThemeResidence;
};

// Les blocs sont chargés dans `Providers`, **une seule fois par session** : ce hook
// n'est qu'une lecture de contexte, on peut l'appeler librement.
export function useResidences(): MesResidences {
  const { residences, loading } = useResidencesContext();

  // Références stables tant que la liste ne change pas : `label` et `theme` peuvent servir
  // de dépendance à un useEffect/useMemo sans le relancer à chaque rendu.
  return useMemo(
    () => ({
      residences,
      loading,
      label: (value?: string | null) => labelResidence(residences, value),
      theme: (value?: string | null) => themeResidence(residences.find((r) => r.value === value)?.couleur),
    }),
    [residences, loading]
  );
}
