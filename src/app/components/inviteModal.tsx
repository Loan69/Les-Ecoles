"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus } from "lucide-react";
import { useSupabase } from "../providers";
import { toast } from "sonner";
import { useMyRights } from "@/lib/useMyRights";
import { optionVisibleFor } from "@/lib/optionVisibility";
import GuestPicker, { type CarnetInvite } from "./GuestPicker";
import { nomInvite, nomInviteManquant } from "@/lib/invites";
import type { MealOptionCatalog } from "@/types/MealOption";

type GuestRow = CarnetInvite;
type Service = "dejeuner" | "diner";
type DayOption = { service: Service; option_id: string; label: string };

export type EditingInvite = {
  id: number;
  id_invite: number | null;
  nom: string;
  prenom: string;
  date_repas: string;
  type_repas: Service;
  option_id: string | null;
};

const SERVICE_LABEL: Record<Service, string> = { dejeuner: "Déjeuner", diner: "Dîner" };

export default function InviteModal({
  isOpen,
  onClose,
  onInvited,
  editing = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvited?: () => void;
  editing?: EditingInvite | null;
}) {
  const { supabase } = useSupabase();
  const { groupes: mesGroupes } = useMyRights();

  const [guests, setGuests] = useState<GuestRow[]>([]);
  // Invité du carnet retenu, ou null = saisie libre d'un nouveau nom.
  const [selectedGuestId, setSelectedGuestId] = useState<number | null>(null);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [date, setDate] = useState("");
  const [dayOptions, setDayOptions] = useState<DayOption[]>([]);
  const [pickedKey, setPickedKey] = useState(""); // `${service}|${option_id}`
  const [submitting, setSubmitting] = useState(false);

  const loadGuests = useCallback(async () => {
    const { data } = await supabase.from("invites").select("id, nom, prenom").eq("is_active", true);
    // nom ou prénom peut être vide : on trie sur le libellé affiché, jamais sur un champ seul.
    setGuests(((data ?? []) as GuestRow[]).sort((a, b) => nomInvite(a).localeCompare(nomInvite(b), "fr")));
  }, [supabase]);

  // Ouverture : reset ou pré-remplissage (édition).
  useEffect(() => {
    if (!isOpen) return;
    loadGuests();
    if (editing) {
      setSelectedGuestId(editing.id_invite ?? null);
      setNom(editing.nom ?? "");
      setPrenom(editing.prenom ?? "");
      setDate(editing.date_repas);
      setPickedKey(editing.option_id ? `${editing.type_repas}|${editing.option_id}` : "");
    } else {
      setSelectedGuestId(null);
      setNom("");
      setPrenom("");
      setDate("");
      setPickedKey("");
    }
  }, [isOpen, editing, loadGuests]);

  // Options ouvertes sur la date choisie.
  useEffect(() => {
    if (!date) {
      setDayOptions([]);
      return;
    }
    (async () => {
      // On ne propose pour un invité que les options que l'invitante peut elle-même
      // choisir : même ciblage que son propre sélecteur de repas (résidence / étage /
      // groupe), sans quoi elle inscrirait son invité à un repas qui ne lui est pas ouvert.
      const [{ data }, { data: { session } }] = await Promise.all([
        supabase
          .from("meal_service_options")
          .select("service, option:meal_options(id, label, is_active, visibilite)")
          .eq("date", date),
        supabase.auth.getSession(),
      ]);
      const { data: profil } = session?.user
        ? await supabase.from("residentes").select("residence, etage, chambre").eq("user_id", session.user.id).maybeSingle()
        : { data: null };
      const viewer = {
        residence: profil?.residence,
        etage: profil?.etage,
        chambre: profil?.chambre,
        user_id: session?.user?.id,
        groupes: mesGroupes,
      };

      const opts: DayOption[] = (data ?? [])
        .map((so) => {
          const o = so.option as unknown as MealOptionCatalog | null;
          if (!o || !o.is_active) return null;
          if (!optionVisibleFor(o, viewer)) return null;
          return { service: so.service as Service, option_id: o.id, label: o.label };
        })
        .filter(Boolean) as DayOption[];
      // dédoublonne
      const seen = new Set<string>();
      setDayOptions(opts.filter((o) => (seen.has(`${o.service}|${o.option_id}`) ? false : seen.add(`${o.service}|${o.option_id}`))));
    })();
  }, [date, supabase, mesGroupes]);

  const choices = useMemo(
    () => [...dayOptions].sort((a, b) => a.service.localeCompare(b.service) || a.label.localeCompare(b.label)),
    [dayOptions]
  );

  const handleSelectGuest = (g: GuestRow | null) => {
    setSelectedGuestId(g?.id ?? null);
    setNom(g?.nom ?? "");
    setPrenom(g?.prenom ?? "");
  };

  const deleteGuest = async (g: GuestRow) => {
    toast(`Retirer ${nomInvite(g)} du carnet ?`, {
      description: "Ses invitations passées sont conservées ; il ne sera plus proposé.",
      action: {
        label: "Retirer",
        onClick: async () => {
          const res = await fetch("/api/invites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id }) });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Invité retiré du carnet.");
          handleSelectGuest(null);
          await loadGuests();
        },
      },
    });
  };

  const confirm = async () => {
    // Nom OU prénom : on ne connaît pas toujours les deux (« la sœur de Marie »).
    if (nomInviteManquant(nom, prenom)) return toast.error("Indique au moins le nom ou le prénom.");
    if (!date) return toast.error("Sélectionnez une date.");
    if (!pickedKey) return toast.error("Sélectionnez un repas.");
    const [service, optionId] = pickedKey.split("|") as [Service, string];

    setSubmitting(true);
    const payload = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      guestId: selectedGuestId ?? undefined,
      date,
      service,
      option_id: optionId,
    };
    const res = await fetch("/api/invite-repas", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    const j = await res.json();
    setSubmitting(false);
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success(editing ? "Invitation modifiée." : "Invité ajouté !");
    onInvited?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[88vh] overflow-y-auto" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2"><UserPlus className="w-5 h-5" /> {editing ? "Modifier l'invitation" : "Inviter quelqu'un"}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="w-full bg-blue-500 h-[1px] mb-4" />

            <div className="space-y-4">
              {/* Invité : recherche dans le carnet, ou saisie d'un nouveau nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invité</label>
                <GuestPicker
                  guests={guests}
                  selectedId={selectedGuestId}
                  onSelect={handleSelectGuest}
                  nom={nom}
                  prenom={prenom}
                  setNom={setNom}
                  setPrenom={setPrenom}
                  onRemoveFromCarnet={deleteGuest}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPickedKey(""); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
              </div>

              {/* Repas (service + option du jour) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repas</label>
                {!date ? (
                  <p className="text-xs text-gray-400 italic">Choisissez d&apos;abord une date.</p>
                ) : choices.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucun repas ouvert ce jour-là.</p>
                ) : (
                  <select value={pickedKey} onChange={(e) => setPickedKey(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none">
                    <option value="">— Sélectionner un repas —</option>
                    {choices.map((c) => (
                      <option key={`${c.service}|${c.option_id}`} value={`${c.service}|${c.option_id}`}>{SERVICE_LABEL[c.service]} · {c.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <p className="text-xs text-gray-400">Le couvert est rattaché à la comptabilité de ta résidence.</p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
              <button onClick={confirm} disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
                {submitting ? "Enregistrement…" : editing ? "Enregistrer" : "Confirmer"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
