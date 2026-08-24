import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { foyerCourant } from "@/lib/foyerServeur";

/**
 * Client Supabase côté serveur, agissant **au nom de l'utilisatrice connectée**.
 *
 * La base visée est celle du foyer de la requête (résolue d'après le nom d'hôte,
 * cf. src/lib/foyers.ts) : `ecoles.exemple.fr` et `guerledan.exemple.fr` servent la
 * même application sur deux bases distinctes.
 *
 * Utilise la clé ANON : les requêtes partent avec le rôle `authenticated` et la RLS
 * s'applique. C'est le comportement attendu partout où la route ne manipule que les
 * données propres à l'appelante (ses repas, ses absences, son profil).
 *
 * ⚠️ Avant 2026-08, cette fonction recevait la clé SERVICE ROLE. La RLS n'était alors
 * appliquée que tant qu'un cookie de session valide existait ; sans session, les
 * requêtes repassaient en service role et contournaient toute policy. Les routes qui
 * comptaient dessus pour lire les données d'AUTRES personnes doivent utiliser les
 * gardes de `@/lib/apiAuth` (requireSectionView / requireSectionEdit / requireTechnique),
 * qui renvoient explicitement un client service role après contrôle des droits.
 */
export async function createSupabaseServer() {
  const [cookieStore, foyer] = await Promise.all([cookies(), foyerCourant()]);
  return createServerClient(foyer.url, foyer.anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

/**
 * Client Supabase admin (service role) sur la base du foyer courant, sans gestion de
 * session : `service_role` possède BYPASSRLS, aucune policy ne s'applique.
 *
 * À n'utiliser qu'après avoir vérifié les droits de l'appelante — c'est ce que font
 * les gardes de `@/lib/apiAuth`, qui renvoient ce client. Un appel direct ici
 * n'est légitime que pour une opération sans appelant identifiable
 * (ex. /api/check-user, avant toute connexion).
 *
 * Devenue **asynchrone** avec P4 : la base cible dépend désormais de la requête.
 */
export async function createSupabaseAdmin() {
  const foyer = await foyerCourant();
  return createClient(foyer.url, foyer.serviceRole);
}
