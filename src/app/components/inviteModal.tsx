"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, UserPlus } from "lucide-react";
import { useSupabase } from "../providers";
import { toast } from "sonner";

type GuestRow = { id: number; nom: string; prenom: string };
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

  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [date, setDate] = useState("");
  const [dayOptions, setDayOptions] = useState<DayOption[]>([]);
  const [pickedKey, setPickedKey] = useState(""); // `${service}|${option_id}`
  const [submitting, setSubmitting] = useState(false);

  const isNewGuest = selectedGuestId === "" || selectedGuestId === "new";

  const loadGuests = useCallback(async () => {
    const { data } = await supabase.from("invites").select("id, nom, prenom").eq("is_active", true);
    setGuests((data ?? []).sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom)));
  }, [supabase]);

  // Ouverture : reset ou pré-remplissage (édition).
  useEffect(() => {
    if (!isOpen) return;
    loadGuests();
    if (editing) {
      setSelectedGuestId(editing.id_invite ? String(editing.id_invite) : "new");
      setNom(editing.nom);
      setPrenom(editing.prenom);
      setDate(editing.date_repas);
      setPickedKey(editing.option_id ? `${editing.type_repas}|${editing.option_id}` : "");
    } else {
      setSelectedGuestId("");
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
      const { data } = await supabase
        .from("meal_service_options")
        .select("service, option:meal_options(id, label, is_active, admin_only)")
        .eq("date", date);
      const opts: DayOption[] = (data ?? [])
        .map((so) => {
          const o = so.option as unknown as { id: string; label: string; is_active: boolean; admin_only: boolean } | null;
          if (!o || !o.is_active || o.admin_only) return null;
          return { service: so.service as Service, option_id: o.id, label: o.label };
        })
        .filter(Boolean) as DayOption[];
      // dédoublonne
      const seen = new Set<string>();
      setDayOptions(opts.filter((o) => (seen.has(`${o.service}|${o.option_id}`) ? false : seen.add(`${o.service}|${o.option_id}`))));
    })();
  }, [date, supabase]);

  const choices = useMemo(
    () => [...dayOptions].sort((a, b) => a.service.localeCompare(b.service) || a.label.localeCompare(b.label)),
    [dayOptions]
  );

  const handleSelectGuest = (value: string) => {
    setSelectedGuestId(value);
    if (value === "" || value === "new") {
      setNom("");
      setPrenom("");
    } else {
      const g = guests.find((i) => i.id === Number(value));
      if (g) {
        setNom(g.nom ?? "");
        setPrenom(g.prenom ?? "");
      }
    }
  };

  const deleteGuest = async () => {
    if (isNewGuest) return;
    const g = guests.find((i) => i.id === Number(selectedGuestId));
    if (!g) return;
    toast(`Retirer ${g.prenom} ${g.nom} du carnet ?`, {
      description: "Ses invitations passées sont conservées ; il ne sera plus proposé.",
      action: {
        label: "Retirer",
        onClick: async () => {
          const res = await fetch("/api/invites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id }) });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Invité retiré du carnet.");
          handleSelectGuest("");
          await loadGuests();
        },
      },
    });
  };

  const confirm = async () => {
    if (!nom.trim() || !prenom.trim()) return toast.error("Nom et prénom requis.");
    if (!date) return toast.error("Sélectionnez une date.");
    if (!pickedKey) return toast.error("Sélectionnez un repas.");
    const [service, optionId] = pickedKey.split("|") as [Service, string];

    setSubmitting(true);
    const payload = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      guestId: isNewGuest ? undefined : Number(selectedGuestId),
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
              {/* Invité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invité</label>
                <div className="flex gap-2">
                  <select value={selectedGuestId} onChange={(e) => handleSelectGuest(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none">
                    <option value="">— Sélectionner —</option>
                    <option value="new">✚ Nouvel invité</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>{g.nom} {g.prenom}</option>
                    ))}
                  </select>
                  {!isNewGuest && (
                    <button onClick={deleteGuest} title="Retirer du carnet" className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {isNewGuest && (
                <div className="grid grid-cols-2 gap-2">
                  <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                  <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                </div>
              )}

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
