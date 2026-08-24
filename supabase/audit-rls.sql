-- Audit RLS — à coller dans Supabase → SQL Editor, puis copier le résultat.
-- Lecture seule : ne modifie rien.
--
-- Renvoie UNE cellule JSON contenant :
--   tables    : RLS activée ? forcée ? combien de policies ?
--   policies  : chaque policy (commande, rôles, USING, WITH CHECK)
--   grants    : ce que les rôles anon / authenticated ont le droit de faire
--               (sans GRANT, la RLS n'est même pas consultée — c'est un second levier)
--   fonctions : les SECURITY DEFINER existantes (elles contournent la RLS)

select jsonb_pretty(jsonb_build_object(

  'tables', (
    select jsonb_agg(t order by t->>'table')
    from (
      select jsonb_build_object(
        'table', c.relname,
        'rls_active', c.relrowsecurity,
        'rls_forcee', c.relforcerowsecurity,
        'nb_policies', (select count(*) from pg_policy p where p.polrelid = c.oid)
      ) as t
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    ) s
  ),

  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename,
      'nom', policyname,
      'permissive', permissive,
      'roles', roles,
      'commande', cmd,
      'using', qual,
      'with_check', with_check
    ) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public'
  ),

  'grants', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name,
      'role', grantee,
      'droits', privs
    ) order by table_name, grantee), '[]'::jsonb)
    from (
      select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privs
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
      group by table_name, grantee
    ) g
  ),

  'fonctions_security_definer', (
    select coalesce(jsonb_agg(p.proname order by p.proname), '[]'::jsonb)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  )

)) as audit;
