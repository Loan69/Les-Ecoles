import type { SupabaseClient } from "@supabase/supabase-js";

// Journal d'audit des corrections d'intendance sur les inscriptions repas.
// Voir supabase/meal-audit-log.sql. Best-effort : ne fait jamais échouer l'action métier.

async function nameOfUser(supabase: SupabaseClient, userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data: r } = await supabase.from("residentes").select("prenom, nom").eq("user_id", userId).maybeSingle();
  if (r) return `${r.prenom} ${r.nom}`.trim();
  const { data: i } = await supabase.from("invitees").select("prenom, nom").eq("user_id", userId).maybeSingle();
  return i ? `${i.prenom} ${i.nom}`.trim() : null;
}

async function optionLabel(supabase: SupabaseClient, optionId?: string | null): Promise<string | null> {
  if (!optionId) return null;
  const { data } = await supabase.from("meal_options").select("label").eq("id", optionId).maybeSingle();
  return data?.label ?? null;
}

export type MealAuditEntry = {
  action: "presence_set" | "presence_remove" | "guest_add" | "guest_option" | "guest_remove";
  entity: "presence" | "invite";
  targetUserId?: string | null; // résidente concernée (présence)
  guestName?: string | null; // nom de l'invité (snapshot, entité invite)
  dateRepas?: string | null;
  service?: string | null;
  optionBeforeId?: string | null;
  optionAfterId?: string | null;
  details?: Record<string, unknown> | null;
};

export async function logMealEdit(supabase: SupabaseClient, actorId: string | null, e: MealAuditEntry): Promise<void> {
  try {
    const [actor_name, target_name, option_before, option_after] = await Promise.all([
      nameOfUser(supabase, actorId),
      e.entity === "presence" ? nameOfUser(supabase, e.targetUserId) : Promise.resolve(e.guestName ?? null),
      optionLabel(supabase, e.optionBeforeId),
      optionLabel(supabase, e.optionAfterId),
    ]);
    await supabase.from("meal_audit_log").insert({
      actor_user_id: actorId,
      actor_name,
      action: e.action,
      entity: e.entity,
      target_user_id: e.entity === "presence" ? e.targetUserId ?? null : null,
      target_name,
      date_repas: e.dateRepas ?? null,
      service: e.service ?? null,
      option_before,
      option_after,
      details: e.details ?? null,
    });
  } catch (err) {
    console.error("meal_audit_log insert failed:", err);
  }
}
