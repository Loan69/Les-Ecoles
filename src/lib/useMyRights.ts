"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/providers";
import { canEdit as canEditFn, canManageRoles as canManageRolesFn, asNiveau, type Niveau } from "@/lib/roles";

export type MyRights = {
  niveau: Niveau;
  isTechnique: boolean;
  canEdit: boolean; // niveau >= 3 (ou compte technique)
  canManageRoles: boolean; // niveau 4 (ou compte technique)
  loading: boolean;
};

// Droits de l'utilisatrice courante, pour piloter l'affichage (masquer les
// commandes d'édition en lecture seule). La sécurité réelle reste côté serveur.
export function useMyRights(): MyRights {
  const { supabase } = useSupabase();
  const [state, setState] = useState<MyRights>({ niveau: 1, isTechnique: false, canEdit: false, canManageRoles: false, loading: true });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setState((s) => ({ ...s, loading: false })); return; }
      const { data } = await supabase
        .from("residentes")
        .select("niveau, is_technique")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      const niveau = asNiveau(data?.niveau);
      const isTechnique = !!data?.is_technique;
      setState({
        niveau,
        isTechnique,
        canEdit: canEditFn(niveau, isTechnique),
        canManageRoles: canManageRolesFn(niveau, isTechnique),
        loading: false,
      });
    })();
    return () => { active = false; };
  }, [supabase]);

  return state;
}
