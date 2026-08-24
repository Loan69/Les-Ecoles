-- ════════════════════════════════════════════════════════════════════════════
-- P2c — Inviter une super-administratrice sans lui attribuer de chambre
-- ════════════════════════════════════════════════════════════════════════════
--
-- Au démarrage d'un foyer, personne n'a encore créé de bloc, d'étage ni de chambre :
-- il n'existe donc aucune place où loger une invitation. Or c'est justement à ce
-- moment qu'il faut donner la main à quelqu'un côté client, pour qu'il fasse ce
-- travail sans dépendre du compte technique.
--
-- On rend `place_id` facultatif. Une invitation sans place vaut invitation de
-- super-administratrice : elle n'occupe aucune chambre et n'entre pas dans la
-- capacité du foyer — exactement comme le compte technique.
--
-- L'index `invitations_one_pending_per_place` n'est pas gêné : en PostgreSQL, deux
-- NULL sont considérés distincts dans un index unique.

begin;

alter table public.invitations alter column place_id drop not null;

comment on column public.invitations.place_id is
  'Place attribuée. NULL = invitation de super-administratrice, sans chambre (cf. role).';

-- `role` n'avait aucune contrainte : on la pose maintenant qu'il porte deux valeurs
-- distinctes, pour qu'une faute de frappe ne crée pas un rôle fantôme.
alter table public.invitations drop constraint if exists invitations_role_check;
alter table public.invitations add constraint invitations_role_check
  check (role in ('residente', 'super_admin'));

-- Cohérence : une invitation de super-admin n'a pas de place, une invitation de
-- résidente en a forcément une.
alter table public.invitations drop constraint if exists invitations_place_role_chk;
alter table public.invitations add constraint invitations_place_role_chk
  check ((role = 'super_admin' and place_id is null)
      or (role = 'residente'   and place_id is not null));

commit;
