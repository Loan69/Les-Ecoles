import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const supabase = createServerComponentClient({ cookies: () => cookies() });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
    const id = parseInt(params.id, 10);
    const { error } = await supabase.from("repas_options").delete().eq("id", id);
  
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}