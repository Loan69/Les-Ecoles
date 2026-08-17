'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rightsFromRow, RIGHTS_COLUMNS, EMPTY_RIGHTS, type Rights } from '@/lib/roles';

type SupabaseContextType = {
  supabase: SupabaseClient;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Droits de l'utilisatrice courante, chargés **une seule fois par session** et partagés.
// Avant, chaque composant appelant useMyRights refaisait ses propres requêtes (auth + résidente),
// soit deux allers-retours réseau par composant et par navigation.
type RightsContextType = {
  rights: Rights;
  // Identifiants des groupes de l'utilisatrice (ciblage de visibilité, jamais des droits).
  // Chargés ici pour la même raison que les droits : sinon chaque écran qui filtre un
  // contenu referait la requête. La RLS ne laisse lire que ses propres appartenances.
  groupes: string[];
  loading: boolean;
  reload: () => Promise<void>;
};

const RightsContext = createContext<RightsContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [rights, setRights] = useState<Rights>(EMPTY_RIGHTS);
  const [groupes, setGroupes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    // getSession lit le stockage local (aucun appel réseau) ; le rafraîchissement du jeton
    // est assuré par le middleware à chaque navigation. La sécurité réelle reste côté
    // serveur (RLS + gardes d'API) : ces droits ne pilotent que l'affichage.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setRights(EMPTY_RIGHTS);
      setGroupes([]);
      setLoading(false);
      return;
    }
    const [{ data }, { data: mesGroupes }] = await Promise.all([
      supabase
        .from('residentes')
        .select(RIGHTS_COLUMNS)
        .eq('user_id', session.user.id)
        .maybeSingle(),
      // Tolérant : tant que supabase/groupes.sql n'est pas passé, la table n'existe pas
      // et l'appli fonctionne simplement sans groupe.
      supabase.from('groupe_membres').select('groupe_id').eq('user_id', session.user.id),
    ]);
    setRights(rightsFromRow(data as Record<string, unknown> | null));
    setGroupes((mesGroupes ?? []).map((g) => g.groupe_id as string));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    reload();

    // Connexion / déconnexion / changement de compte : les droits changent.
    // TOKEN_REFRESHED est ignoré (fréquent, sans effet sur les droits).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Ne jamais rappeler supabase de façon synchrone dans ce callback (interblocage
        // documenté par supabase-js) : on repousse d'un tick.
        setTimeout(() => { reload(); }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, reload]);

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      <RightsContext.Provider value={{ rights, groupes, loading, reload }}>
        {children}
      </RightsContext.Provider>
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within Providers');
  }
  return context;
};

export const useRightsContext = () => {
  const context = useContext(RightsContext);
  if (!context) {
    throw new Error('useRightsContext must be used within Providers');
  }
  return context;
};
