"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, DoorClosed, Briefcase, UserCheck, Mail, Save, RefreshCw, X, ArrowLeftRight, LogOut, SlidersHorizontal, ShieldCheck, ChevronDown, Archive, Settings } from "lucide-react";
import { PlaceWithStatus, PlaceKind } from "@/types/Place";
import { formatEtage, formatChambre } from "@/lib/adminPeople";
import { SECTIONS, SECTION_LABEL, SECTION_AIDE, NIVEAU_LABEL, NIV, niveauxPourSection, asNiveauSection, hasAnyAdmin, type Rights, type Section } from "@/lib/roles";
import LoadingSpinner from "../LoadingSpinner";
import { useMyRights } from "@/lib/useMyRights";

const RESIDENCES: { value: string; label: string; kind: PlaceKind }[] = [
  { value: "12", label: "Résidence 12", kind: "chambre" },
  { value: "36", label: "Résidence 36", kind: "chambre" },
  { value: "corail", label: "Corail (Intendance)", kind: "poste" },
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

type ArchivedAccount = { user_id: string; nom: string; prenom: string; email: string; rights: Rights };
type UserRights = { rights: Rights; source_pk: string; name: string; email: string | null };

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

// Résumé compact des droits d'une résidente.
function RightsSummary({ r }: { r: Rights }) {
  if (r.is_super_admin) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800"><ShieldCheck className="w-3 h-3" /> Super-admin</span>;
  }
  const actives = SECTIONS.filter((s) => r[s] >= NIV.LECTURE);
  // Sections masquées (niveau 0) : à signaler aussi, c'est une restriction, pas un droit.
  const masquees = SECTIONS.filter((s) => r[s] === NIV.AUCUN);
  if (actives.length === 0 && masquees.length === 0) return <span className="text-[11px] text-gray-400">Résidente</span>;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {actives.map((s) => (
        <span key={s} className={`text-[11px] rounded px-1.5 py-0.5 whitespace-nowrap ${r[s] >= 3 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
          {SECTION_LABEL[s]} : {NIVEAU_LABEL[asNiveauSection(r[s])]}
        </span>
      ))}
      {masquees.map((s) => (
        <span key={s} title="Section masquée pour cette personne" className="text-[11px] rounded px-1.5 py-0.5 whitespace-nowrap bg-red-50 text-red-700 line-through">
          {SECTION_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

export default function PlacesManager({ currentUserId }: { currentUserId: string }) {
  const canEdit = useMyRights().canEdit("comptes");
  const [places, setPlaces] = useState<PlaceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [inviteFor, setInviteFor] = useState<PlaceWithStatus | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [moveFor, setMoveFor] = useState<PlaceWithStatus | null>(null);
  const [archived, setArchived] = useState<ArchivedAccount[]>([]);
  const [rightsMap, setRightsMap] = useState<Record<string, UserRights>>({});
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [isTechnique, setIsTechnique] = useState(false);
  const [assignFor, setAssignFor] = useState<{ uid: string; name: string } | null>(null);
  const [editingRights, setEditingRights] = useState<{ userId: string; name: string; rights: Rights } | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const load = useCallback(async () => {
    const [placesRes, archivedRes, usersRes] = await Promise.all([
      fetch("/api/admin/places"),
      fetch("/api/admin/residentes"),
      fetch("/api/admin/users"),
    ]);
    const j = await placesRes.json();
    if (placesRes.ok) setPlaces(j.places ?? []);
    else toast.error(j.error || "Erreur de chargement.");
    if (archivedRes.ok) setArchived((await archivedRes.json()).archived ?? []);
    if (usersRes.ok) {
      const uj = await usersRes.json();
      const map: Record<string, UserRights> = {};
      for (const u of uj.users ?? []) {
        if (u.role === "résidente" && u.rights) map[u.id] = { rights: u.rights, source_pk: u.source_pk, name: u.name, email: u.email ?? null };
      }
      setRightsMap(map);
      setCanManageRoles(uj.canManageRoles ?? false);
      setIsTechnique(uj.isTechnique ?? false);
    }
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

  const sendInvite = async (resetRights: boolean) => {
    if (!inviteFor) return;
    if (!inviteEmail.trim()) {
      toast.error("Email requis.");
      return;
    }
    setInviting(true);
    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: inviteFor.id, email: inviteEmail, resetRights }),
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
    toast(`Libérer la place de ${p.occupant.prenom} ${p.occupant.nom} ? Son compte sera désactivé (historique conservé).`, {
      action: {
        label: "Libérer / Désactiver",
        onClick: async () => {
          const res = await fetch("/api/admin/residentes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: p.occupant!.user_id }),
          });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Place libérée, compte désactivé.");
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

  // --- Correction d'un compte actif sans chambre (maintenance, compte technique) ---
  const doAssign = async (targetId: string) => {
    if (!assignFor) return;
    const res = await fetch("/api/admin/residentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: assignFor.uid, place_id: targetId }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success("Chambre attribuée.");
    setAssignFor(null);
    await load();
  };

  const deleteUnplaced = (uid: string, name: string) => {
    toast(`Supprimer définitivement le compte de ${name} ?`, {
      description: "Action irréversible.",
      action: {
        label: "Supprimer",
        onClick: async () => {
          const res = await fetch("/api/admin/users/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid }),
          });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Compte supprimé.");
          await load();
        },
      },
      cancel: { label: "Annuler", onClick: () => {} },
    });
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

  const saveRights = async (userId: string, rights: Rights) => {
    const entry = rightsMap[userId];
    if (!entry) return;
    const prev = rightsMap;
    setRightsMap({ ...rightsMap, [userId]: { ...entry, rights } });
    setEditingRights(null);
    const res = await fetch("/api/admin/users/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pk: entry.source_pk, rights }),
    });
    const j = await res.json();
    if (!res.ok) {
      setRightsMap(prev);
      toast.error(j.error || "Erreur.");
      return;
    }
    toast.success("Droits mis à jour.");
  };

  const openRights = (occupant: NonNullable<PlaceWithStatus["occupant"]>) => {
    const entry = rightsMap[occupant.user_id];
    if (!entry) return;
    setEditingRights({ userId: occupant.user_id, name: `${occupant.prenom} ${occupant.nom}`, rights: entry.rights });
  };

  // Résidentes actives sans chambre attribuée (filet de sécurité : on ne perd personne de la vue).
  // On exclut les comptes désactivés (listés à part) : l'API users renvoie aussi les archivées.
  const unplaced = useMemo(() => {
    const occupantIds = new Set(places.map((p) => p.occupant?.user_id).filter(Boolean) as string[]);
    const archivedIds = new Set(archived.map((a) => a.user_id));
    return Object.entries(rightsMap)
      .filter(([uid]) => !occupantIds.has(uid) && !archivedIds.has(uid))
      .map(([uid, ur]) => ({ uid, rights: ur.rights, name: ur.name, email: ur.email }));
  }, [places, rightsMap, archived]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const rowActions: RowActions = {
    canEdit,
    canManageRoles,
    currentUserId,
    rightsMap,
    onEdit: openEdit,
    onToggle: toggleActive,
    onDelete: remove,
    onInvite: (p) => { setInviteEmail(""); setInviteFor(p); },
    onResend: resendInvite,
    onCancelInvite: cancelInvite,
    onArchive: archiveOccupant,
    onMove: (p) => setMoveFor(p),
    onRights: openRights,
  };

  return (
    <div className="space-y-6">
      {/* ================= Liste des utilisatrices (par résidence / étage / chambre) ================= */}
      {RESIDENCES.map((r) => {
        const rPlaces = places.filter((p) => p.residence === r.value && p.is_active);
        if (rPlaces.length === 0) return null;
        return (
          <section key={r.value} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <h2 className="text-base sm:text-lg font-bold text-blue-800 flex items-center gap-2 min-w-0 mb-4">
              {r.kind === "poste" ? <Briefcase className="w-5 h-5 text-amber-600 shrink-0" /> : <DoorClosed className="w-5 h-5 text-blue-600 shrink-0" />}
              <span className="truncate">{r.label}</span>
              <span className="text-xs sm:text-sm font-normal text-gray-400 shrink-0">· {rPlaces.length}</span>
            </h2>
            <PlaceGroups mode="people" places={rPlaces} isPoste={r.kind === "poste"} {...rowActions} />
          </section>
        );
      })}

      {/* Résidentes actives sans chambre — outil de MAINTENANCE, visible du seul compte technique.
          Situation anormale (erreur technique) : ne pas exposer aux administratrices courantes. */}
      {isTechnique && unplaced.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4 sm:p-5">
          <h2 className="text-base font-bold text-amber-700 flex items-center gap-2 mb-1">
            <UserCheck className="w-5 h-5 shrink-0" /> Sans chambre attribuée <span className="text-xs font-normal text-gray-400">· {unplaced.length}</span>
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">Maintenance</span>
          </h2>
          <p className="text-xs text-gray-400 mb-3">Comptes résidente <b>actifs</b> mais rattachés à aucune chambre active — situation anormale (erreur technique). Visible de toi seul. Corrige chaque cas : <b>attribuer une chambre</b> ou <b>supprimer</b> si c&apos;est une coquille.</p>
          <div className="grid gap-2">
            {unplaced.map(({ uid, rights, name, email }) => (
              <div key={uid} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{email || "— sans email —"}</p>
                  <div className="mt-1"><RightsSummary r={rights} /></div>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                  <button onClick={() => setAssignFor({ uid, name })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer text-sm" title="Attribuer une chambre libre">
                    <DoorClosed className="w-4 h-4" /> Attribuer une chambre
                  </button>
                  {uid !== currentUserId && (
                    <button onClick={() => setEditingRights({ userId: uid, name, rights })} className="p-2 rounded-full text-blue-700 hover:bg-blue-50 cursor-pointer" title="Régler les droits">
                      <SlidersHorizontal size={16} />
                    </button>
                  )}
                  {uid !== currentUserId && (
                    <button onClick={() => deleteUnplaced(uid, name)} className="p-2 rounded-full text-red-600 hover:bg-red-50 cursor-pointer" title="Supprimer définitivement">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= Comptes désactivés (repliable) ================= */}
      {archived.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => setArchivedOpen((o) => !o)} className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50">
            <span className="flex items-center gap-2 font-bold text-gray-600"><Archive className="w-5 h-5" /> Comptes désactivés <span className="text-xs font-normal text-gray-400">· {archived.length}</span></span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${archivedOpen ? "rotate-180" : ""}`} />
          </button>
          {archivedOpen && (
            <div className="px-4 sm:px-5 pb-4 space-y-2">
              <p className="text-xs text-gray-400">Ces comptes sont désactivés (connexion bloquée, historique conservé). Pour en réactiver un, utilisez « Inviter » sur une chambre libre et sélectionnez-le.</p>
              {archived.map((a) => (
                <div key={a.user_id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 truncate">{a.nom.toUpperCase()} {a.prenom}</p>
                    <p className="text-xs text-gray-400 truncate">{a.email}</p>
                  </div>
                  <RightsSummary r={a.rights} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= Gérer les chambres & étages (repliable) ================= */}
      {canEdit && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => setStructureOpen((o) => !o)} className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50">
            <span className="flex items-center gap-2 font-bold text-gray-600"><Settings className="w-5 h-5" /> Gérer les chambres & étages</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${structureOpen ? "rotate-180" : ""}`} />
          </button>
          {structureOpen && (
            <div className="px-4 sm:px-5 pb-5 space-y-6">
              <p className="text-xs text-gray-400">Structure physique du foyer : créez, modifiez, désactivez ou supprimez les chambres et postes. Les chambres désactivées n&apos;apparaissent pas dans la liste des utilisatrices.</p>
              {RESIDENCES.map((r) => {
                const rPlaces = places.filter((p) => p.residence === r.value);
                return (
                  <div key={r.value}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 min-w-0">
                        {r.kind === "poste" ? <Briefcase className="w-4 h-4 text-amber-600 shrink-0" /> : <DoorClosed className="w-4 h-4 text-blue-600 shrink-0" />}
                        <span className="truncate">{r.label}</span>
                        <span className="text-xs font-normal text-gray-400 shrink-0">· {rPlaces.length}</span>
                      </h3>
                      <button onClick={() => openCreate(r.value, r.kind)} className="shrink-0 flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-800 cursor-pointer whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Ajouter
                      </button>
                    </div>
                    {rPlaces.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Aucune {r.kind === "poste" ? "place" : "chambre"} pour le moment.</p>
                    ) : (
                      <PlaceGroups mode="structure" places={rPlaces} isPoste={r.kind === "poste"} {...rowActions} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {form.open && <PlaceModal form={form} setForm={setForm} onSave={save} saving={saving} />}
      {inviteFor && (
        <InviteModal
          place={inviteFor}
          email={inviteEmail}
          setEmail={setInviteEmail}
          archived={archived}
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
      {assignFor && (
        <AssignModal
          name={assignFor.name}
          freePlaces={places.filter((p) => p.is_active && !p.occupant && !p.invitation)}
          onClose={() => setAssignFor(null)}
          onAssign={doAssign}
        />
      )}
      {editingRights && (
        <RightsPanel user={editingRights} onClose={() => setEditingRights(null)} onSave={saveRights} />
      )}
    </div>
  );
}

// --- Actions transmises aux lignes ---
type RowActions = {
  // Édition de la section Comptes : sans elle, la liste des utilisatrices est en lecture seule
  // (les serveurs refusent déjà ces actions ; on n'affiche pas des boutons voués à un 403).
  canEdit: boolean;
  canManageRoles: boolean;
  currentUserId: string;
  rightsMap: Record<string, UserRights>;
  onEdit: (p: PlaceWithStatus) => void;
  onToggle: (p: PlaceWithStatus) => void;
  onDelete: (p: PlaceWithStatus) => void;
  onInvite: (p: PlaceWithStatus) => void;
  onResend: (p: PlaceWithStatus) => void;
  onCancelInvite: (p: PlaceWithStatus) => void;
  onArchive: (p: PlaceWithStatus) => void;
  onMove: (p: PlaceWithStatus) => void;
  onRights: (occupant: NonNullable<PlaceWithStatus["occupant"]>) => void;
};

// --- Groupement par étage (chambres) ou liste plate (postes) ---
function PlaceGroups({ places, isPoste, mode, ...actions }: { places: PlaceWithStatus[]; isPoste: boolean; mode: "people" | "structure" } & RowActions) {
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
              <PlaceRow key={p.id} p={p} mode={mode} {...actions} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceRow({ p, mode, canEdit, canManageRoles, currentUserId, rightsMap, onEdit, onToggle, onDelete, onInvite, onResend, onCancelInvite, onArchive, onMove, onRights }: { p: PlaceWithStatus; mode: "people" | "structure" } & RowActions) {
  const free = p.is_active && !p.occupant && !p.invitation;
  const occupantRights = p.occupant ? rightsMap[p.occupant.user_id]?.rights : undefined;

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border px-4 py-3 ${p.is_active ? "border-gray-100 bg-white" : "border-gray-200 bg-gray-50 opacity-70"}`}>
      <div className="min-w-0">
        <p className="font-medium text-gray-800 truncate">{placeName(p)}</p>
        <StatusBadge p={p} />
        {mode === "people" && p.occupant && occupantRights && (
          <div className="mt-1"><RightsSummary r={occupantRights} /></div>
        )}
      </div>

      {mode === "people" ? (
        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
          {canEdit && free && (
            <button onClick={() => onInvite(p)} className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-800 cursor-pointer" title="Inviter une résidente">
              <Mail className="w-4 h-4" /> Inviter
            </button>
          )}
          {canEdit && p.invitation && (
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
              {canManageRoles && p.occupant.user_id !== currentUserId && occupantRights && (
                <button onClick={() => onRights(p.occupant!)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer text-sm" title="Régler les droits">
                  <SlidersHorizontal className="w-4 h-4" /> Droits
                </button>
              )}
              {canEdit && (
                <>
                  <button onClick={() => onMove(p)} className="p-2 rounded-full text-blue-600 hover:bg-blue-50 cursor-pointer" title="Déplacer vers une autre place">
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => onArchive(p)} className="p-2 rounded-full text-orange-600 hover:bg-orange-50 cursor-pointer" title="Libérer la place (désactiver le compte)">
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
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
      )}
    </div>
  );
}

function StatusBadge({ p }: { p: PlaceWithStatus }) {
  if (!p.is_active) return <span className="text-xs text-gray-400">Désactivée</span>;
  if (p.occupant)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700">
        <UserCheck className="w-3.5 h-3.5" /> {p.occupant.prenom} {p.occupant.nom}
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

// --- Modale d'invitation (avec choix des droits en cas de réassignation) ---
function InviteModal({
  place,
  email,
  setEmail,
  archived,
  onClose,
  onSend,
  sending,
}: {
  place: PlaceWithStatus;
  email: string;
  setEmail: (v: string) => void;
  archived: ArchivedAccount[];
  onClose: () => void;
  onSend: (resetRights: boolean) => void;
  sending: boolean;
}) {
  const [keepRights, setKeepRights] = useState(false);

  // Compte désactivé correspondant à l'email saisi/sélectionné (pour la réassignation).
  const matched = useMemo(
    () => archived.find((a) => a.email.toLowerCase() === email.trim().toLowerCase()),
    [archived, email]
  );
  const showRightsChoice = !!matched && hasAnyAdmin(matched.rights);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-1 flex items-center gap-2">
          <Mail className="w-5 h-5" /> Inviter une résidente
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {place.kind === "poste" ? "Poste" : "Chambre"} <span className="font-medium">{placeName(place)}</span> — résidence {place.residence}.
        </p>

        {archived.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Réassigner une ancienne résidente</label>
            <select
              value=""
              onChange={(e) => {
                const a = archived.find((x) => x.user_id === e.target.value);
                if (a) { setEmail(a.email); setKeepRights(false); }
              }}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="">— Compte désactivé… —</option>
              {archived.map((a) => (
                <option key={a.user_id} value={a.user_id}>{a.nom.toUpperCase()} {a.prenom} · {a.email}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Son compte sera réactivé et réassigné, sans nouvel email.</p>
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">
          {archived.length > 0 ? "Ou inviter par email" : "Email"}
        </label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !sending && onSend(showRightsChoice && !keepRights)}
          placeholder="email@exemple.fr"
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">Nouvelle personne : un email d&apos;activation lui sera envoyé.</p>

        {showRightsChoice && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800 mb-1 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Cette personne avait des droits admin</p>
            <div className="mb-2"><RightsSummary r={matched!.rights} /></div>
            <label className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
              <input type="radio" checked={!keepRights} onChange={() => setKeepRights(false)} className="accent-blue-600" />
              Repartir de zéro (simple résidente)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
              <input type="radio" checked={keepRights} onChange={() => setKeepRights(true)} className="accent-blue-600" />
              Garder ses anciens droits
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
          <button onClick={() => onSend(showRightsChoice && !keepRights)} disabled={sending} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
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

// --- Modale d'attribution d'une chambre à un compte sans place (maintenance) ---
function AssignModal({
  name,
  freePlaces,
  onClose,
  onAssign,
}: {
  name: string;
  freePlaces: PlaceWithStatus[];
  onClose: () => void;
  onAssign: (targetId: string) => void;
}) {
  const [target, setTarget] = useState("");
  const optionLabel = (p: PlaceWithStatus) =>
    p.kind === "poste" ? `Corail · ${placeName(p)}` : `Rés. ${p.residence} · ${formatEtage(p.etage) ?? "?"} · ${placeName(p)}`;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-1 flex items-center gap-2">
          <DoorClosed className="w-5 h-5" /> Attribuer une chambre à {name}
        </h3>
        <p className="text-sm text-gray-500 mb-4">Choisis une place libre à rattacher à ce compte :</p>
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
          <button onClick={() => target && onAssign(target)} disabled={!target} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
            <DoorClosed className="w-4 h-4" /> Attribuer
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Modale création / édition d'une place ---
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

// --- Panneau de réglage des droits (super-admin) ---
function RightsPanel({ user, onClose, onSave }: { user: { userId: string; name: string; rights: Rights }; onClose: () => void; onSave: (userId: string, r: Rights) => void }) {
  const [draft, setDraft] = useState<Rights>({ ...user.rights });
  const setSection = (s: Section, v: number) => setDraft((d) => ({ ...d, [s]: asNiveauSection(v) }));

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-blue-800">Droits — {user.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Un niveau par section. Le super-admin a tous les droits et gère les rôles.</p>

        <label className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-purple-100 bg-purple-50 cursor-pointer">
          <input type="checkbox" checked={draft.is_super_admin} onChange={(e) => setDraft((d) => ({ ...d, is_super_admin: e.target.checked }))} className="w-4 h-4 accent-purple-600" />
          <span className="text-sm font-medium text-purple-800 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Super-admin (tous droits + gestion)</span>
        </label>

        <div className={`space-y-3 ${draft.is_super_admin ? "opacity-40 pointer-events-none" : ""}`}>
          {SECTIONS.map((s) => (
            <div key={s}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">{SECTION_LABEL[s]}</span>
                <select
                  value={draft.is_super_admin ? 3 : draft[s]}
                  onChange={(e) => setSection(s, Number(e.target.value))}
                  disabled={draft.is_super_admin}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  {niveauxPourSection(s).map((n) => (
                    <option key={n} value={n}>{NIVEAU_LABEL[n]}</option>
                  ))}
                </select>
              </div>
              {/* « Aucun » ne retire jamais la vue de résidente : on l'explicite ici. */}
              <p className="text-[11px] leading-snug text-gray-400 mt-0.5">{SECTION_AIDE[s]}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
          <button onClick={() => onSave(user.userId, draft)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
