"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Residence } from "@/types/Residence";

export interface FoyerPersonne {
  user_id: string;
  nom: string;
  prenom: string;
  residence?: string | number;
  type: "Résidente" | "Invitée";
}

export interface MarquagePayload {
  mode: "absent" | "present";
  user_id: string;
  date_debut: string;
  date_fin: string;
  contact: string | null;
}

interface AbsenceAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: FoyerPersonne[];
  residences: Residence[];
  onSubmit: (payload: MarquagePayload) => Promise<void> | void;
  // Pré-remplissage éventuel (depuis le détail d'un jour)
  defaultResidence?: string;
}

export default function AbsenceAdminModal({
  isOpen,
  onClose,
  people,
  residences,
  onSubmit,
  defaultResidence,
}: AbsenceAdminModalProps) {
  const [residence, setResidence] = useState("");
  const [userId, setUserId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [mode, setMode] = useState<"absent" | "present">("absent");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setResidence(defaultResidence ?? "");
      setUserId("");
      setDateDebut("");
      setDateFin("");
      setMode("absent");
      setContact("");
    }
  }, [isOpen, defaultResidence]);

  // Liste filtrée des personnes de la résidence choisie
  const filteredPeople = useMemo(() => {
    if (!residence) return [];
    return people
      .filter((p) => p.residence?.toString() === residence)
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [people, residence]);

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Choisissez une personne.");
      return;
    }
    if (!dateDebut || !dateFin) {
      toast.error("Indiquez une date de début et une date de fin.");
      return;
    }
    if (dateFin < dateDebut) {
      toast.error("La date de fin doit être après la date de début.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        mode,
        user_id: userId,
        date_debut: dateDebut,
        date_fin: dateFin,
        contact: mode === "absent" && contact.trim() ? contact.trim() : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-lg font-semibold text-blue-800 mb-4">Marquer une présence / absence</h2>

            <div className="space-y-4">
              {/* Résidence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Résidence</label>
                <select
                  value={residence}
                  onChange={(e) => {
                    setResidence(e.target.value);
                    setUserId("");
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">— Choisir —</option>
                  {residences.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Qui */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qui</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={!residence}
                  className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-gray-100"
                >
                  <option value="">{residence ? "— Choisir —" : "Choisir d'abord une résidence"}</option>
                  {filteredPeople.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.nom} {p.prenom} {p.type === "Invitée" ? "(invitée)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marquer comme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marquer comme</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("absent")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition cursor-pointer ${
                      mode === "absent"
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Absente
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("present")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition cursor-pointer ${
                      mode === "present"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Présente
                  </button>
                </div>
                {mode === "present" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Retire les absences déclarées sur la période choisie.
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={dateFin}
                    min={dateDebut || undefined}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contact (uniquement pour une absence) */}
              {mode === "absent" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact <span className="text-gray-400">(facultatif)</span>
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Où la joindre…"
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Valider"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
