-- Option « Me noter Non aux repas pendant mon absence » (cochée par défaut).
-- Si false, l'absence n'affecte pas les repas (la résidente peut rester inscrite).
alter table public.absences_sejour
  add column if not exists repas_non boolean not null default true;
