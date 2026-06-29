import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role, pk, setTo } = body;

    if (role !== "résidente" || typeof setTo !== "boolean" || !pk) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: currentRes, error: resErr } = await supabase
      .from("residentes")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (resErr || !currentRes?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!setTo && pk === user.id) {
      return NextResponse.json({ error: "Impossible de se révoquer soi-même" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("residentes")
      .update({ is_admin: setTo })
      .eq("user_id", pk);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
