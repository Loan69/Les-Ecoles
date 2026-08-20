import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Écrans d'entrée : la racine (c'est l'adresse de lancement de l'appli installée,
// voir public/manifest.json) et le formulaire de connexion.
const ENTREES = ["/", "/signin"];

/**
 * Middleware Supabase : rafraîchit la session (jeton d'accès) à chaque requête
 * et réécrit les cookies renouvelés. Indispensable pour "rester connecté" —
 * sans cela, le jeton expire (~1 h) et l'utilisatrice est renvoyée vers la connexion.
 *
 * Il aiguille aussi les écrans d'entrée : une utilisatrice déjà connectée qui rouvre
 * l'appli va directement à l'accueil au lieu de retomber sur le formulaire de
 * connexion. C'est la réponse au « je dois me reconnecter à chaque fois » : la
 * session était valide, mais la racine renvoyait systématiquement vers /signin.
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
  const { data: { user } } = await supabase.auth.getUser();

  const chemin = request.nextUrl.pathname;
  if (ENTREES.includes(chemin)) {
    const cible = user ? "/homePage" : "/signin";
    if (chemin !== cible) return redirigerVers(cible, request, response);
  }

  return response;
}

/**
 * Redirection qui conserve les cookies posés plus haut : sans ce report, la session
 * fraîchement rafraîchie serait perdue et l'utilisatrice se retrouverait déconnectée
 * une requête plus tard — exactement le symptôme qu'on cherche à supprimer.
 */
function redirigerVers(chemin: string, request: NextRequest, response: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = chemin;
  url.search = "";
  const redirection = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirection.cookies.set(cookie));
  return redirection;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques, images et le manifest.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|apple-touch-icon|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
};
