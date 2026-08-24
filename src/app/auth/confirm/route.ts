import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { foyerParHost } from "@/lib/foyers";

// Vérifie le jeton d'un lien email (invitation, recovery…) côté serveur et pose
// la session en cookie, puis redirige. Approche recommandée pour @supabase/ssr :
// évite le traitement des jetons côté navigateur (qui échoue en flux PKCE).
//
// ⚠️ La base est celle du foyer de la requête, résolue d'après le nom d'hôte.
// Cette route construit son client elle-même (elle n'utilise pas createSupabaseServer,
// n'ayant pas encore de session à lire) : elle avait donc été oubliée lors du passage
// au multi-foyer, et vérifiait tous les jetons contre la base du foyer par défaut —
// d'où un « lien expiré » systématique sur tout autre foyer.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = request.nextUrl.origin;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/activation";

  const fail = (raison: string) => {
    console.error(`[auth/confirm] échec (${raison}) · hôte=${request.headers.get("host")} · type=${type}`);
    return NextResponse.redirect(`${origin}/activation?error=expire`);
  };
  if (!token_hash || !type) return fail("paramètres manquants");

  const foyer = foyerParHost(request.headers.get("host"));
  const cookieStore = await cookies();
  const supabase = createServerClient(foyer.url, foyer.anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) return fail(error.message);

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/" + next}`);
}
