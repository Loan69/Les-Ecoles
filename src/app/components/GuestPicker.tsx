"use client";

import { useMemo, useState } from "react";
import { Search, X, Trash2, UserPlus, Check } from "lucide-react";
import { nomInvite } from "@/lib/invites";

export type CarnetInvite = { id: number; nom: string; prenom: string };

// Choix d'un invité : on cherche d'abord dans le **carnet** (les personnes déjà invitées
// une fois), on ne saisit un nouveau nom qu'à défaut. Une liste déroulante devenait
// illisible dès quelques dizaines d'invités — d'où le champ de recherche, comme pour la
// composition des groupes.
//
// **Nom ou prénom suffit** : on ne connaît pas toujours les deux.
export default function GuestPicker({
  guests,
  selectedId,
  onSelect,
  nom,
  prenom,
  setNom,
  setPrenom,
  onRemoveFromCarnet,
  compact = false,
}: {
  guests: CarnetInvite[];
  selectedId: number | null; // invité du carnet retenu, sinon null (saisie libre)
  onSelect: (g: CarnetInvite | null) => void;
  nom: string;
  prenom: string;
  setNom: (v: string) => void;
  setPrenom: (v: string) => void;
  onRemoveFromCarnet?: (g: CarnetInvite) => void;
  compact?: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  const selected = useMemo(() => guests.find((g) => g.id === selectedId) ?? null, [guests, selectedId]);

  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    const tri = [...guests].sort((a, b) => nomInvite(a).localeCompare(nomInvite(b), "fr"));
    if (!terme) return tri;
    return tri.filter((g) => nomInvite(g).toLowerCase().includes(terme));
  }, [guests, recherche]);

  const taille = compact ? "text-sm px-2 py-1.5" : "px-3 py-2";

  // Un invité du carnet est retenu : on montre son nom, avec de quoi revenir en arrière.
  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <Check className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-blue-900">{nomInvite(selected)}</span>
        {onRemoveFromCarnet && (
          <button onClick={() => onRemoveFromCarnet(selected)} title="Retirer du carnet" className="p-1 rounded-full text-red-600 hover:bg-red-100 cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => { onSelect(null); setRecherche(""); }} title="Choisir quelqu'un d'autre" className="p-1 rounded-full text-gray-500 hover:bg-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {guests.length > 0 && (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un invité déjà venu…"
              className={`w-full border border-gray-300 rounded-lg pl-8 pr-8 focus:ring-2 focus:ring-blue-600 focus:outline-none ${taille}`}
            />
            {recherche && (
              <button onClick={() => setRecherche("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:bg-gray-100 cursor-pointer" title="Effacer">
                <X size={14} />
              </button>
            )}
          </div>
          {resultats.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Aucun invité ne correspond à « {recherche} » — saisis son nom ci-dessous.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
              {resultats.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { onSelect(g); setRecherche(""); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 cursor-pointer"
                >
                  {nomInvite(g)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div>
        <p className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
          <UserPlus className="w-3.5 h-3.5" /> {guests.length > 0 ? "Ou un nouvel invité" : "Nouvel invité"}
          <span className="font-normal text-gray-400">— le nom ou le prénom suffit</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none ${taille}`} />
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none ${taille}`} />
        </div>
      </div>
    </div>
  );
}
