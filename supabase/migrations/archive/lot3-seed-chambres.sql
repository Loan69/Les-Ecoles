-- =====================================================================
-- Lot 3 — Seed des CHAMBRES (résidences 12 et 36) depuis l'existant.
-- Pré-remplit l'écran « Chambres » à partir des chambres déjà connues des
-- comptes, classées par étage. Les chambres vides (jamais occupées) ne sont
-- pas capturées → à ajouter à la main (rare).
-- Idempotent : réexécutable (on conflict do nothing).
-- =====================================================================

insert into public.places (residence, kind, etage, code, label)
select distinct
  r.residence,
  'chambre' as kind,
  btrim(r.etage) as etage,
  -- code interne unique = slug(etage_chambre) ; jamais affiché à l'admin
  trim(both '_' from regexp_replace(lower(btrim(r.etage) || '_' || btrim(r.chambre)), '[^a-z0-9]+', '_', 'g')) as code,
  -- libellé affiché = chambre « présentable » (grand_palais -> Grand Palais)
  initcap(replace(btrim(r.chambre), '_', ' ')) as label
from public.residentes r
where r.residence in ('12', '36')
  and r.chambre is not null and btrim(r.chambre) <> ''
  and r.etage  is not null and btrim(r.etage)  <> ''
on conflict (residence, kind, code) do nothing;

-- Contrôle : liste ce qui a été créé
-- select residence, etage, code, label from public.places where kind = 'chambre' order by residence, etage, code;
