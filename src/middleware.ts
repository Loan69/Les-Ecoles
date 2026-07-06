import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware Supabase : rafraîchit la session (jeton d'accès) à chaque requête
 * et réécrit les cookies renouvelés. Indispensable pour "rester connecté" —
 * sans cela, le jeton expire (~1 h) et l'utilisatrice est renvoyée vers la connexion.
 *
 * Utilise la clé ANON (jamais le service role) : le middleware ne fait que
 * rafraîchir la session, aucune opération privilégiée.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Déclenche le rafraîchissement du jeton si nécessaire (ne rien insérer avant).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques, images et le manifest.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|apple-touch-icon|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
};
