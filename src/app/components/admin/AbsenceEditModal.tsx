"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonneDetail, sortAdminPeople, personneSublabel } from "@/lib/adminPeople";

type Kind = "present" | "absent";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  kind: Kind; // liste affichée : au foyer ou sorties
  people: PersonneDetail[]; // personnes de cette liste (live)
  addable: PersonneDetail[]; // personnes du statut opposé (pour l'ajout)
  onSet: (userId: string, absent: boolean) => Promise<void>;
}

// Édition des présences d'un jour + résidence, façon popup repas :
// chaque personne bascule Au foyer ↔ Sortie ; on peut ajouter quelqu'un dans cette liste.
export default function AbsenceEditModal({ open, onClose, title, kind, people, addable, onSet }: Props) {
  const sorted = sortAdminPeople(people);
  const [busy, setBusy] = useState(false);
  const [addId, setAddId] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  // Valeur du sélecteur : "sortie" si la liste courante est celle des sorties.
  const currentValue = kind === "absent" ? "sortie" : "foyer";
  const change = (p: PersonneDetail, value: string) => run(() => onSet(p.id, value === "sortie"));
  const add = (userId: string) => { if (!userId) return; setAddId(""); run(() => onSet(userId, kind === "absent")); };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title} <span className="text-sm font-normal text-gray-500">({sorted.length})</span></DialogTitle>
        </DialogHeader>

        {sorted.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Personne pour le moment.</p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm shadow-sm">
                <span className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                  <span className="font-medium text-gray-800 break-words">{p.nom} {p.prenom}</span>
                  <span className="text-[11px] text-gray-400">{personneSublabel(p)}</span>
                </span>
                <select
                  value={currentValue}
                  disabled={busy}
                  onChange={(e) => change(p, e.target.value)}
                  className={`w-full sm:w-auto sm:shrink-0 border rounded-md px-2 py-1 text-xs cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-600 ${kind === "absent" ? "border-red-200 text-red-700" : "border-green-200 text-green-700"}`}
                >
                  <option value="foyer">Au foyer</option>
                  <option value="sortie">Sortie</option>
                </select>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {kind === "absent" ? "Ajouter une sortie (marquer absente)" : "Ajouter au foyer (rétablir présence)"}
          </label>
          <select
            value={addId}
            disabled={busy || addable.length === 0}
            onChange={(e) => add(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">{addable.length === 0 ? "— Personne à ajouter —" : "— Choisir une personne —"}</option>
            {sortAdminPeople(addable).map((p) => (
              <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
            ))}
          </select>
        </div>
      </DialogContent>
    </Dialog>
  );
}
