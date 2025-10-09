"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { EventFormData } from "@/types/EventFormData";

type ModalAjoutEvenementProps = {
  open: boolean;
  onClose: () => void;
  // onSave peut retourner void ou Promise<void> (garde la flexibilité pour async)
  onSave: (data: EventFormData) => void | Promise<void>;
};

export default function ModalAjoutEvenement({
  open,
  onClose,
  onSave,
}: ModalAjoutEvenementProps) {
  const [form, setForm] = useState<EventFormData>({
    titre: "",
    type: "",
    date_event: "",
    recurrence: "",
    heures: "",
    lieu: "",
    visibilite: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (field: keyof EventFormData) => {
    // TypeScript sait que buffet & dinerConserve sont boolean
    setForm((prev) => ({ ...prev, [field]: !prev[field] } as EventFormData));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // onSave peut être async — on attend pour que l'appelant puisse faire son traitement avant fermeture si nécessaire
    await onSave(form);
    // L'appelant (CalendrierView) ferme le modal en gérant setOpenModal(false),
    // mais si tu veux que le modal se ferme ici, appelle onClose() après await onSave(form).
    console.log("🧩 Formulaire soumis :", form);
  };

  if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-lg font-semibold text-blue-800">
                    Ajouter un évènement
                </h2>
                <div className="w-full bg-blue-500 h-[1px] mb-2" />

                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                    name="titre"
                    value={form.titre}
                    onChange={handleChange}
                    placeholder="Titre"
                    className="w-full mb-3 px-4 py-2 border border-black text-black
                    focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-2"
                    />

                    <div className="mb-4">
                        <div className="relative">
                            <select
                                name="type"
                                value={form.type}
                                onChange={handleChange}
                                className="w-full appearance-none bg-white rounded-lg border border-black text-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            >
                                <option value="">Type d&apos;évènement</option>
                                <option value="anniversaire">Anniversaire</option>
                                <option value="linge">Lingerie</option>
                                <option value="autre">Autre</option>
                            </select>
                            {/* Flèche custom */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none cursor-pointer"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path 
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7" 
                                />
                            </svg>
                        </div>
                    </div>

                    <input
                        type="date"
                        name="date_event"
                        value={form.date_event}
                        onChange={handleChange}
                        className="w-full mb-3 px-4 py-2 border border-black text-black
                        focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-2"
                    />

                    <div className="mb-4">
                        <div className="relative">
                            <select
                                name="recurrence"
                                value={form.recurrence}
                                onChange={handleChange}
                                className="w-full appearance-none bg-white rounded-lg border border-black text-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            >
                                <option value="">Récurrence de l&apos;évènement</option>
                                <option value="aucune">Aucune</option>
                                <option value="hebdo">Hebdomadaire</option>
                                <option value="mensuelle">Mensuelle</option>
                                <option value="annuelle">Annuelle</option>
                            </select>
                            {/* Flèche custom */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none cursor-pointer"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path 
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7" 
                                />
                            </svg>
                        </div>
                    </div>

                    <input
                        name="heures"
                        value={form.heures}
                        onChange={handleChange}
                        placeholder="Horaire de l'évènement"
                        className="w-full mb-3 px-4 py-2 border border-black text-black
                        focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-2"
                    />

                    <div className="mb-4">
                        <div className="relative">
                            <select
                                name="lieu"
                                value={form.lieu}
                                onChange={handleChange}
                                className="w-full appearance-none bg-white rounded-lg border border-black text-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            >
                                <option value="">Lieux</option>
                                <option value="salle-commune">Salle commune</option>
                                <option value="jardin">Jardin</option>
                            </select>
                            {/* Flèche custom */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none cursor-pointer"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path 
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7" 
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="relative">
                            <select
                                name="visibilite"
                                value={form.visibilite}
                                onChange={handleChange}
                                className="w-full appearance-none bg-white rounded-lg border border-black text-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            >
                                <option value="">Visibilité</option>
                                <option value="toutes">Toutes</option>
                                <option value="corail">Corail</option>
                                <option value="jade">Jade</option>
                            </select>
                            {/* Flèche custom */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none cursor-pointer"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path 
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7" 
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg text-blue-700 text-sm cursor-pointer"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm cursor-pointer"
                        >
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
