-- ════════════════════════════════════════════════════════════════════════════
-- Dépôt de fichiers « branding » — logo et icône du foyer
-- ════════════════════════════════════════════════════════════════════════════
--
-- Séparé du socle **à dessein** : les buckets vivent dans le schéma `storage`, que
-- `pg_dump --schema=public` ne capture pas. Régénérer le socle ne le fera donc
-- jamais apparaître, et un foyer neuf se retrouverait sans dépôt d'images sans
-- qu'aucune erreur ne le signale — le téléversement échouerait au premier essai.
--
-- Idempotent. À passer sur chaque foyer.
--
-- PUBLIC en lecture : le logo s'affiche sur l'écran de connexion, donc avant toute
-- session. Un bucket public n'a pas besoin de policy de lecture.
--
-- L'écriture ne passe PAS par une policy de storage : le téléversement se fait par
-- /api/admin/identite/logo, sous service_role, après contrôle du super-admin.
-- Une seule porte d'entrée, un seul endroit où le droit se vérifie.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
