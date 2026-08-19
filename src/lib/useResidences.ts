"use client";

import { useMemo } from "react";
import { useResidencesContext } from "@/app/providers";
import { labelResidence, themeResidence, type ThemeResidence } from "@/lib/residences";
import type { Residence } from "@/types/Residence";
import type { Etage } from "@/types/Etage";
import { formatEtage } from "@/lib/adminPeople";

export type MesResidences = {
  // Blocs actifs du foyer, dans l'ordre d'affichage. Tout écran qui présente
  // « un encadré par bloc » itère sur cette liste — rien n'est écrit en dur.
  residences: Residence[];
  etages: Etage[];
  loading: boolean;
  label: (value?: string | null) => string;
  theme: (value?: string | null) => ThemeResidence;
  // Nom affiché d'un étage à partir de sa clé technique. La liste `etages` fait foi
  // (un étage renommé suit partout) ; sinon on retombe sur formatEtage, qui sait lire
  // les clés héritées (« r12_etage4 » → « Étage 4 »).
  labelEtage: (value?: string | null) => string | null;
};

// Les blocs sont chargés dans `Providers`, **une seule fois par session** : ce hook
// n'est qu'une lecture de contexte, on peut l'appeler librement.
export function useResidences(): MesResidences {
  const { residences, etages, loading } = useResidencesContext();

  // Références stables tant que la liste ne change pas : `label` et `theme` peuvent servir
  // de dépendance à un useEffect/useMemo sans le relancer à chaque rendu.
  return useMemo(
    () => ({
      residences,
      etages,
      loading,
      label: (value?: string | null) => labelResidence(residences, value),
      theme: (value?: string | null) => themeResidence(residences.find((r) => r.value === value)?.couleur),
      labelEtage: (value?: string | null) =>
        value ? etages.find((e) => e.value === value)?.label ?? formatEtage(value) : null,
    }),
    [residences, etages, loading]
  );
}
