"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/providers";
import { rightsFromRow, canViewSection, canEditSection, isSuperAdmin as isSuper, RIGHTS_COLUMNS, EMPTY_RIGHTS, type Rights, type Section } from "@/lib/roles";

export type MyRights = {
  rights: Rights;
  loading: boolean;
  isSuperAdmin: boolean;
  canView: (s: Section) => boolean;
  canEdit: (s: Section) => boolean;
};

// Droits de l'utilisatrice courante, par section, pour piloter l'affichage
// (masquer les commandes d'édition). La sécurité réelle reste côté serveur.
export function useMyRights(): MyRights {
  const { supabase } = useSupabase();
  const [rights, setRights] = useState<Rights>(EMPTY_RIGHTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setLoading(false); return; }
      const { data } = await supabase.from("residentes").select(RIGHTS_COLUMNS).eq("user_id", user.id).maybeSingle();
      if (!active) return;
      setRights(rightsFromRow(data as Record<string, unknown> | null));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase]);

  return {
    rights,
    loading,
    isSuperAdmin: isSuper(rights),
    canView: (s) => canViewSection(rights, s),
    canEdit: (s) => canEditSection(rights, s),
  };
}
