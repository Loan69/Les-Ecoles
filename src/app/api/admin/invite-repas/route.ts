import { NextResponse } from "next/server";
import { requireAdminEdit } from "@/lib/apiAuth";
import { logMealEdit } from "@/lib/mealAudit";
import type { SupabaseClient } from "@supabase/supabase-js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Résout / crée l'invité du carnet, renvoie son id.
async function resolveGuest(supabase: SupabaseClient, nom: string, prenom: string) {
  const { data, error } = await supabase
    .from("invites")
    .upsert([{ nom, prenom, is_active: true }], { onConflict: "nom, prenom" })
    .select("id")
    .single();
  return { id: data?.id as number | undefined, error: error?.message ?? null };
}

// --- Créer une invitation repas au nom d'une résidente (admin édition) ---
export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAdminEdit();
  if (error) return error;

  const body = await req.json();
  const { nom, prenom, invite_par, date, service, option_id } = body as {
    nom?: string; prenom?: string; invite_par?: string; date?: string; service?: string; option_id?: string;
  };
  const nomV = (nom ?? "").trim();
  const prenomV = (prenom ?? "").trim();
  if (!nomV && !prenomV) return NextResponse.json({ error: "Nom ou prénom requis." }, { status: 400 });
  if (!invite_par) return NextResponse.json({ error: "Résidente qui invite requise." }, { status: 400 });
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (service !== "dejeuner" && service !== "diner") return NextResponse.json({ error: "Service invalide." }, { status: 400 });
  if (!option_id) return NextResponse.json({ error: "Option requise." }, { status: 400 });

  const { data: profil } = await supabase.from("residentes").select("residence").eq("user_id", invite_par).maybeSingle();
  const g = await resolveGuest(supabase, nomV, prenomV);
  if (g.error || !g.id) return NextResponse.json({ error: g.error ?? "Invité introuvable." }, { status: 500 });

  const { error: insErr } = await supabase.from("invites_repas").insert({
    nom: nomV,
    prenom: prenomV,
    date_repas: date,
    type_repas: service,
    option_id,
    compta_residence: profil?.residence ?? null,
    invite_par,
    id_invite: g.id,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  await logMealEdit(supabase, userId, {
    action: "guest_add", entity: "invite", guestName: `${nomV} ${prenomV}`.trim(),
    dateRepas: date, service, optionBeforeId: null, optionAfterId: option_id,
    details: { invite_par },
  });
  return NextResponse.json({ success: true });
}

// --- Changer l'option d'une invitation (option_id null = retirer) — admin édition ---
export async function PUT(req: Request) {
  const { supabase, userId, error } = await requireAdminEdit();
  if (error) return error;

  const { id, option_id } = (await req.json()) as { id?: number; option_id?: string | null };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  // État avant modification (pour le journal).
  const { data: prev } = await supabase.from("invites_repas").select("nom, prenom, date_repas, type_repas, option_id, invite_par").eq("id", id).maybeSingle();
  const guestName = prev ? `${prev.nom ?? ""} ${prev.prenom ?? ""}`.trim() : null;

  if (!option_id) {
    const { error: delErr } = await supabase.from("invites_repas").delete().eq("id", id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    await logMealEdit(supabase, userId, {
      action: "guest_remove", entity: "invite", guestName,
      dateRepas: prev?.date_repas ?? null, service: prev?.type_repas ?? null,
      optionBeforeId: prev?.option_id ?? null, optionAfterId: null, details: { invite_par: prev?.invite_par },
    });
    return NextResponse.json({ success: true });
  }

  const { error: upErr } = await supabase.from("invites_repas").update({ option_id }).eq("id", id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logMealEdit(supabase, userId, {
    action: "guest_option", entity: "invite", guestName,
    dateRepas: prev?.date_repas ?? null, service: prev?.type_repas ?? null,
    optionBeforeId: prev?.option_id ?? null, optionAfterId: option_id, details: { invite_par: prev?.invite_par },
  });
  return NextResponse.json({ success: true });
}

// --- Supprimer une invitation — admin édition ---
export async function DELETE(req: Request) {
  const { supabase, userId, error } = await requireAdminEdit();
  if (error) return error;

  const { id } = (await req.json()) as { id?: number };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  const { data: prev } = await supabase.from("invites_repas").select("nom, prenom, date_repas, type_repas, option_id, invite_par").eq("id", id).maybeSingle();
  const { error: delErr } = await supabase.from("invites_repas").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  await logMealEdit(supabase, userId, {
    action: "guest_remove", entity: "invite", guestName: prev ? `${prev.nom ?? ""} ${prev.prenom ?? ""}`.trim() : null,
    dateRepas: prev?.date_repas ?? null, service: prev?.type_repas ?? null,
    optionBeforeId: prev?.option_id ?? null, optionAfterId: null, details: { invite_par: prev?.invite_par },
  });
  return NextResponse.json({ success: true });
}
