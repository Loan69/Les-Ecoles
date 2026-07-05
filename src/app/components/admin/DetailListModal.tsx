"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonneDetail, personneSublabel, sortAdminPeople } from "@/lib/adminPeople";

interface DetailListModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  people: PersonneDetail[];
  emptyLabel?: string;
  // Note affichée par personne (ex. l'option de repas choisie), clé = id
  notes?: Record<string, string>;
}

// Liste des personnes « derrière un nombre » (mêmes tri et libellés que le tableau de détail).
export default function DetailListModal({ open, onClose, title, people, emptyLabel = "Aucune personne.", notes }: DetailListModalProps) {
  const sorted = sortAdminPeople(people);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title} <span className="text-sm font-normal text-gray-500">({sorted.length})</span>
          </DialogTitle>
        </DialogHeader>

        {sorted.length === 0 ? (
          <p className="text-gray-500 italic text-sm">{emptyLabel}</p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm shadow-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-gray-800 truncate">
                    {p.nom} {p.prenom}
                  </span>
                  {notes?.[p.id] && (
                    <span className="text-xs bg-green-50 text-green-700 rounded px-1.5 py-0.5 flex-shrink-0">{notes[p.id]}</span>
                  )}
                </span>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{personneSublabel(p)}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
