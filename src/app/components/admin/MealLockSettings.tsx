"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/providers";
import { toast } from "sonner";
import { Save, Clock } from "lucide-react";
import { useMyRights } from "@/lib/useMyRights";

// Réglages de verrouillage des repas — regroupés ici (paramétrage repas) plutôt
// que dans Administration → Paramètres, pour n'avoir qu'un seul endroit.
export default function MealLockSettings() {
  const { supabase } = useSupabase();
  const { canEdit } = useMyRights();
  const [lockTime, setLockTime] = useState("21:00");
  const [weekend, setWeekend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["verrouillage_repas", "verrouillage_weekend"]);
      (data ?? []).forEach((s) => {
        if (s.key === "verrouillage_repas") setLockTime(s.value || "21:00");
        if (s.key === "verrouillage_weekend") setWeekend(s.value === "true");
      });
      setLoading(false);
    })();
  }, [supabase]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      [
        { key: "verrouillage_repas", value: lockTime, label: "Heure après laquelle les repas du jour ne sont plus modifiables" },
        { key: "verrouillage_weekend", value: weekend ? "true" : "false", label: "Verrouille les repas du week-end dès le vendredi" },
      ],
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Verrouillage enregistré.");
  };

  if (loading) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" /> Verrouillage des inscriptions
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Heure de clôture (le jour même)</label>
          <input
            type="time"
            value={lockTime}
            disabled={!canEdit}
            onChange={(e) => setLockTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">Passé cette heure, les repas du jour ne sont plus modifiables.</p>
        </div>
        <div className="flex items-start sm:items-center">
          <label className="flex items-center gap-2 cursor-pointer sm:mt-6">
            <input type="checkbox" checked={weekend} disabled={!canEdit} onChange={(e) => setWeekend(e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer disabled:opacity-50" />
            <span className="text-sm text-gray-700">Verrouiller le week-end dès le vendredi</span>
          </label>
        </div>
      </div>
      {canEdit && (
        <div className="flex justify-end mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
    </section>
  );
}
