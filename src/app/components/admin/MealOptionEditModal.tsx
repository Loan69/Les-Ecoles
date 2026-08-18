"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonneDetail, sortAdminPeople } from "@/lib/adminPeople";
import { UserPlus, X } from "lucide-react";
import { useSupabase } from "@/app/providers";
import { CHOIX_NON } from "@/lib/presenceStatut";
import GuestPicker, { type CarnetInvite } from "@/app/components/GuestPicker";
import { nomInvite, nomInviteManquant } from "@/lib/invites";

export type OptionChoice = { option_id: string; label: string };
type Residente = { id: string; nom: string; prenom: string };

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  people: PersonneDetail[]; // personnes actuellement dans cette option (live)
  notes?: Record<string, string>;
  optionId: string; // option de la tuile (valeur courante des lignes)
  dayServiceOptions: OptionChoice[]; // options ouvertes pour ce jour + service (résidentes)
  residentes: Residente[]; // vivier pour l'ajout d'une résidente
  // Qui peut inviter sur CETTE option : seules les résidentes à qui elle est proposée.
  inviteursPossibles: Residente[];
  // Options ouvertes à l'**invitante** de cet invité : un invité ne mange que ce que
  // la personne qui l'invite peut elle-même choisir.
  optionsPourInvite: (inviteId: number) => OptionChoice[];
  // choix : "" = sans réponse (retire la ligne) · "non" = « Non » explicite · sinon l'id de l'option.
  onSetResidentOption: (userId: string, choix: string) => Promise<void>;
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
  inviteursPossibles, optionsPourInvite,
  onSetResidentOption, onSetGuestOption, onAddResident, onAddGuest,
}: Props) {
  const { supabase } = useSupabase();
  const sorted = sortAdminPeople(people);
  const [busy, setBusy] = useState(false);
  const [addResId, setAddResId] = useState("");
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [existingGuests, setExistingGuests] = useState<CarnetInvite[]>([]);
  const [pickedGuest, setPickedGuest] = useState<number | null>(null); // null = nouvel invité
  const [gNom, setGNom] = useState("");
  const [gPrenom, setGPrenom] = useState("");
  const [gInviter, setGInviter] = useState("");

  // Carnet d'invités existants (pour réutiliser un invité déjà enregistré).
  useEffect(() => {
    if (!open) return;
    supabase.from("invites").select("id, nom, prenom").eq("is_active", true).then(({ data }) => {
      // nom ou prénom peut être vide : on trie sur le libellé affiché.
      setExistingGuests(((data ?? []) as CarnetInvite[]).sort((a, b) => nomInvite(a).localeCompare(nomInvite(b), "fr")));
    });
  }, [open, supabase]);

  const pickGuest = (g: CarnetInvite | null) => {
    setPickedGuest(g?.id ?? null);
    setGNom(g?.nom ?? "");
    setGPrenom(g?.prenom ?? "");
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const changeFor = (p: PersonneDetail, value: string) => {
    const gid = guestInviteId(p);
    // Un invité n'a pas d'état « sans réponse » : le retirer de l'option = supprimer son repas.
    if (gid !== null) {
      run(() => onSetGuestOption(gid, value === "" || value === CHOIX_NON ? null : value));
      return;
    }
    run(() => onSetResidentOption(p.id, value));
  };

  const addResident = (userId: string) => {
    if (!userId) return;
    setAddResId("");
    run(() => onAddResident(userId));
  };

  const submitGuest = () => {
    if (nomInviteManquant(gNom, gPrenom) || !gInviter) return;
    run(async () => {
      await onAddGuest(gNom.trim(), gPrenom.trim(), gInviter);
      setGNom(""); setGPrenom(""); setGInviter(""); setPickedGuest(null); setGuestFormOpen(false);
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
                  <span className="font-medium text-gray-800 break-words">{guestInviteId(p) === null ? `${p.nom} ${p.prenom}` : nomInvite(p)}</span>
                  {notes?.[p.id] && <span className="text-xs bg-purple-50 text-purple-700 rounded px-1.5 py-0.5">{notes[p.id]}</span>}
                </span>
                <select
                  value={optionId}
                  disabled={busy}
                  onChange={(e) => changeFor(p, e.target.value)}
                  className="w-full sm:w-auto sm:shrink-0 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  {(guestInviteId(p) === null ? dayServiceOptions : optionsPourInvite(guestInviteId(p)!)).map((o) => (
                    <option key={o.option_id} value={o.option_id}>{o.label}</option>
                  ))}
                  <option value={CHOIX_NON}>— Non (ne mange pas)</option>
                  {guestInviteId(p) === null && <option value="">— Sans réponse (retirer)</option>}
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
                <span className="text-xs font-medium text-gray-500">Ajouter un invité</span>
                <button onClick={() => setGuestFormOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <GuestPicker
                guests={existingGuests}
                selectedId={pickedGuest}
                onSelect={pickGuest}
                nom={gNom}
                prenom={gPrenom}
                setNom={(v) => { setGNom(v); setPickedGuest(null); }}
                setPrenom={(v) => { setGPrenom(v); setPickedGuest(null); }}
                compact
              />
              {/* Seules les résidentes à qui CETTE option est proposée peuvent inviter dessus. */}
              <select value={gInviter} onChange={(e) => setGInviter(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer">
                <option value="">— Invité par (résidente) —</option>
                {inviteursPossibles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nom} {r.prenom}</option>
                ))}
              </select>
              {inviteursPossibles.length === 0 && (
                <p className="text-[11px] text-amber-700">Aucune résidente ne peut inviter sur cette option : elle est ciblée sur un public qui n&apos;inclut personne d&apos;activé.</p>
              )}
              <button onClick={submitGuest} disabled={busy || nomInviteManquant(gNom, gPrenom) || !gInviter} className="w-full bg-blue-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
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
