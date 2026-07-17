import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Vérifie le jeton d'un lien email (invitation, recovery…) côté serveur et pose
// la session en cookie, puis redirige. Approche recommandée pour @supabase/ssr :
// évite le traitement des jetons côté navigateur (qui échoue en flux PKCE).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/activation";

  const fail = () => NextResponse.redirect(`${origin}/activation?error=expire`);
  if (!token_hash || !type) return fail();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) return fail();

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/" + next}`);
}
