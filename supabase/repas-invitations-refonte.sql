-- =====================================================================
-- Refonte des invitations repas (Bloc 2)
-- - invites_repas : rattachement à une OPTION du jour + résidence de compta
-- - invites : archivage doux (on garde l'historique, on ne peut plus le sélectionner)
-- Idempotent.
-- =====================================================================

-- Option choisie pour l'invité (parmi les options ouvertes ce jour-là).
alter table public.invites_repas
  add column if not exists option_id uuid references public.meal_options(id);

-- Résidence à laquelle le couvert de l'invité est rattaché en compta (12 / 36).
-- Par défaut : la résidence de la personne qui invite.
alter table public.invites_repas
  add column if not exists compta_residence text;

-- Carnet d'invités : archivage doux (Q6). Un invité archivé garde ses invitations
-- passées (compta intacte) mais n'apparaît plus dans la liste déroulante.
alter table public.invites
  add column if not exists is_active boolean not null default true;
