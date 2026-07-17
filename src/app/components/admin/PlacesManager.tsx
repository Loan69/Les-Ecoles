"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, DoorClosed, Briefcase, UserCheck, Mail, Save } from "lucide-react";
import { PlaceWithStatus, PlaceKind } from "@/types/Place";
import { formatEtage } from "@/lib/adminPeople";
import LoadingSpinner from "../LoadingSpinner";

const RESIDENCES: { value: string; label: string; kind: PlaceKind }[] = [
  { value: "12", label: "Résidence 12", kind: "chambre" },
  { value: "36", label: "Résidence 36", kind: "chambre" },
  { value: "corail", label: "Corail (prestataires)", kind: "poste" },
];

type Form = {
  open: boolean;
  editingId: string | null;
  residence: string;
  kind: PlaceKind;
  etage: string;
  code: string;
  label: string;
};

const EMPTY_FORM: Form = { open: false, editingId: null, residence: "12", kind: "chambre", etage: "", code: "", label: "" };

export default function PlacesManager() {
  const [places, setPlaces] = useState<PlaceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/places");
    const j = await res.json();
    if (res.ok) setPlaces(j.places ?? []);
    else toast.error(j.error || "Erreur de chargement.");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (residence: string, kind: PlaceKind) =>
    setForm({ ...EMPTY_FORM, open: true, residence, kind });

  const openEdit = (p: PlaceWithStatus) =>
    setForm({ open: true, editingId: p.id, residence: p.residence, kind: p.kind, etage: p.etage ?? "", code: p.code, label: p.label ?? "" });

  const save = async () => {
    if (!form.code.trim()) {
      toast.error(form.kind === "poste" ? "Le libellé du poste est requis." : "Le code de la chambre est requis.");
      return;
    }
    if (form.kind === "chambre" && !form.etage.trim()) {
      toast.error("L'étage est requis.");
      return;
    }
    setSaving(true);
    const payload = { residence: form.residence, kind: form.kind, etage: form.kind === "chambre" ? form.etage : null, code: form.code, label: form.label };
    const res = await fetch("/api/admin/places", {
      method: form.editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.editingId ? { id: form.editingId, ...payload } : payload),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success(form.editingId ? "Place modifiée." : "Place ajoutée.");
    setForm(EMPTY_FORM);
    await load();
  };

  const toggleActive = async (p: PlaceWithStatus) => {
    const res = await fetch("/api/admin/places", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success(p.is_active ? "Place désactivée." : "Place réactivée.");
    await load();
  };

  const remove = (p: PlaceWithStatus) => {
    toast(`Supprimer « ${p.label || p.code} » ?`, {
      action: {
        label: "Supprimer",
        onClick: async () => {
          const res = await fetch("/api/admin/places", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: p.id }),
          });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Place supprimée.");
          await load();
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {RESIDENCES.map((r) => {
        const rPlaces = places.filter((p) => p.residence === r.value);
        return (
          <section key={r.value} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                {r.kind === "poste" ? <Briefcase className="w-5 h-5 text-amber-600" /> : <DoorClosed className="w-5 h-5 text-blue-600" />}
                {r.label}
                <span className="text-sm font-normal text-gray-400">
                  ({rPlaces.length} {r.kind === "poste" ? "poste(s)" : "chambre(s)"})
                </span>
              </h2>
              <button onClick={() => openCreate(r.value, r.kind)} className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-800 cursor-pointer">
                <Plus className="w-4 h-4" /> {r.kind === "poste" ? "Ajouter un poste" : "Ajouter une chambre"}
              </button>
            </div>

            {rPlaces.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune {r.kind === "poste" ? "place" : "chambre"} pour le moment.</p>
            ) : (
              <PlaceGroups places={rPlaces} isPoste={r.kind === "poste"} onEdit={openEdit} onToggle={toggleActive} onDelete={remove} />
            )}
          </section>
        );
      })}

      {form.open && <PlaceModal form={form} setForm={setForm} onSave={save} saving={saving} />}
    </div>
  );
}

// --- Groupement par étage (chambres) ou liste plate (postes) ---
function PlaceGroups({
  places,
  isPoste,
  onEdit,
  onToggle,
  onDelete,
}: {
  places: PlaceWithStatus[];
  isPoste: boolean;
  onEdit: (p: PlaceWithStatus) => void;
  onToggle: (p: PlaceWithStatus) => void;
  onDelete: (p: PlaceWithStatus) => void;
}) {
  const groups = useMemo(() => {
    if (isPoste) return [{ etage: null as string | null, items: places }];
    const byEtage = new Map<string, PlaceWithStatus[]>();
    for (const p of places) {
      const key = p.etage ?? "—";
      if (!byEtage.has(key)) byEtage.set(key, []);
      byEtage.get(key)!.push(p);
    }
    return [...byEtage.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr", { numeric: true })).map(([etage, items]) => ({ etage, items }));
  }, [places, isPoste]);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.etage ?? "postes"}>
          {!isPoste && <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{formatEtage(g.etage) ?? "Étage ?"}</p>}
          <div className="grid gap-2">
            {g.items.map((p) => (
              <PlaceRow key={p.id} p={p} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceRow({
  p,
  onEdit,
  onToggle,
  onDelete,
}: {
  p: PlaceWithStatus;
  onEdit: (p: PlaceWithStatus) => void;
  onToggle: (p: PlaceWithStatus) => void;
  onDelete: (p: PlaceWithStatus) => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${p.is_active ? "border-gray-100 bg-white" : "border-gray-200 bg-gray-50 opacity-70"}`}>
      <div className="min-w-0">
        <p className="font-medium text-gray-800 truncate">{p.label || p.code}</p>
        <StatusBadge p={p} />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(p)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer" title="Modifier">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onToggle(p)} className={`p-2 rounded-full cursor-pointer ${p.is_active ? "text-gray-500 hover:bg-gray-100" : "text-green-600 hover:bg-green-50"}`} title={p.is_active ? "Désactiver" : "Réactiver"}>
          <Power className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(p)} className="p-2 rounded-full text-red-600 hover:bg-red-50 cursor-pointer" title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ p }: { p: PlaceWithStatus }) {
  if (!p.is_active) return <span className="text-xs text-gray-400">Désactivée</span>;
  if (p.occupant)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700">
        <UserCheck className="w-3.5 h-3.5" /> Occupée · {p.occupant.prenom} {p.occupant.nom}
      </span>
    );
  if (p.invitation)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700">
        <Mail className="w-3.5 h-3.5" /> Invitation envoyée · {p.invitation.email}
      </span>
    );
  return <span className="text-xs text-blue-500">Libre</span>;
}

// --- Modale création / édition ---
function PlaceModal({ form, setForm, onSave, saving }: { form: Form; setForm: (f: Form) => void; onSave: () => void; saving: boolean }) {
  const isPoste = form.kind === "poste";
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          {form.editingId ? "Modifier" : "Ajouter"} {isPoste ? "un poste" : "une chambre"} — {RESIDENCES.find((r) => r.value === form.residence)?.label}
        </h3>
        <div className="space-y-4">
          {!isPoste && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Étage</label>
              <input
                value={form.etage}
                onChange={(e) => setForm({ ...form, etage: e.target.value })}
                placeholder="Ex : 2 (ou etage_2)"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isPoste ? "Libellé du poste" : "Code de la chambre"}</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder={isPoste ? "Ex : Cuisine, Ménage…" : "Ex : grand_palais"}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé affiché <span className="text-gray-400">(optionnel)</span></label>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder={isPoste ? "Sinon = le libellé du poste" : "Ex : Grand Palais"}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setForm({ ...form, open: false })} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
            <Save className="w-4 h-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
