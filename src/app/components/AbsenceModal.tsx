"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AbsencePayload } from "@/types/Absence";

interface AbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: AbsencePayload) => Promise<void> | void;
  // Valeurs initiales pour l'édition (sinon création)
  initial?: AbsencePayload | null;
}

export default function AbsenceModal({
  isOpen,
  onClose,
  onSave,
  initial = null,
}: AbsenceModalProps) {
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [contact, setContact] = useState("");
  const [repasNon, setRepasNon] = useState(true);
  const [saving, setSaving] = useState(false);

  // Réinitialise le formulaire à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setDateDebut(initial?.date_debut ?? "");
      setDateFin(initial?.date_fin ?? "");
      setContact(initial?.contact ?? "");
      setRepasNon(initial?.repas_non ?? true);
    }
  }, [isOpen, initial]);

  const handleSave = async () => {
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
      await onSave({
        date_debut: dateDebut,
        date_fin: dateFin,
        contact: contact.trim() ? contact.trim() : null,
        repas_non: repasNon,
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
            <h2 className="text-lg font-semibold text-blue-800 mb-4">
              {initial ? "Modifier l'absence" : "Ajouter une absence"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début (départ)
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin (retour)
                </label>
                <input
                  type="date"
                  value={dateFin}
                  min={dateDebut || undefined}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Je suis chez… <span className="text-gray-400">(facultatif)</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Ex : chez mes parents, 06 12 34 56 78…"
                  className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <input type="checkbox" checked={repasNon} onChange={(e) => setRepasNon(e.target.checked)} className="w-4 h-4 accent-blue-600 mt-0.5 cursor-pointer" />
                <span>
                  Me noter <strong>« Non »</strong> aux repas pendant mon absence
                  <span className="block text-xs text-gray-500 mt-0.5">Les jours intérieurs sont automatiquement « Non ». Les jours de départ et de retour restent à ton choix.</span>
                </span>
              </label>
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
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
