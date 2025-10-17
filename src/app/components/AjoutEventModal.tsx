"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Select from "react-select";
import { EventFormData } from "@/types/EventFormData";
import { residences, etages, chambres } from "../data/options";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: EventFormData) => void | Promise<void>;
};

type VisibiliteKeys = keyof NonNullable<EventFormData["visibilite"]>;

export default function ModalAjoutEvenement({ open, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState<EventFormData>({
    titre: "",
    type: "",
    date_event: "",
    recurrence: "",
    heures: "",
    lieu: "",
    visibilite: { residences: [], etages: [], chambres: [] },
  });
  const [showDatePicker, setShowDatePicker] = useState(false);


  useEffect(() => {
    if (open) {
      setForm({
        titre: "",
        type: "",
        date_event: "",
        recurrence: "",
        heures: "",
        lieu: "",
        visibilite: { residences: [], etages: [], chambres: [] },
      });
    }
  }, [open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (name: VisibiliteKeys, values: string[]) => {
    setForm((prev) => ({
      ...prev,
      visibilite: {
        ...prev.visibilite!,
        [name]: values,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
    console.log("🧩 Formulaire soumis :", form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm bg-white rounded-2xl shadow-lg w-[90%] max-w-md max-h-[90vh] p-6 relative overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold text-blue-800">Ajouter un évènement</h2>
        <div className="w-full bg-blue-500 h-[1px] mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <input
            name="titre"
            value={form.titre}
            onChange={handleChange}
            placeholder="Titre de l'évènement"
            className="w-full px-4 py-2 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />

          {/* Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de l&apos;évènement
            </label>
            <div className="relative">
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700
                shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              >
                <option value="anniversaire">Anniversaire</option>
                <option value="linge">Lingerie</option>
                <option value="autre">Autre</option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Date */}
          <div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Date de l&apos;évènement
  </label>
  <input
    type={showDatePicker ? "date" : "text"}
    name="date_event"
    value={form.date_event}
    onFocus={() => setShowDatePicker(true)}
    onBlur={(e) => {
      if (!e.target.value) setShowDatePicker(false);
    }}
    onChange={handleChange}
    placeholder="Sélectionner une date"
    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-700 shadow-sm
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
  />
</div>


          {/* Récurrence */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Récurrence de l&apos;évènement
            </label>
            <div className="relative">
              <select
                name="recurrence"
                value={form.recurrence}
                onChange={handleChange}
                className="w-full appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700
                shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              >
                <option value="aucune">Aucune</option>
                <option value="hebdo">Hebdomadaire</option>
                <option value="mensuelle">Mensuelle</option>
                <option value="annuelle">Annuelle</option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Heures */}
          <input
            name="heures"
            value={form.heures}
            onChange={handleChange}
            placeholder="Horaire de l'évènement"
            className="w-full px-4 py-2 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />

          {/* Lieu */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lieu de l&apos;évènement
            </label>
            <div className="relative">
              <select
                name="lieu"
                value={form.lieu}
                onChange={handleChange}
                className="w-full appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700
                shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              >
                <option value="12">12</option>
                <option value="36">36</option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Visibilité multi-critères avec React Select */}
          <div className="space-y-3">
            <h2 className="text-blue-800 font-semibold">Visibilité de l&apos;évènement</h2>
            <label className="font-medium">Résidences</label>
            <Select
              isMulti
              options={residences}
              value={residences.filter(r => form.visibilite?.residences.includes(r.value))}
              onChange={(selected) =>
                handleMultiSelectChange("residences", selected.map(s => s.value))
              }
            />

            <label className="font-medium">Étages</label>
            <Select
              isMulti
              options={etages}
              value={etages.filter(e => form.visibilite?.etages.includes(e.value))}
              onChange={(selected) =>
                handleMultiSelectChange("etages", selected.map(s => s.value))
              }
            />

            <label className="font-medium">Chambres</label>
            <Select
              isMulti
              options={chambres}
              value={chambres.filter(c => form.visibilite?.chambres.includes(c.value))}
              onChange={(selected) =>
                handleMultiSelectChange("chambres", selected.map(s => s.value))
              }
            />
          </div>

          {/* Boutons */}
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
