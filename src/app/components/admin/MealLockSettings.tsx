"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/providers";
import { toast } from "sonner";
import { Save, Clock } from "lucide-react";
import { useMyRights } from "@/lib/useMyRights";
import {
  JOURS_SEMAINE,
  JOUR_LABEL,
  joursAnticipes,
  serialiseJoursAnticipes,
  type JourSemaine,
} from "@/lib/lockUtils";

// Réglages de verrouillage des repas — regroupés ici (paramétrage repas) plutôt
// que dans Administration → Paramètres, pour n'avoir qu'un seul endroit.
export default function MealLockSettings() {
  const { supabase } = useSupabase();
  const canEdit = useMyRights().canEdit("repas");
  const [lockTime, setLockTime] = useState("21:00");
  const [jours, setJours] = useState<Set<JourSemaine>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["verrouillage_repas", "verrouillage_jours_anticipes", "verrouillage_weekend"]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((s) => (map[s.key] = s.value));
      if (map.verrouillage_repas) setLockTime(map.verrouillage_repas);
      // `joursAnticipes` retombe sur l'ancien booléen `verrouillage_weekend` tant que la
      // migration n'est pas jouée : l'écran affiche alors samedi + dimanche cochés, et le
      // premier enregistrement écrit la nouvelle clé.
      setJours(joursAnticipes(map));
      setLoading(false);
    })();
  }, [supabase]);

  const toggleJour = (j: JourSemaine) =>
    setJours((prev) => {
      const next = new Set(prev);
      if (next.has(j)) next.delete(j);
      else next.add(j);
      return next;
    });

  const save = async () => {
    // Les sept jours fermés d'avance verrouilleraient les repas en permanence : aucune série
    // n'a plus de veille où s'ouvrir. On refuse plutôt que de laisser l'intendance découvrir
    // une application muette.
    if (jours.size === 7) {
      return toast.error(
        "Impossible de fermer d'avance les sept jours : plus aucun repas ne serait modifiable. Laissez-en au moins un ouvert."
      );
    }
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      [
        { key: "verrouillage_repas", value: lockTime, label: "Heure après laquelle les repas du jour ne sont plus modifiables" },
        {
          key: "verrouillage_jours_anticipes",
          value: serialiseJoursAnticipes(jours),
          label: "Jours dont les repas sont verrouillés dès la veille de leur série",
        },
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
      <div className="grid gap-5 sm:grid-cols-2">
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
        <div>
          <span className="block text-sm font-medium text-gray-600 mb-1">Jours fermés d’avance</span>
          <div className="flex flex-wrap gap-1.5">
            {JOURS_SEMAINE.map((j) => {
              const actif = jours.has(j);
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => toggleJour(j)}
                  disabled={!canEdit}
                  aria-pressed={actif}
                  title={JOUR_LABEL[j]}
                  className={`w-10 h-9 rounded-lg border text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    actif
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {JOUR_LABEL[j].slice(0, 3)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {descriptionJours(jours, lockTime)}
          </p>
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

// Phrase de contrôle : l'intendance doit lire l'effet de ses cases sans avoir à le déduire.
// Des jours cochés qui se suivent forment UNE série, fermée dès la veille du premier — c'est
// ce qui fait que samedi + dimanche se ferment tous deux le vendredi, comme avant.
function descriptionJours(jours: Set<JourSemaine>, lockTime: string): string {
  if (jours.size === 0) return "Aucun : chaque jour se ferme le jour même à l’heure de clôture.";
  if (jours.size === 7) return "Les sept jours ne peuvent pas être fermés d’avance : laissez-en un ouvert.";

  const veilleDe = (j: JourSemaine): JourSemaine => {
    let cur = j;
    while (jours.has(cur)) cur = ((cur + 6) % 7) as JourSemaine;
    return cur;
  };

  const phrases = JOURS_SEMAINE.filter((j) => jours.has(j)).map(
    (j) => `${JOUR_LABEL[j].toLowerCase()} dès le ${JOUR_LABEL[veilleDe(j)].toLowerCase()} ${lockTime}`
  );
  return `Fermés d’avance : ${phrases.join(" ; ")}.`;
}
