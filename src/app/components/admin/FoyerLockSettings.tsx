"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/providers";
import { toast } from "sonner";
import { Save, Clock } from "lucide-react";
import { useMyRights } from "@/lib/useMyRights";
import { HEURE_VERROU_FOYER_DEFAUT } from "@/lib/foyerLock";

// Réglage de l'heure limite pour modifier la présence au foyer.
// Regroupé ici (vue Présence) plutôt que dans un onglet Paramètres séparé.
export default function FoyerLockSettings() {
  const { supabase } = useSupabase();
  const canEdit = useMyRights().canEdit("absences");
  const [lockTime, setLockTime] = useState(HEURE_VERROU_FOYER_DEFAUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "verrouillage_foyer").maybeSingle();
      if (data?.value) setLockTime(data.value);
      setLoading(false);
    })();
  }, [supabase]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      [{ key: "verrouillage_foyer", value: lockTime, label: "Heure limite pour modifier la présence au foyer" }],
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Heure de verrouillage enregistrée.");
  };

  if (loading) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" /> Verrouillage des présences
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Heure limite pour modifier sa présence</label>
          <input
            type="time"
            value={lockTime}
            disabled={!canEdit}
            onChange={(e) => setLockTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">
            Passé cette heure, une résidente ne peut plus déclarer, modifier ni supprimer une absence
            <strong> pour la nuit même</strong> — les jours suivants restent libres. L&apos;intendance,
            elle, garde la main via « Ajouter une absence ».
          </p>
        </div>
        {canEdit && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
      </div>
    </section>
  );
}
