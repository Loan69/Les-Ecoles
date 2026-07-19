-- Visibilité au niveau de l'option (comme les événements) : ciblage
-- résidences / étages + exclusions nominatives. NULL / vide = visible par toutes.
alter table public.meal_options
  add column if not exists visibilite jsonb;
