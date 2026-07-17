-- =====================================================================
-- Lot 3 — Migration : rattacher les résidentes ACTUELLES à leur chambre.
-- 1) crée les chambres (12/36) depuis l'existant ;
-- 2) rattache chaque résidente active à la place correspondante (place_id).
-- Idempotent. Ne touche pas au super-admin (is_super_admin) ni à corail.
-- =====================================================================

-- --- CONTRÔLE PRÉALABLE (à lancer avant, décommenté) : chambres avec ---
-- --- plusieurs comptes actifs → à régler d'abord (1 place = 1 compte). ---
-- select residence, etage, chambre, count(*)
-- from public.residentes
-- where statut = 'active' and residence in ('12','36')
--   and coalesce(is_super_admin,false) = false
-- group by residence, etage, chambre having count(*) > 1;

-- 1) Créer les chambres depuis les données existantes (idempotent)
insert into public.places (residence, kind, etage, code, label)
select distinct
  r.residence,
  'chambre',
  btrim(r.etage),
  trim(both '_' from regexp_replace(lower(btrim(r.etage) || '_' || btrim(r.chambre)), '[^a-z0-9]+', '_', 'g')),
  initcap(replace(btrim(r.chambre), '_', ' '))
from public.residentes r
where r.residence in ('12', '36')
  and coalesce(r.is_super_admin, false) = false
  and r.chambre is not null and btrim(r.chambre) <> ''
  and r.etage  is not null and btrim(r.etage)  <> ''
on conflict (residence, kind, code) do nothing;

-- 2) Rattacher chaque résidente active à sa place.
--    Garde-fou « 1 place = 1 compte actif » : si plusieurs comptes actifs pointent
--    vers la même chambre, on n'en rattache qu'UN (le plus récent) ; les autres
--    restent non rattachés (voir contrôle après) pour être réglés à la main.
with ranked as (
  select
    r.user_id,
    p.id as place_id,
    row_number() over (partition by p.id order by r.created_at desc nulls last, r.id) as rn
  from public.residentes r
  join public.places p
    on p.kind = 'chambre'
   and p.residence = r.residence
   and p.code = trim(both '_' from regexp_replace(lower(btrim(r.etage) || '_' || btrim(r.chambre)), '[^a-z0-9]+', '_', 'g'))
  where r.residence in ('12', '36')
    and coalesce(r.is_super_admin, false) = false
    and r.statut = 'active'
    and r.place_id is null
    and r.chambre is not null and btrim(r.chambre) <> ''
    and r.etage  is not null and btrim(r.etage)  <> ''
    -- ne cible pas une place ayant déjà une occupante active (re-run sûr)
    and not exists (select 1 from public.residentes x where x.place_id = p.id and x.statut = 'active')
)
update public.residentes r
set place_id = ranked.place_id
from ranked
where ranked.user_id = r.user_id and ranked.rn = 1;

-- --- CONTRÔLE APRÈS : résidentes actives NON rattachées (à traiter à la main) ---
-- select nom, prenom, residence, etage, chambre
-- from public.residentes
-- where statut = 'active' and place_id is null
--   and coalesce(is_super_admin,false) = false and residence in ('12','36');
