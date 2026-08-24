-- ============================================================================
-- Confirmations de participation : écriture atomique, et écriture des événements
-- réservée à celles qui les gèrent
-- ============================================================================
-- Constat : les confirmations SONT bien enregistrées (`evenements.confirmations`,
-- un text[] d'identifiants). Deux défauts dans la façon dont elles s'écrivent.
--
-- 1) PERTE DE CONFIRMATION. Le bouton « Je participe » lisait le tableau, y ajoutait
--    son identifiant, puis réécrivait le tout. Deux personnes qui confirment dans la
--    même seconde lisent la même version : la seconde écriture écrase la première,
--    qui disparaît sans que personne s'en aperçoive. D'autant plus probable qu'un
--    événement est annoncé à tout le foyer en même temps.
--
-- 2) ÉCRITURE OUVERTE À TOUTES. Pour que ce bouton fonctionne, la table `evenements`
--    doit être modifiable par n'importe quelle connectée — et une politique RLS
--    autorise une LIGNE entière, pas une colonne. Vérifié : « Test Loan 2 », niveau
--    Habitante sur Événements, a bien pu écrire. Rien n'empêche donc, par appel
--    direct à l'API, de renommer, redater ou supprimer n'importe quel événement.
--    Les boutons sont masqués dans l'écran ; le serveur, lui, ne dit pas non.
--
-- La partie 1 est sans risque : à passer telle quelle.
-- La partie 2 remplace les politiques de `evenements`, écrites à la main hors de ce
-- dépôt : LISEZ D'ABORD l'inventaire, et ne l'exécutez qu'après relecture.
-- ============================================================================


-- ============================================================================
-- PARTIE 1 — Basculer sa confirmation en une seule écriture (sans risque)
-- ============================================================================
-- Tout tient dans un seul UPDATE : PostgreSQL verrouille la ligne le temps de
-- l'opération, deux confirmations simultanées ne peuvent plus s'écraser.
--
-- SECURITY DEFINER : la fonction écrit pour le compte de l'appelante, ce qui
-- permettra (partie 2) de fermer l'écriture directe de la table sans casser le
-- bouton. Elle n'écrit QUE l'identifiant de l'appelante, jamais celui d'une autre.

create or replace function public.basculer_confirmation_evenement(p_event_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   text := auth.uid()::text;
  v_apres  boolean;
begin
  if v_user is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  update public.evenements
     set confirmations = case
           when coalesce(confirmations, '{}') @> array[v_user]
             then array_remove(confirmations, v_user)
             else array_append(coalesce(confirmations, '{}'), v_user)
         end
   where id = p_event_id
  returning coalesce(confirmations, '{}') @> array[v_user] into v_apres;

  if not found then
    raise exception 'Événement introuvable';
  end if;

  return v_apres; -- true = inscrite, false = retirée
end;
$$;

revoke all on function public.basculer_confirmation_evenement(bigint) from public;
grant execute on function public.basculer_confirmation_evenement(bigint) to authenticated;


-- ============================================================================
-- PARTIE 2 — Refermer l'écriture des événements  ⚠️  À RELIRE AVANT D'EXÉCUTER
-- ============================================================================
-- Les politiques actuelles de `evenements` ont été posées à la main dans Supabase :
-- elles ne figurent nulle part dans ce dépôt, je ne peux donc pas les reprendre à
-- l'identique. Commencez par les afficher :
--
--   select policyname, cmd, roles, qual, with_check
--     from pg_policies where schemaname = 'public' and tablename = 'evenements';
--
-- Puis, si le résultat correspond bien à « tout le monde peut tout écrire »,
-- décommentez ce qui suit. La LECTURE reste ouverte à toutes les connectées :
-- c'est l'application qui filtre ensuite selon le ciblage de chaque événement,
-- comme aujourd'hui — ne pas y toucher, sous peine de vider les calendriers.

-- alter table public.evenements enable row level security;
--
-- do $$
-- declare pol record;
-- begin
--   for pol in select policyname from pg_policies
--              where schemaname = 'public' and tablename = 'evenements'
--   loop
--     execute format('drop policy %I on public.evenements', pol.policyname);
--   end loop;
-- end $$;
--
-- -- Lecture : inchangée (le ciblage est appliqué côté application).
-- create policy "evenements lisibles par les connectees"
--   on public.evenements for select
--   to authenticated
--   using (true);
--
-- -- Écriture : réservée à « Événements · Admin gérer », au super-admin et au compte
-- -- technique — exactement ce que l'écran propose déjà (R-NIV-03).
-- create policy "evenements modifiables par la gestion"
--   on public.evenements for all
--   to authenticated
--   using (
--     exists (
--       select 1 from public.residentes r
--        where r.user_id = auth.uid()
--          and (coalesce(r.is_super_admin, false)
--               or coalesce(r.is_technique, false)
--               or coalesce(r.niveau_evenements, 1) >= 3)
--     )
--   )
--   with check (
--     exists (
--       select 1 from public.residentes r
--        where r.user_id = auth.uid()
--          and (coalesce(r.is_super_admin, false)
--               or coalesce(r.is_technique, false)
--               or coalesce(r.niveau_evenements, 1) >= 3)
--     )
--   );
--
-- -- Les confirmations continuent de passer : la fonction de la partie 1 est
-- -- SECURITY DEFINER, elle n'est pas soumise à ces politiques.


-- ============================================================================
-- Vérification
-- ============================================================================
-- select proname, prosecdef from pg_proc where proname = 'basculer_confirmation_evenement';
-- select id, titre, confirmations from public.evenements where cardinality(confirmations) > 0;
