"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, DoorClosed, Briefcase, UserCheck, Mail, Save, RefreshCw, X, ArrowLeftRight, LogOut, SlidersHorizontal, ShieldCheck, ChevronDown, Archive, Settings, Building2, ArrowUp, ArrowDown } from "lucide-react";
import { PlaceWithStatus, PlaceKind } from "@/types/Place";
import { formatChambre } from "@/lib/adminPeople";
import { SECTIONS, SECTION_LABEL, SECTION_AIDE, NIVEAU_LABEL, NIVEAU_AIDE, NIV, niveauxPourSection, asNiveauSection, hasAnyAdmin, type Rights, type Section } from "@/lib/roles";
import { COULEURS_RESIDENCE, COULEUR_LABEL, labelResidenceDefaut, themeResidence } from "@/lib/residences";
import type { CouleurResidence, Residence } from "@/types/Residence";
import type { EtageWithCount } from "@/types/Etage";
import { PlacesSkeleton } from "../Skeleton";
import { useMyRights } from "@/lib/useMyRights";
import { useResidences } from "@/lib/useResidences";
import { useResidencesContext } from "@/app/providers";
import GroupesPanel from "./GroupesPanel";
import GroupeBadge from "../GroupeBadge";
import type { Groupe } from "@/types/Groupe";
import type { PersonneDetail } from "@/lib/adminPeople";

// Un bloc du foyer, tel que renvoyé par /api/admin/residences (actifs ET inactifs).
type Bloc = Residence & { nb_places: number };

type Form = {
  open: boolean;
  editingId: string | null;
  residence: string;
  kind: PlaceKind;
  etage: string;
  name: string;
};

const EMPTY_FORM: Form = { open: false, editingId: null, residence: "", kind: "chambre", etage: "", name: "" };

// Modale d'ajout / renommage d'un bloc.
type BlocForm = { open: boolean; editing: Bloc | null; label: string; kind: PlaceKind; couleur: CouleurResidence };
const EMPTY_BLOC_FORM: BlocForm = { open: false, editing: null, label: "", kind: "chambre", couleur: "blue" };

// Modale d'ajout / renommage d'un étage.
type EtageForm = { open: boolean; editing: EtageWithCount | null; residence: string; label: string };
const EMPTY_ETAGE_FORM: EtageForm = { open: false, editing: null, residence: "", label: "" };

type ArchivedAccount = { user_id: string; nom: string; prenom: string; email: string; rights: Rights };
type UserRights = { rights: Rights; source_pk: string; name: string; email: string | null };

// Nom affiché d'une place (le code interne n'est jamais montré).
function placeName(p: PlaceWithStatus): string {
  return p.label || formatChambre(p.code) || p.code;
}

// Libellé d'une place dans une liste déroulante : « Corail · Cuisine », « Résidence 12 · Étage 4 · Orsay ».
// Le nom de l'étage vient de la liste déclarée (`labelEtage`), jamais de sa clé technique :
// un étage nommé « 7 test » s'affichait sinon « 12_7_test », et un renommage n'était pas suivi.
function placeOptionLabel(p: PlaceWithStatus, blocs: { value: string; label: string }[], labelEtage: (v?: string | null) => string | null): string {
  const bloc = blocs.find((b) => b.value === p.residence)?.label ?? labelResidenceDefaut(p.residence);
  // Pas d'étage (poste, ou chambre dont l'étage manque) : on n'affiche pas de segment vide.
  return [bloc, labelEtage(p.etage), placeName(p)].filter(Boolean).join(" · ");
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
  const myRights = useMyRights();
  const canEdit = myRights.canEdit("comptes");
  // La structure physique du foyer (chambres, étages, postes) ne se touche qu'en super-admin :
  // elle conditionne tout le reste (places, ciblage des événements), une erreur y est coûteuse.
  const canEditStructure = myRights.isSuperAdmin;
  // La liste partagée des blocs (contexte) alimente tout le reste de l'appli : on la
  // rafraîchit après chaque modification pour que compta, présences et accueil suivent.
  const { reload: reloadBlocsPartages } = useResidencesContext();
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [blocForm, setBlocForm] = useState<BlocForm>(EMPTY_BLOC_FORM);
  const [savingBloc, setSavingBloc] = useState(false);
  const [etages, setEtages] = useState<EtageWithCount[]>([]);
  const [etageForm, setEtageForm] = useState<EtageForm>(EMPTY_ETAGE_FORM);
  const [savingEtage, setSavingEtage] = useState(false);
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
  const [groupes, setGroupes] = useState<Groupe[]>([]);

  const load = useCallback(async () => {
    const [placesRes, archivedRes, usersRes, groupesRes, blocsRes, etagesRes] = await Promise.all([
      fetch("/api/admin/places"),
      fetch("/api/admin/residentes"),
      fetch("/api/admin/users"),
      fetch("/api/admin/groupes"),
      fetch("/api/admin/residences"),
      fetch("/api/admin/etages"),
    ]);
    const j = await placesRes.json();
    if (placesRes.ok) setPlaces(j.places ?? []);
    else toast.error(j.error || "Erreur de chargement.");
    if (blocsRes.ok) setBlocs(((await blocsRes.json()).residences ?? []) as Bloc[]);
    // Tolérant : tant que supabase/etages-dynamiques.sql n'est pas passé, la liste est
    // vide et le formulaire de chambre retombe sur la saisie libre d'avant.
    if (etagesRes.ok) setEtages(((await etagesRes.json()).etages ?? []) as EtageWithCount[]);
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
    // Tolérant : tant que supabase/groupes.sql n'est pas passé, l'écran fonctionne sans groupes.
    if (groupesRes.ok) setGroupes(((await groupesRes.json()).groupes ?? []) as Groupe[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // --- Blocs du foyer (Résidence 12, Résidence 36, Corail, une nouvelle résidence…) ------
  // Créer un bloc ici lui donne aussitôt son encadré partout : compta, présences,
  // organisation des repas, ciblage des événements, intercalaires de l'accueil.
  // Tous les blocs à afficher, y compris ceux qu'on ne connaît pas (valeur trouvée dans
  // `places` mais absente de la table) : aucune chambre ni occupante ne doit rester invisible.
  const blocsAffiches = useMemo(() => {
    const list = [...blocs];
    const connus = new Set(blocs.map((b) => b.value));
    places.forEach((p) => {
      if (connus.has(p.residence)) return;
      connus.add(p.residence);
      list.push({
        value: p.residence, label: `${labelResidenceDefaut(p.residence)} (bloc inconnu)`,
        kind: p.kind === "poste" ? "poste" : "chambre", ordre: 900, couleur: "blue", is_active: false, nb_places: 0,
      });
    });
    return list;
  }, [blocs, places]);

  const apresBloc = async (res: Response, succes: string) => {
    const j = await res.json();
    if (!res.ok) { toast.error(j.error || "Erreur."); return false; }
    toast.success(succes);
    await Promise.all([load(), reloadBlocsPartages()]);
    return true;
  };

  const saveBloc = async () => {
    if (!blocForm.label.trim()) {
      toast.error("Le nom du bloc est requis.");
      return;
    }
    setSavingBloc(true);
    const res = await fetch("/api/admin/residences", {
      method: blocForm.editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        blocForm.editing
          ? { value: blocForm.editing.value, label: blocForm.label, couleur: blocForm.couleur, ...(blocForm.editing.nb_places === 0 ? { kind: blocForm.kind } : {}) }
          : { label: blocForm.label, kind: blocForm.kind, couleur: blocForm.couleur }
      ),
    });
    setSavingBloc(false);
    if (await apresBloc(res, blocForm.editing ? "Bloc modifié." : "Bloc ajouté.")) setBlocForm(EMPTY_BLOC_FORM);
  };

  const toggleBloc = async (b: Bloc) => {
    const res = await fetch("/api/admin/residences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: b.value, is_active: !b.is_active }),
    });
    await apresBloc(res, b.is_active ? "Bloc désactivé." : "Bloc réactivé.");
  };

  // Échange l'ordre de deux blocs voisins : l'ordre choisi ici est celui de tous les écrans.
  const moveBloc = async (b: Bloc, sens: -1 | 1) => {
    const ordonnes = [...blocs].sort((x, y) => x.ordre - y.ordre);
    const i = ordonnes.findIndex((x) => x.value === b.value);
    const voisin = ordonnes[i + sens];
    if (!voisin) return;
    await Promise.all([
      fetch("/api/admin/residences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: b.value, ordre: voisin.ordre }) }),
      fetch("/api/admin/residences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: voisin.value, ordre: b.ordre }) }),
    ]);
    await Promise.all([load(), reloadBlocsPartages()]);
  };

  const removeBloc = (b: Bloc) => {
    toast(`Supprimer le bloc « ${b.label} » ?`, {
      description: "Possible seulement s'il ne contient aucune chambre, aucun poste et aucun compte.",
      action: {
        label: "Supprimer",
        onClick: async () => {
          const res = await fetch("/api/admin/residences", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: b.value }),
          });
          await apresBloc(res, "Bloc supprimé.");
        },
      },
      cancel: { label: "Annuler", onClick: () => {} },
    });
  };

  // --- Étages d'un bloc « résidence » --------------------------------------
  // Un étage se déclare AVANT d'y ranger des chambres : c'est ce qui permet de
  // dessiner la structure d'un foyer encore vide.
  const etagesDe = useCallback((residence: string) => etages.filter((e) => e.residence === residence), [etages]);

  const saveEtage = async () => {
    if (!etageForm.label.trim()) {
      toast.error("Le nom de l'étage est requis.");
      return;
    }
    setSavingEtage(true);
    const res = await fetch("/api/admin/etages", {
      method: etageForm.editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        etageForm.editing ? { id: etageForm.editing.id, label: etageForm.label } : { residence: etageForm.residence, label: etageForm.label }
      ),
    });
    const j = await res.json();
    setSavingEtage(false);
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success(etageForm.editing ? "Étage modifié." : "Étage ajouté.");
    setEtageForm(EMPTY_ETAGE_FORM);
    // La liste partagée alimente tous les autres écrans (compta, détails, ciblage,
    // sélecteurs de chambre) : sans ce rafraîchissement, un renommage n'y arriverait
    // qu'au prochain rechargement de page.
    await Promise.all([load(), reloadBlocsPartages()]);
  };

  // Échange l'ordre de deux étages voisins du même bloc.
  const moveEtage = async (e: EtageWithCount, sens: -1 | 1) => {
    const ordonnes = etagesDe(e.residence);
    const i = ordonnes.findIndex((x) => x.id === e.id);
    const voisin = ordonnes[i + sens];
    if (!voisin) return;
    await Promise.all([
      fetch("/api/admin/etages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, ordre: voisin.ordre }) }),
      fetch("/api/admin/etages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: voisin.id, ordre: e.ordre }) }),
    ]);
    await Promise.all([load(), reloadBlocsPartages()]);
  };

  const removeEtage = (e: EtageWithCount) => {
    toast(`Supprimer l'étage « ${e.label} » ?`, {
      description: "Possible seulement s'il ne contient plus aucune chambre.",
      action: {
        label: "Supprimer",
        onClick: async () => {
          const res = await fetch("/api/admin/etages", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: e.id }),
          });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Étage supprimé.");
          await Promise.all([load(), reloadBlocsPartages()]);
        },
      },
      cancel: { label: "Annuler", onClick: () => {} },
    });
  };

  const openCreate = (residence: string, kind: PlaceKind, etage = "") =>
    setForm({ ...EMPTY_FORM, open: true, residence, kind, etage });

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

  const deleteAccount = (uid: string, name: string, comptaWarning = false) => {
    toast(`Supprimer définitivement le compte de ${name} ?`, {
      description: comptaWarning
        ? "Action irréversible. Ses repas passés disparaîtront aussi de la comptabilité : ne supprimez qu'une fois la période facturée."
        : "Action irréversible.",
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

  const groupesByUser = useMemo(() => {
    const map: Record<string, { id: string; nom: string }[]> = {};
    groupes.forEach((g) => g.membres.forEach((uid) => {
      map[uid] = [...(map[uid] ?? []), { id: g.id, nom: g.nom }];
    }));
    return map;
  }, [groupes]);

  if (loading) {
    return <PlacesSkeleton />;
  }

  const rowActions: RowActions = {
    canEdit,
    canManageRoles,
    groupesByUser,
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

  // Vivier pour la composition des groupes : les occupantes des places actives, c'est-à-dire
  // exactement les comptes activés (R-ADM-02).
  const peopleForGroupes: PersonneDetail[] = places
    .filter((p) => p.is_active && p.occupant)
    .map((p) => ({
      id: p.occupant!.user_id,
      nom: p.occupant!.nom,
      prenom: p.occupant!.prenom,
      residence: p.residence,
      etage: p.etage,
      chambre: placeName(p),
      isInvite: false,
    }));

  return (
    <div className="space-y-6">
      {/* ================= Liste des utilisatrices (par bloc / étage / chambre) ================= */}
      {blocsAffiches.map((r) => {
        const rPlaces = places.filter((p) => p.residence === r.value && p.is_active);
        if (rPlaces.length === 0) return null;
        return (
          <section key={r.value} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <h2 className="text-base sm:text-lg font-bold text-blue-800 flex items-center gap-2 min-w-0 mb-4">
              {r.kind === "poste" ? <Briefcase className="w-5 h-5 text-amber-600 shrink-0" /> : <DoorClosed className="w-5 h-5 text-blue-600 shrink-0" />}
              <span className="truncate">{r.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${themeResidence(r.couleur).badge}`}>{r.kind === "poste" ? "Postes" : "Chambres"}</span>
              {!r.is_active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-red-50 text-red-700">Bloc désactivé</span>}
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
                    <button onClick={() => deleteAccount(uid, name)} className="p-2 rounded-full text-red-600 hover:bg-red-50 cursor-pointer" title="Supprimer définitivement">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= Groupes (repliable) ================= */}
      <GroupesPanel groupes={groupes} people={peopleForGroupes} canEdit={canEdit} onChanged={load} />


      {/* ================= Gérer les blocs, chambres & étages (repliable, super-admin) ================= */}
      {canEditStructure && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => setStructureOpen((o) => !o)} className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50">
            <span className="flex items-center gap-2 font-bold text-gray-600"><Settings className="w-5 h-5" /> Gérer les blocs, chambres & étages</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${structureOpen ? "rotate-180" : ""}`} />
          </button>
          {structureOpen && (
            <div className="px-4 sm:px-5 pb-5 space-y-6">
              {/* --- Les blocs eux-mêmes --- */}
              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-500" /> Blocs du foyer <span className="text-xs font-normal text-gray-400">· {blocs.length}</span></h3>
                  <button onClick={() => setBlocForm({ ...EMPTY_BLOC_FORM, open: true })} className="shrink-0 flex items-center gap-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-black cursor-pointer whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Ajouter un bloc
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Un bloc, c&apos;est une <b>résidence</b> (des chambres réparties par étage) ou un <b>ensemble de postes</b> (une intendance).
                  Tout bloc a son encadré dans la <b>comptabilité des repas</b>, les <b>présences au foyer</b> et le <b>ciblage des événements</b>.
                  Seule une <b>résidence</b>, lieu physique, apparaît en plus dans l&apos;<b>organisation des services</b>, les <b>options de repas</b>
                  et les <b>intercalaires de l&apos;accueil</b>.
                </p>
                <div className="grid gap-2">
                  {[...blocs].sort((a, b) => a.ordre - b.ordre).map((b, i, arr) => (
                    <div key={b.value} className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border px-4 py-3 ${b.is_active ? "border-gray-100 bg-white" : "border-gray-200 bg-gray-50 opacity-70"}`}>
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        {b.kind === "poste" ? <Briefcase className="w-4 h-4 text-amber-600 shrink-0" /> : <DoorClosed className="w-4 h-4 text-blue-600 shrink-0" />}
                        <span className="font-medium text-gray-800 truncate">{b.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${themeResidence(b.couleur).badge}`}>{COULEUR_LABEL[b.couleur]}</span>
                        <span className="text-xs text-gray-400">{b.kind === "poste" ? "postes" : "chambres"} · {b.nb_places}</span>
                        {!b.is_active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700">Désactivé</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                        <button onClick={() => moveBloc(b, -1)} disabled={i === 0} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default cursor-pointer" title="Monter">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => moveBloc(b, 1)} disabled={i === arr.length - 1} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default cursor-pointer" title="Descendre">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => setBlocForm({ open: true, editing: b, label: b.label, kind: b.kind, couleur: b.couleur })} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer" title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleBloc(b)} className={`p-2 rounded-full cursor-pointer ${b.is_active ? "text-gray-500 hover:bg-gray-100" : "text-green-600 hover:bg-green-50"}`} title={b.is_active ? "Désactiver" : "Réactiver"}>
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeBloc(b)} className="p-2 rounded-full text-red-600 hover:bg-red-50 cursor-pointer" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- Les places de chaque bloc, rangées par étage --- */}
              <p className="text-xs text-gray-400">Structure physique du foyer. Dans une résidence, on déclare d&apos;abord un <b>étage</b>, puis on y ajoute des chambres. Une chambre désactivée n&apos;apparaît plus dans la liste des utilisatrices.</p>
              {blocsAffiches.map((r) => {
                const rPlaces = places.filter((p) => p.residence === r.value);
                const rEtages = etagesDe(r.value);
                // Chambres dont l'étage n'est pas (ou plus) déclaré : rangées à part plutôt
                // que masquées, pour qu'on puisse les rattacher.
                const valeursEtages = new Set(rEtages.map((e) => e.value));
                // Aucun étage déclaré alors que des chambres en portent un : c'est l'état
                // d'AVANT supabase/etages-dynamiques.sql. On retombe alors sur le regroupement
                // d'origine plutôt que de présenter toutes les chambres comme « non déclarées ».
                const avantMigration = rEtages.length === 0 && rPlaces.some((p) => !!p.etage);
                const orphelines = r.kind === "poste" || avantMigration ? [] : rPlaces.filter((p) => !p.etage || !valeursEtages.has(p.etage));
                return (
                  <div key={r.value}>
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 min-w-0">
                        {r.kind === "poste" ? <Briefcase className="w-4 h-4 text-amber-600 shrink-0" /> : <DoorClosed className="w-4 h-4 text-blue-600 shrink-0" />}
                        <span className="truncate">{r.label}</span>
                        <span className="text-xs font-normal text-gray-400 shrink-0">· {rPlaces.length}</span>
                      </h3>
                      {r.is_active && (r.kind === "poste" ? (
                        <button onClick={() => openCreate(r.value, r.kind)} className="shrink-0 flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-800 cursor-pointer whitespace-nowrap">
                          <Plus className="w-4 h-4" /> Ajouter un poste
                        </button>
                      ) : (
                        <button onClick={() => setEtageForm({ ...EMPTY_ETAGE_FORM, open: true, residence: r.value })} className="shrink-0 flex items-center gap-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-black cursor-pointer whitespace-nowrap">
                          <Plus className="w-4 h-4" /> Ajouter un étage
                        </button>
                      ))}
                    </div>

                    {r.kind === "poste" ? (
                      rPlaces.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Aucun poste pour le moment.</p>
                      ) : (
                        <PlaceGroups mode="structure" places={rPlaces} isPoste {...rowActions} />
                      )
                    ) : (
                      <div className="space-y-3">
                        {avantMigration && (
                          <>
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                              Étages pas encore déclarés en base — exécutez <b>supabase/etages-dynamiques.sql</b> pour pouvoir les gérer ici.
                            </p>
                            <PlaceGroups mode="structure" places={rPlaces} isPoste={false} {...rowActions} />
                          </>
                        )}
                        {!avantMigration && rEtages.length === 0 && orphelines.length === 0 && (
                          <p className="text-sm text-gray-400 italic">Aucun étage pour le moment — commencez par en ajouter un.</p>
                        )}
                        {rEtages.map((e, i, arr) => {
                          const ePlaces = rPlaces.filter((p) => p.etage === e.value);
                          return (
                            <div key={e.id} className="rounded-xl border border-gray-100 p-3">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 truncate">
                                  {e.label} <span className="font-normal text-gray-400 normal-case">· {ePlaces.length} chambre{ePlaces.length > 1 ? "s" : ""}</span>
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => moveEtage(e, -1)} disabled={i === 0} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default cursor-pointer" title="Monter">
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => moveEtage(e, 1)} disabled={i === arr.length - 1} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default cursor-pointer" title="Descendre">
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEtageForm({ open: true, editing: e, residence: e.residence, label: e.label })} className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer" title="Renommer l&apos;étage">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => removeEtage(e)} className="p-1.5 rounded-full text-red-600 hover:bg-red-50 cursor-pointer" title="Supprimer l&apos;étage">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => openCreate(r.value, "chambre", e.value)} className="ml-1 flex items-center gap-1 bg-blue-600 text-white rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-blue-800 cursor-pointer whitespace-nowrap">
                                    <Plus className="w-3.5 h-3.5" /> Chambre
                                  </button>
                                </div>
                              </div>
                              {ePlaces.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Étage vide — ajoutez-y une chambre.</p>
                              ) : (
                                <div className="grid gap-2">
                                  {ePlaces.map((p) => (
                                    <PlaceRow key={p.id} p={p} mode="structure" {...rowActions} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {orphelines.length > 0 && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">
                              Étage non déclaré <span className="font-normal normal-case text-amber-600">· {orphelines.length} — à rattacher à un étage</span>
                            </p>
                            <div className="grid gap-2">
                              {orphelines.map((p) => (
                                <PlaceRow key={p.id} p={p} mode="structure" {...rowActions} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
              {canEdit && (
                <p className="text-xs text-gray-400">La <b>suppression définitive</b> (🗑) efface le compte et retire ses repas passés de la comptabilité : ne l&apos;utilisez qu&apos;une fois la période facturée.</p>
              )}
              {archived.map((a) => (
                <div key={a.user_id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 truncate">{a.nom.toUpperCase()} {a.prenom}</p>
                    <p className="text-xs text-gray-400 truncate">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <RightsSummary r={a.rights} />
                    {canEdit && a.user_id !== currentUserId && (
                      <button
                        onClick={() => deleteAccount(a.user_id, `${a.prenom} ${a.nom}`, true)}
                        className="p-2 rounded-full text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {blocForm.open && <BlocModal form={blocForm} setForm={setBlocForm} onSave={saveBloc} saving={savingBloc} />}
      {etageForm.open && <EtageModal form={etageForm} blocs={blocsAffiches} setForm={setEtageForm} onSave={saveEtage} saving={savingEtage} />}
      {form.open && <PlaceModal form={form} blocs={blocsAffiches} etages={etages} setForm={setForm} onSave={save} saving={saving} />}
      {inviteFor && (
        <InviteModal
          place={inviteFor}
          blocs={blocsAffiches}
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
          blocs={blocsAffiches}
          freePlaces={places.filter((p) => p.is_active && !p.occupant && !p.invitation && p.id !== moveFor.id)}
          onClose={() => setMoveFor(null)}
          onMove={doMove}
        />
      )}
      {assignFor && (
        <AssignModal
          name={assignFor.name}
          blocs={blocsAffiches}
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
  // Groupes de chaque personne : affichés à côté de son nom pour qu'on voie, au moment
  // d'inviter ou de gérer un compte, à quels ciblages elle appartient.
  groupesByUser: Record<string, { id: string; nom: string }[]>;
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
  const { labelEtage } = useResidences();
  const groups = useMemo(() => {
    if (isPoste) return [{ label: null as string | null, items: places }];
    // Clé = étage normalisé (« Étage 4 ») → fusionne r12_etage4, etage_4, 4…
    const byEtage = new Map<string, PlaceWithStatus[]>();
    for (const p of places) {
      // Sans étage renseigné, pas d'intertitre inventé : la clé vide regroupe ces places.
      const key = labelEtage(p.etage) ?? "";
      if (!byEtage.has(key)) byEtage.set(key, []);
      byEtage.get(key)!.push(p);
    }
    return [...byEtage.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr", { numeric: true })).map(([label, items]) => ({ label: label || null, items }));
  }, [places, isPoste, labelEtage]);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label ?? "postes"}>
          {!isPoste && g.label && <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{g.label}</p>}
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

function PlaceRow({ p, mode, canEdit, canManageRoles, groupesByUser, currentUserId, rightsMap, onEdit, onToggle, onDelete, onInvite, onResend, onCancelInvite, onArchive, onMove, onRights }: { p: PlaceWithStatus; mode: "people" | "structure" } & RowActions) {
  const free = p.is_active && !p.occupant && !p.invitation;
  const occupantRights = p.occupant ? rightsMap[p.occupant.user_id]?.rights : undefined;

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border px-4 py-3 ${p.is_active ? "border-gray-100 bg-white" : "border-gray-200 bg-gray-50 opacity-70"}`}>
      <div className="min-w-0">
        <p className="font-medium text-gray-800 truncate">{placeName(p)}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge p={p} />
          {mode === "people" && p.occupant && (groupesByUser[p.occupant.user_id] ?? []).map((g) => (
            <GroupeBadge key={g.id} id={g.id} nom={g.nom} />
          ))}
        </div>
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
  blocs,
  email,
  setEmail,
  archived,
  onClose,
  onSend,
  sending,
}: {
  place: PlaceWithStatus;
  blocs: { value: string; label: string }[];
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
          {place.kind === "poste" ? "Poste" : "Chambre"} <span className="font-medium">{placeName(place)}</span> — {blocs.find((b) => b.value === place.residence)?.label ?? labelResidenceDefaut(place.residence)}.
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
  blocs,
  freePlaces,
  onClose,
  onMove,
}: {
  place: PlaceWithStatus;
  blocs: { value: string; label: string }[];
  freePlaces: PlaceWithStatus[];
  onClose: () => void;
  onMove: (targetId: string) => void;
}) {
  const [target, setTarget] = useState("");
  const { labelEtage } = useResidences();
  const optionLabel = (p: PlaceWithStatus) => placeOptionLabel(p, blocs, labelEtage);
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
  blocs,
  freePlaces,
  onClose,
  onAssign,
}: {
  name: string;
  blocs: { value: string; label: string }[];
  freePlaces: PlaceWithStatus[];
  onClose: () => void;
  onAssign: (targetId: string) => void;
}) {
  const [target, setTarget] = useState("");
  const { labelEtage } = useResidences();
  const optionLabel = (p: PlaceWithStatus) => placeOptionLabel(p, blocs, labelEtage);
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

// --- Modale création / édition d'un bloc du foyer ---
// Le type (chambres / postes) se fige dès qu'il y a des places : les changer après coup
// laisserait des chambres sans étage, ou des postes rangés sous un étage inexistant.
function BlocModal({ form, setForm, onSave, saving }: { form: BlocForm; setForm: (f: BlocForm) => void; onSave: () => void; saving: boolean }) {
  const typeFige = !!form.editing && form.editing.nb_places > 0;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-1 flex items-center gap-2">
          <Building2 className="w-5 h-5" /> {form.editing ? "Modifier le bloc" : "Ajouter un bloc"}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {form.kind === "poste" ? (
            <>
              Le bloc apparaîtra avec son propre encadré dans la <b>comptabilité des repas</b>, les <b>présences au foyer</b> et le{" "}
              <b>ciblage des événements</b>. N&apos;étant pas un lieu physique, il n&apos;aura <b>pas d&apos;intercalaire sur l&apos;accueil</b>,
              pas d&apos;encadré dans l&apos;organisation des services et ne pourra pas porter d&apos;option de repas.
            </>
          ) : (
            <>
              Le bloc apparaîtra avec son propre encadré dans la <b>comptabilité des repas</b>, les <b>présences au foyer</b>,
              l&apos;<b>organisation des services</b>, le <b>ciblage des événements</b> et les <b>intercalaires de l&apos;accueil</b>.
            </>
          )}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du bloc</label>
            <input
              autoFocus
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && !saving && onSave()}
              placeholder="Ex : Résidence 48, Corail, La Basse-Frette…"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
            <select
              value={form.kind}
              disabled={typeFige}
              onChange={(e) => setForm({ ...form, kind: e.target.value as PlaceKind })}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-gray-100 cursor-pointer"
            >
              <option value="chambre">Des chambres, réparties par étage (une résidence)</option>
              <option value="poste">Des postes, sans étage (une intendance)</option>
            </select>
            {typeFige && <p className="text-xs text-gray-400 mt-1">Ce bloc contient déjà {form.editing!.nb_places} place(s) : son contenu ne peut plus changer.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {COULEURS_RESIDENCE.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, couleur: c })}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer ${themeResidence(c).badge} ${form.couleur === c ? "ring-2 ring-offset-1 ring-blue-600" : ""}`}
                >
                  {COULEUR_LABEL[c]}
                </button>
              ))}
            </div>
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

// --- Modale création / renommage d'un étage ---
// Le renommage ne touche que le libellé : la clé technique de l'étage reste la même,
// sinon les chambres et les ciblages d'événements déjà enregistrés la perdraient.
function EtageModal({ form, blocs, setForm, onSave, saving }: { form: EtageForm; blocs: { value: string; label: string }[]; setForm: (f: EtageForm) => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-1">
          {form.editing ? "Renommer l'étage" : "Ajouter un étage"} — {blocs.find((b) => b.value === form.residence)?.label ?? labelResidenceDefaut(form.residence)}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Un étage peut exister <b>sans aucune chambre</b> : on dessine d&apos;abord la structure, on la remplit ensuite.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;étage</label>
        <input
          autoFocus
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && !saving && onSave()}
          placeholder="Ex : Étage 3, Rez-de-chaussée…"
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
        {form.editing && form.editing.nb_places > 0 && (
          <p className="text-xs text-gray-400 mt-1">{form.editing.nb_places} chambre(s) y sont rangées : elles suivent le nouveau nom.</p>
        )}
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

// --- Modale création / édition d'une place ---
function PlaceModal({ form, blocs, etages, setForm, onSave, saving }: { form: Form; blocs: { value: string; label: string }[]; etages: EtageWithCount[]; setForm: (f: Form) => void; onSave: () => void; saving: boolean }) {
  const isPoste = form.kind === "poste";
  const etagesDuBloc = etages.filter((e) => e.residence === form.residence);
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          {form.editingId ? "Modifier" : "Ajouter"} {isPoste ? "un poste" : "une chambre"} — {blocs.find((r) => r.value === form.residence)?.label ?? labelResidenceDefaut(form.residence)}
        </h3>
        <div className="space-y-4">
          {!isPoste && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Étage</label>
              {/* On choisit parmi les étages déclarés du bloc : plus de saisie libre, qui
                  créait un nouvel étage à la moindre variation d'orthographe. */}
              {etagesDuBloc.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Ce bloc n&apos;a encore aucun étage. Fermez cette fenêtre et cliquez sur « Ajouter un étage ».
                </p>
              ) : (
                <select
                  value={form.etage}
                  onChange={(e) => setForm({ ...form, etage: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="">— Choisir un étage —</option>
                  {etagesDuBloc.map((e) => (
                    <option key={e.id} value={e.value}>{e.label}</option>
                  ))}
                </select>
              )}
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
              {/* Deux aides : ce que vaut le niveau CHOISI, puis le détail des quatre pour
                  cette section. « Masquée » ne retire jamais la vue d'habitante ailleurs. */}
              <p className="text-[11px] leading-snug text-blue-700 mt-0.5">
                {NIVEAU_AIDE[draft.is_super_admin ? 3 : asNiveauSection(draft[s])]}
              </p>
              <p className="text-[11px] leading-snug text-gray-400">{SECTION_AIDE[s]}</p>
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
