"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, DoorClosed, Briefcase, UserCheck, Mail, Save, RefreshCw, X, ArrowLeftRight, LogOut } from "lucide-react";
import { PlaceWithStatus, PlaceKind } from "@/types/Place";
import { formatEtage, formatChambre } from "@/lib/adminPeople";
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
  name: string;
};

const EMPTY_FORM: Form = { open: false, editingId: null, residence: "12", kind: "chambre", etage: "", name: "" };

// Nom affiché d'une place (le code interne n'est jamais montré).
function placeName(p: PlaceWithStatus): string {
  return p.label || formatChambre(p.code) || p.code;
}

// Numéro d'étage « propre » pour la saisie (r12_etage4 / etage_2 / 4 -> "4" / "2" / "4").
function etageNumber(etage?: string | null): string {
  if (!etage) return "";
  const m = etage.match(/(?:etage|étage|et)[ _-]?(\d+)/i);
  if (m) return m[1];
  if (/^\d+$/.test(etage.trim())) return etage.trim();
  return etage;
}

export default function PlacesManager() {
  const [places, setPlaces] = useState<PlaceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [inviteFor, setInviteFor] = useState<PlaceWithStatus | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [moveFor, setMoveFor] = useState<PlaceWithStatus | null>(null);

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
    setForm({ open: true, editingId: p.id, residence: p.residence, kind: p.kind, etage: etageNumber(p.etage), name: placeName(p) });

  const save = async () => {
    if (!form.name.trim()) {
      toast.error(form.kind === "poste" ? "Le nom du poste est requis." : "Le nom de la chambre est requis.");
      return;
    }
    if (form.kind === "chambre" && !form.etage.trim()) {
      toast.error("L'étage est requis.");
      return;
    }
    setSaving(true);
    const payload = { residence: form.residence, kind: form.kind, etage: form.kind === "chambre" ? form.etage : null, name: form.name };
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

  const sendInvite = async () => {
    if (!inviteFor) return;
    if (!inviteEmail.trim()) {
      toast.error("Email requis.");
      return;
    }
    setInviting(true);
    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: inviteFor.id, email: inviteEmail }),
    });
    const j = await res.json();
    setInviting(false);
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success(j.reassigned ? "Compte existant réactivé et réassigné (sans nouvel email)." : "Invitation envoyée par email.");
    setInviteFor(null);
    setInviteEmail("");
    await load();
  };

  const resendInvite = async (p: PlaceWithStatus) => {
    const res = await fetch("/api/admin/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: p.id }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success("Invitation renvoyée.");
    await load();
  };

  const cancelInvite = (p: PlaceWithStatus) => {
    toast(`Annuler l'invitation de ${p.invitation?.email} ?`, {
      action: {
        label: "Annuler l'invitation",
        onClick: async () => {
          const res = await fetch("/api/admin/invitations", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ place_id: p.id }),
          });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Invitation annulée.");
          await load();
        },
      },
    });
  };

  const archiveOccupant = (p: PlaceWithStatus) => {
    if (!p.occupant) return;
    toast(`Libérer la place de ${p.occupant.prenom} ${p.occupant.nom} ? Son compte sera archivé (historique conservé).`, {
      action: {
        label: "Libérer / Archiver",
        onClick: async () => {
          const res = await fetch("/api/admin/residentes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: p.occupant!.user_id }),
          });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Place libérée, compte archivé.");
          await load();
        },
      },
    });
  };

  const doMove = async (targetId: string) => {
    if (!moveFor?.occupant) return;
    const res = await fetch("/api/admin/residentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: moveFor.occupant.user_id, place_id: targetId }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success("Résidente déplacée.");
    setMoveFor(null);
    await load();
  };

  const remove = (p: PlaceWithStatus) => {
    toast(`Supprimer « ${placeName(p)} » ?`, {
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {RESIDENCES.map((r) => {
        const rPlaces = places.filter((p) => p.residence === r.value);
        return (
          <section key={r.value} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base sm:text-lg font-bold text-blue-800 flex items-center gap-2 min-w-0">
                {r.kind === "poste" ? <Briefcase className="w-5 h-5 text-amber-600 shrink-0" /> : <DoorClosed className="w-5 h-5 text-blue-600 shrink-0" />}
                <span className="truncate">{r.label}</span>
                <span className="text-xs sm:text-sm font-normal text-gray-400 shrink-0">· {rPlaces.length}</span>
              </h2>
              <button onClick={() => openCreate(r.value, r.kind)} className="self-start sm:self-auto shrink-0 flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-800 cursor-pointer whitespace-nowrap">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {rPlaces.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune {r.kind === "poste" ? "place" : "chambre"} pour le moment.</p>
            ) : (
              <PlaceGroups
                places={rPlaces}
                isPoste={r.kind === "poste"}
                onEdit={openEdit}
                onToggle={toggleActive}
                onDelete={remove}
                onInvite={(p) => { setInviteEmail(""); setInviteFor(p); }}
                onResend={resendInvite}
                onCancelInvite={cancelInvite}
                onArchive={archiveOccupant}
                onMove={(p) => setMoveFor(p)}
              />
            )}
          </section>
        );
      })}

      {form.open && <PlaceModal form={form} setForm={setForm} onSave={save} saving={saving} />}
      {inviteFor && (
        <InviteModal
          place={inviteFor}
          email={inviteEmail}
          setEmail={setInviteEmail}
          onClose={() => setInviteFor(null)}
          onSend={sendInvite}
          sending={inviting}
        />
      )}
      {moveFor && (
        <MoveModal
          place={moveFor}
          freePlaces={places.filter((p) => p.is_active && !p.occupant && !p.invitation && p.id !== moveFor.id)}
          onClose={() => setMoveFor(null)}
          onMove={doMove}
        />
      )}
    </div>
  );
}

// --- Groupement par étage (chambres) ou liste plate (postes) ---
type RowActions = {
  onEdit: (p: PlaceWithStatus) => void;
  onToggle: (p: PlaceWithStatus) => void;
  onDelete: (p: PlaceWithStatus) => void;
  onInvite: (p: PlaceWithStatus) => void;
  onResend: (p: PlaceWithStatus) => void;
  onCancelInvite: (p: PlaceWithStatus) => void;
  onArchive: (p: PlaceWithStatus) => void;
  onMove: (p: PlaceWithStatus) => void;
};

function PlaceGroups({ places, isPoste, ...actions }: { places: PlaceWithStatus[]; isPoste: boolean } & RowActions) {
  const groups = useMemo(() => {
    if (isPoste) return [{ label: null as string | null, items: places }];
    // Clé = étage normalisé (« Étage 4 ») → fusionne r12_etage4, etage_4, 4…
    const byEtage = new Map<string, PlaceWithStatus[]>();
    for (const p of places) {
      const key = formatEtage(p.etage) ?? "Étage ?";
      if (!byEtage.has(key)) byEtage.set(key, []);
      byEtage.get(key)!.push(p);
    }
    return [...byEtage.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr", { numeric: true })).map(([label, items]) => ({ label, items }));
  }, [places, isPoste]);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label ?? "postes"}>
          {!isPoste && <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{g.label}</p>}
          <div className="grid gap-2">
            {g.items.map((p) => (
              <PlaceRow key={p.id} p={p} {...actions} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceRow({ p, onEdit, onToggle, onDelete, onInvite, onResend, onCancelInvite, onArchive, onMove }: { p: PlaceWithStatus } & RowActions) {
  const free = p.is_active && !p.occupant && !p.invitation;
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border px-4 py-3 ${p.is_active ? "border-gray-100 bg-white" : "border-gray-200 bg-gray-50 opacity-70"}`}>
      <div className="min-w-0">
        <p className="font-medium text-gray-800 truncate">{placeName(p)}</p>
        <StatusBadge p={p} />
      </div>
      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
        {free && (
          <button onClick={() => onInvite(p)} className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-800 cursor-pointer" title="Inviter une résidente">
            <Mail className="w-4 h-4" /> Inviter
          </button>
        )}
        {p.invitation && (
          <>
            <button onClick={() => onResend(p)} className="p-2 rounded-full text-amber-600 hover:bg-amber-50 cursor-pointer" title="Renvoyer l'invitation">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => onCancelInvite(p)} className="p-2 rounded-full text-red-600 hover:bg-red-50 cursor-pointer" title="Annuler l'invitation">
              <X className="w-4 h-4" />
            </button>
          </>
        )}
        {p.occupant && (
          <>
            <button onClick={() => onMove(p)} className="p-2 rounded-full text-blue-600 hover:bg-blue-50 cursor-pointer" title="Déplacer vers une autre place">
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <button onClick={() => onArchive(p)} className="p-2 rounded-full text-orange-600 hover:bg-orange-50 cursor-pointer" title="Libérer la place (archiver)">
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
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

// --- Modale d'invitation ---
function InviteModal({
  place,
  email,
  setEmail,
  onClose,
  onSend,
  sending,
}: {
  place: PlaceWithStatus;
  email: string;
  setEmail: (v: string) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-1 flex items-center gap-2">
          <Mail className="w-5 h-5" /> Inviter une résidente
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {place.kind === "poste" ? "Poste" : "Chambre"} <span className="font-medium">{placeName(place)}</span> — résidence {place.residence}. Un email d&apos;activation lui sera envoyé (si elle a déjà un compte, il sera réactivé et réassigné, sans nouvel email).
        </p>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !sending && onSend()}
          placeholder="email@exemple.fr"
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
          <button onClick={onSend} disabled={sending} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
            <Mail className="w-4 h-4" /> {sending ? "Envoi…" : "Envoyer l'invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Modale de déplacement (choisir une place libre) ---
function MoveModal({
  place,
  freePlaces,
  onClose,
  onMove,
}: {
  place: PlaceWithStatus;
  freePlaces: PlaceWithStatus[];
  onClose: () => void;
  onMove: (targetId: string) => void;
}) {
  const [target, setTarget] = useState("");
  const optionLabel = (p: PlaceWithStatus) =>
    p.kind === "poste" ? `Corail · ${placeName(p)}` : `Rés. ${p.residence} · ${formatEtage(p.etage) ?? "?"} · ${placeName(p)}`;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-1 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5" /> Déplacer {place.occupant?.prenom} {place.occupant?.nom}
        </h3>
        <p className="text-sm text-gray-500 mb-4">Depuis <span className="font-medium">{placeName(place)}</span> vers une place libre :</p>
        {freePlaces.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucune place libre disponible.</p>
        ) : (
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none">
            <option value="">Choisir une place…</option>
            {freePlaces.map((p) => (
              <option key={p.id} value={p.id}>{optionLabel(p)}</option>
            ))}
          </select>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
          <button onClick={() => target && onMove(target)} disabled={!target} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
            <ArrowLeftRight className="w-4 h-4" /> Déplacer
          </button>
        </div>
      </div>
    </div>
  );
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
                placeholder="Ex : 2"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isPoste ? "Nom du poste" : "Nom de la chambre"}</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && !saving && onSave()}
              placeholder={isPoste ? "Ex : Cuisine, Ménage…" : "Ex : Grand Palais"}
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
