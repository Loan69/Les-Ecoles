"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Pencil, Trash2, Check, X, Users, Search } from "lucide-react";
import { sortAdminPeople, type PersonneDetail } from "@/lib/adminPeople";
import type { Groupe } from "@/types/Groupe";
import GroupeBadge from "../GroupeBadge";

// Panneau « Groupes » de l'écran Administration.
//
// Un groupe est une étiquette libre posée sur des comptes, qui sert à CIBLER la visibilité
// d'un contenu (événement, option de repas, rubrique Administratif). Il n'accorde aucun
// droit — les droits restent réglés par section, via le bouton « Droits ».
//
// L'affectation se fait ici, groupe par groupe (cocher plusieurs personnes d'un coup),
// plutôt que compte par compte : c'est ainsi qu'on compose un groupe en pratique.

// Filtre la liste sur le nom, le prénom ou la chambre — sans jamais masquer une personne
// déjà membre du groupe (elle doit rester décochable).
function filtrer(people: PersonneDetail[], q: string, membres: Set<string>): PersonneDetail[] {
  const terme = q.trim().toLowerCase();
  if (!terme) return people;
  return people.filter(
    (p) =>
      membres.has(p.id) ||
      `${p.prenom} ${p.nom} ${p.chambre ?? ""} ${p.residence ?? ""}`.toLowerCase().includes(terme)
  );
}

export default function GroupesPanel({
  groupes,
  people,
  canEdit,
  onChanged,
}: {
  groupes: Groupe[];
  people: PersonneDetail[]; // comptes activés (R-ADM-02)
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deplie, setDeplie] = useState<string | null>(null); // groupe dont on compose les membres
  const [creation, setCreation] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [renomme, setRenomme] = useState<{ id: string; nom: string } | null>(null);
  const [recherche, setRecherche] = useState("");
  const [busy, setBusy] = useState(false);

  const triees = sortAdminPeople(people);

  const appel = async (method: string, body: unknown): Promise<boolean> => {
    setBusy(true);
    const res = await fetch("/api/admin/groupes", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(j.error || "Erreur.");
      return false;
    }
    onChanged();
    return true;
  };

  const creer = async () => {
    if (!nouveauNom.trim()) return toast.error("Le nom du groupe est requis.");
    if (await appel("POST", { nom: nouveauNom })) {
      toast.success("Groupe créé.");
      setNouveauNom("");
      setCreation(false);
    }
  };

  const renommer = async () => {
    if (!renomme) return;
    if (await appel("PUT", { id: renomme.id, nom: renomme.nom })) {
      toast.success("Groupe renommé.");
      setRenomme(null);
    }
  };

  const supprimer = (g: Groupe) => {
    toast(`Supprimer le groupe « ${g.nom} » ?`, {
      action: {
        label: "Supprimer",
        onClick: async () => {
          if (await appel("DELETE", { id: g.id })) toast.success("Groupe supprimé.");
        },
      },
    });
  };

  const basculerMembre = async (g: Groupe, userId: string, membre: boolean) => {
    await appel("PUT", { id: g.id, user_id: userId, membre });
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50"
      >
        <span className="flex items-center gap-2 font-bold text-gray-600">
          <Users className="w-5 h-5" /> Groupes
          <span className="text-xs font-normal text-gray-400">· {groupes.length}</span>
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-5 space-y-3">
          <p className="text-xs text-gray-400">
            Un groupe rassemble des personnes (ex. « Staff 12 ») pour <b>cibler la visibilité</b> d&apos;un événement,
            d&apos;une option de repas ou d&apos;une rubrique Administratif. Il ne donne <b>aucun droit</b> : les droits se
            règlent par section, avec le bouton « Droits ».
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Un groupe ne se met pas à jour tout seul : pense à y ajouter les nouvelles arrivantes.
          </p>

          {groupes.length === 0 && !creation && (
            <p className="text-sm text-gray-400 italic">Aucun groupe pour le moment.</p>
          )}

          {groupes.map((g) => {
            const membres = new Set(g.membres);
            const ouvert = deplie === g.id;
            return (
              <div key={g.id} className="border border-gray-100 rounded-xl">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  {renomme?.id === g.id ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <input
                        value={renomme.nom}
                        onChange={(e) => setRenomme({ id: g.id, nom: e.target.value })}
                        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button onClick={renommer} disabled={busy} className="p-1.5 rounded-full text-green-700 hover:bg-green-50 cursor-pointer" title="Valider">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setRenomme(null)} className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer" title="Annuler">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setDeplie(ouvert ? null : g.id); setRecherche(""); }}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <GroupeBadge id={g.id} nom={g.nom} />
                      <span className="text-xs text-gray-400 shrink-0">{g.membres.length} personne{g.membres.length > 1 ? "s" : ""}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${ouvert ? "rotate-180" : ""}`} />
                    </button>
                  )}

                  {canEdit && renomme?.id !== g.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setRenomme({ id: g.id, nom: g.nom })} className="p-1.5 rounded-full text-blue-700 hover:bg-blue-50 cursor-pointer" title="Renommer">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => supprimer(g)} className="p-1.5 rounded-full text-red-600 hover:bg-red-50 cursor-pointer" title="Supprimer">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {ouvert && (
                  <div className="px-3 pb-3 space-y-2">
                    {/* Recherche : la liste complète devient vite illisible. Les personnes
                        DÉJÀ dans le groupe restent affichées quoi qu'on tape, pour qu'on ne
                        décoche jamais quelqu'un sans le voir. */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        placeholder="Rechercher une personne…"
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-8 py-1.5 text-sm"
                      />
                      {recherche && (
                        <button onClick={() => setRecherche("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:bg-gray-100 cursor-pointer" title="Effacer">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {triees.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Aucun compte activé.</p>
                    ) : filtrer(triees, recherche, membres).length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Aucune personne ne correspond à « {recherche} ».</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                        {filtrer(triees, recherche, membres).map((p) => (
                          <label key={p.id} className={`flex items-center justify-between px-3 py-2 ${canEdit ? "cursor-pointer hover:bg-gray-50" : ""}`}>
                            <span className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={membres.has(p.id)}
                                disabled={!canEdit || busy}
                                onChange={(e) => basculerMembre(g, p.id, e.target.checked)}
                                className="w-4 h-4 accent-blue-600"
                              />
                              <span className="text-sm text-gray-800 truncate">{p.nom} {p.prenom}</span>
                            </span>
                            <span className="text-[10px] text-gray-400 shrink-0">Rés. {p.residence ?? "?"}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {canEdit && (
            creation ? (
              <div className="flex items-center gap-1">
                <input
                  value={nouveauNom}
                  onChange={(e) => setNouveauNom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") creer(); }}
                  placeholder="Nom du groupe (ex. Staff 12)"
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                <button onClick={creer} disabled={busy} className="p-2 rounded-full text-green-700 hover:bg-green-50 cursor-pointer" title="Créer">
                  <Check size={18} />
                </button>
                <button onClick={() => { setCreation(false); setNouveauNom(""); }} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer" title="Annuler">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreation(true)}
                className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nouveau groupe
              </button>
            )
          )}
        </div>
      )}
    </section>
  );
}
