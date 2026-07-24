-- Journal d'audit des corrections d'intendance sur les inscriptions repas.
-- Append-only : conserve l'historique complet (qui / quand / quoi, avant → après),
-- même après une suppression (repas mis à « Non »). Pour les litiges.
-- Idempotent.

create table if not exists public.meal_audit_log (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  actor_user_id  uuid,                 -- l'admin auteur de la correction
  actor_name     text,                 -- snapshot « Prénom Nom » (survit à la suppression du compte)
  action         text not null,        -- presence_set | presence_remove | guest_add | guest_option | guest_remove
  entity         text not null,        -- presence | invite
  target_user_id uuid,                 -- résidente concernée (pour une présence)
  target_name    text,                 -- snapshot du nom de la personne / de l'invité
  date_repas     date,
  service        text,                 -- dejeuner | diner
  option_before  text,                 -- libellé de l'option avant (snapshot) ou null
  option_after   text,                 -- libellé de l'option après (snapshot) ou null
  details        jsonb                 -- infos complémentaires (invitant, etc.)
);

create index if not exists meal_audit_log_created_idx on public.meal_audit_log (created_at desc);
create index if not exists meal_audit_log_target_idx on public.meal_audit_log (target_user_id);
create index if not exists meal_audit_log_date_idx on public.meal_audit_log (date_repas);

-- Table sensible : RLS activée sans policy → accessible uniquement via le service role (côté serveur admin).
alter table public.meal_audit_log enable row level security;

-- Nettoyage : l'approche « colonnes sur la ligne » est abandonnée au profit de ce journal.
alter table public.presences_v2  drop column if exists modified_by;
alter table public.presences_v2  drop column if exists modified_at;
alter table public.invites_repas drop column if exists modified_by;
alter table public.invites_repas drop column if exists modified_at;
