'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rightsFromRow, RIGHTS_COLUMNS, EMPTY_RIGHTS, type Rights } from '@/lib/roles';
import { toResidences } from '@/lib/residences';
import type { Residence } from '@/types/Residence';
import type { Etage } from '@/types/Etage';
import { IDENTITE_DEFAUT, type IdentiteFoyer } from '@/lib/foyer';

type SupabaseContextType = {
  supabase: SupabaseClient;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Blocs du foyer (Résidence 12, Résidence 36, Corail, …), chargés une seule fois et
// partagés : presque chaque écran en a besoin (encadrés, couleurs, libellés) et la
// liste est minuscule. Voir src/lib/residences.ts.
type ResidencesContextType = {
  residences: Residence[]; // blocs actifs, dans l'ordre d'affichage
  // Étages déclarés, tous blocs confondus : sert à afficher le NOM d'un étage
  // (« Rez-de-chaussée ») là où la base ne stocke que sa clé (« 12_rez_de_chaussee »).
  etages: Etage[];
  loading: boolean;
  reload: () => Promise<void>;
};

const ResidencesContext = createContext<ResidencesContextType | undefined>(undefined);

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

// Identité du foyer (nom, logo, couleur, fuseau). Transmise par le layout serveur
// plutôt que rechargée ici : l'écran de connexion doit afficher le bon logo dès
// le premier rendu, sans attendre un aller-retour réseau. Voir src/lib/foyer.ts.
const IdentiteContext = createContext<IdentiteFoyer>(IDENTITE_DEFAUT);

// `supabaseUrl` et `supabaseAnonKey` viennent du layout serveur, pas de process.env :
// NEXT_PUBLIC_* est figé dans le bundle au build, alors qu'un même déploiement sert
// plusieurs foyers sur des bases différentes. Voir src/lib/foyers.ts.
export function Providers({
  children,
  identite = IDENTITE_DEFAUT,
  supabaseUrl,
  supabaseAnonKey,
}: {
  children: React.ReactNode;
  identite?: IdentiteFoyer;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [supabase] = useState(() => createBrowserClient(supabaseUrl, supabaseAnonKey));

  const [rights, setRights] = useState<Rights>(EMPTY_RIGHTS);
  const [groupes, setGroupes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [etages, setEtages] = useState<Etage[]>([]);
  const [residencesLoading, setResidencesLoading] = useState(true);

  // `select("*")` et non la liste des colonnes : tant que supabase/blocs-dynamiques.sql
  // n'est pas passé, kind/ordre/couleur/is_active n'existent pas — toResidences les déduit.
  const reloadResidences = useCallback(async () => {
    // Tolérant : tant que les SQL blocs/étages ne sont pas passés, ces lectures
    // renvoient vide ou partiel et l'appli retombe sur ses valeurs déduites.
    const [{ data }, { data: etagesData }] = await Promise.all([
      supabase.from('residences').select('*').order('value'),
      supabase.from('etages').select('*').order('ordre'),
    ]);
    setResidences(toResidences(data as Record<string, unknown>[] | null).filter((r) => r.is_active));
    setEtages((etagesData ?? []) as Etage[]);
    setResidencesLoading(false);
  }, [supabase]);

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
    reloadResidences();

    // Connexion / déconnexion / changement de compte : les droits changent.
    // TOKEN_REFRESHED est ignoré (fréquent, sans effet sur les droits).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Ne jamais rappeler supabase de façon synchrone dans ce callback (interblocage
        // documenté par supabase-js) : on repousse d'un tick.
        setTimeout(() => { reload(); reloadResidences(); }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, reload, reloadResidences]);

  return (
    <IdentiteContext.Provider value={identite}>
    <SupabaseContext.Provider value={{ supabase }}>
      <RightsContext.Provider value={{ rights, groupes, loading, reload }}>
        <ResidencesContext.Provider value={{ residences, etages, loading: residencesLoading, reload: reloadResidences }}>
          {children}
        </ResidencesContext.Provider>
      </RightsContext.Provider>
    </SupabaseContext.Provider>
    </IdentiteContext.Provider>
  );
}

export const useIdentite = () => useContext(IdentiteContext);

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

export const useResidencesContext = () => {
  const context = useContext(ResidencesContext);
  if (!context) {
    throw new Error('useResidencesContext must be used within Providers');
  }
  return context;
};
