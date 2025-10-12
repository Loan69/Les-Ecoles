import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // clé Service Role
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    // on interroge directement auth.users côté serveur
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ exists: false, error: error.message });
    }

    const exists = users.some((user) => user.email?.toLowerCase() === email.toLowerCase());

    return NextResponse.json({ exists });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ exists: false, error: 'Erreur serveur' });
  }
}
