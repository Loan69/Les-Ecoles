"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonneDetail, sortAdminPeople } from "@/lib/adminPeople";
import { UserPlus, X } from "lucide-react";
import { useSupabase } from "@/app/providers";

export type OptionChoice = { option_id: string; label: string };
type Residente = { id: string; nom: string; prenom: string };

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  people: PersonneDetail[]; // personnes actuellement dans cette option (live)
  notes?: Record<string, string>;
  optionId: string; // option de la tuile (valeur courante des lignes)
  dayServiceOptions: OptionChoice[]; // options ouvertes pour ce jour + service
  residentes: Residente[]; // vivier pour l'ajout + l'invitant
  onSetResidentOption: (userId: string, optionId: string | null) => Promise<void>;
  onSetGuestOption: (inviteId: number, optionId: string | null) => Promise<void>;
  onAddResident: (userId: string) => Promise<void>;
  onAddGuest: (nom: string, prenom: string, invitePar: string) => Promise<void>;
}

const guestInviteId = (p: PersonneDetail): number | null => {
  const m = /^guest-(\d+)$/.exec(p.id);
  return m ? Number(m[1]) : null;
};

export default function MealOptionEditModal({
  open, onClose, title, people, notes, optionId, dayServiceOptions, residentes,
  onSetResidentOption, onSetGuestOption, onAddResident, onAddGuest,
}: Props) {
  const { supabase } = useSupabase();
  const sorted = sortAdminPeople(people);
  const [busy, setBusy] = useState(false);
  const [addResId, setAddResId] = useState("");
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [existingGuests, setExistingGuests] = useState<{ id: number; nom: string; prenom: string }[]>([]);
  const [pickedGuest, setPickedGuest] = useState(""); // "" = nouvel invité, sinon id du carnet
  const [gNom, setGNom] = useState("");
  const [gPrenom, setGPrenom] = useState("");
  const [gInviter, setGInviter] = useState("");

  // Carnet d'invités existants (pour réutiliser un invité déjà enregistré).
  useEffect(() => {
    if (!open) return;
    supabase.from("invites").select("id, nom, prenom").eq("is_active", true).then(({ data }) => {
      setExistingGuests((data ?? []).sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom)));
    });
  }, [open, supabase]);

  const pickGuest = (value: string) => {
    setPickedGuest(value);
    if (!value) { setGNom(""); setGPrenom(""); return; }
    const g = existingGuests.find((x) => String(x.id) === value);
    if (g) { setGNom(g.nom); setGPrenom(g.prenom); }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const changeFor = (p: PersonneDetail, value: string) => {
    const opt = value === "" ? null : value;
    const gid = guestInviteId(p);
    run(() => (gid !== null ? onSetGuestOption(gid, opt) : onSetResidentOption(p.id, opt)));
  };

  const addResident = (userId: string) => {
    if (!userId) return;
    setAddResId("");
    run(() => onAddResident(userId));
  };

  const submitGuest = () => {
    if ((!gNom.trim() && !gPrenom.trim()) || !gInviter) return;
    run(async () => {
      await onAddGuest(gNom.trim(), gPrenom.trim(), gInviter);
      setGNom(""); setGPrenom(""); setGInviter(""); setPickedGuest(""); setGuestFormOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title} <span className="text-sm font-normal text-gray-500">({sorted.length})</span>
          </DialogTitle>
        </DialogHeader>

        {sorted.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Personne pour le moment.</p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm shadow-sm">
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                  <span className="font-medium text-gray-800 break-words">{p.nom} {p.prenom}</span>
                  {notes?.[p.id] && <span className="text-xs bg-purple-50 text-purple-700 rounded px-1.5 py-0.5">{notes[p.id]}</span>}
                </span>
                <select
                  value={optionId}
                  disabled={busy}
                  onChange={(e) => changeFor(p, e.target.value)}
                  className="w-full sm:w-auto sm:shrink-0 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  {dayServiceOptions.map((o) => (
                    <option key={o.option_id} value={o.option_id}>{o.label}</option>
                  ))}
                  <option value="">— Non (ne mange pas)</option>
                </select>
              </li>
            ))}
          </ul>
        )}

        {/* Ajouts */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ajouter une résidente à cette option</label>
            <select
              value={addResId}
              disabled={busy}
              onChange={(e) => addResident(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="">— Choisir une résidente —</option>
              {residentes.map((r) => (
                <option key={r.id} value={r.id}>{r.nom} {r.prenom}</option>
              ))}
            </select>
          </div>

          {!guestFormOpen ? (
            <button onClick={() => setGuestFormOpen(true)} className="flex items-center gap-1 text-sm text-blue-700 hover:underline cursor-pointer">
              <UserPlus className="w-4 h-4" /> Ajouter un invité
            </button>
          ) : (
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Nouvel invité</span>
                <button onClick={() => setGuestFormOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <select value={pickedGuest} onChange={(e) => pickGuest(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer">
                <option value="">✚ Nouvel invité</option>
                {existingGuests.map((g) => (
                  <option key={g.id} value={g.id}>{g.nom} {g.prenom}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input value={gNom} onChange={(e) => { setGNom(e.target.value); setPickedGuest(""); }} placeholder="Nom" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                <input value={gPrenom} onChange={(e) => { setGPrenom(e.target.value); setPickedGuest(""); }} placeholder="Prénom" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none" />
              </div>
              <select value={gInviter} onChange={(e) => setGInviter(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer">
                <option value="">— Invité par (résidente) —</option>
                {residentes.map((r) => (
                  <option key={r.id} value={r.id}>{r.nom} {r.prenom}</option>
                ))}
              </select>
              <button onClick={submitGuest} disabled={busy || (!gNom.trim() && !gPrenom.trim()) || !gInviter} className="w-full bg-blue-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
                Ajouter l&apos;invité
              </button>
            </div>
          )}
          <p className="text-[11px] text-gray-400">Les modifications se reportent sur la vue détaillée et la comptabilité.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
