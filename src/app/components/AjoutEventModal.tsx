"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { EventFormData } from "@/types/EventFormData";
import DynamicSelectGroup from "./DynamicSelectGroup";
import DynamicMultiSelectGroup from "./DynamicMultiSelectGroup";
import { Option } from "@/types/Option";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: EventFormData) => void | Promise<void>;
  isAdmin?: boolean;
};

export default function ModalAjoutEvenement({ open, onClose, onSave, isAdmin = false }: ModalProps) {
  const [form, setForm] = useState<EventFormData>({
    titre: "",
    category: "",
    description: "",
    date_event: "",
    recurrence: "",
    heures: "",
    lieu: "",
    visibilite: { residences: [], etages: [], chambres: [] },
    visible_invites: false,
    demander_confirmation: false,
    reserve_admin: false,
    rappel_event: 0,
  });

  const [selectionEvent, setSelectionEvent] = useState<{ [category: string]: Option }>({});
  const [selectionVisi, setSelectionVisi] = useState<{ [category: string]: Option[] }>({});
  const [selectionRappel, setSelectionRappel] = useState<{ [category: string]: Option }>({});

  // ✅ Réinitialisation à chaque ouverture
  useEffect(() => {
    if (open) {
      setForm({
        titre: "",
        category: "",
        description: "",
        date_event: "",
        recurrence: "",
        heures: "",
        lieu: "",
        visibilite: { residences: [], etages: [], chambres: [] },
        visible_invites: false,
        demander_confirmation: false,
        reserve_admin: false,
      });
      setSelectionEvent({});
      setSelectionVisi({});
      setSelectionRappel({})
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = type === "checkbox" ? target.checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };


  const handleSelectChange = (
    name: keyof EventFormData,
    value:
      | string
      | string[]
      | { [category: string]: Option[] }
      | { [category: string]: Option }
      | { [category: string]: string[] }
  ) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.titre || !form.date_event || !form.lieu) {
      alert("Merci de remplir tous les champs requis.");
      return;
    }
    await onSave(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-lg w-[90%] max-w-md max-h-[90vh] p-6 overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold text-blue-800">Ajouter un évènement</h2>
        <div className="w-full bg-blue-500 h-[1px] mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type d'évènement */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de l&apos;évènement
          </label>
          <DynamicSelectGroup
            rootCategory="evenement"
            onChange={(selected) => {
              const catValue = Object.values(selected)[0]?.value || "";
              handleSelectChange("category", catValue);
              setSelectionEvent(selected);
            }}
            islabel={false}
          />

          {/* Titre */}
          <input
            name="titre"
            value={form.titre}
            onChange={handleChange}
            placeholder="Titre de l'évènement"
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md focus:ring-2 focus:ring-blue-500"
          />

          {/* Date */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date et horaire
          </label>
          <input
            type="date"
            name="date_event"
            value={form.date_event}
            onChange={handleChange}
            placeholder="Sélectionner une date"
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md"
          />

          {/* Heure */}
          <input
            name="heures"
            value={form.heures}
            onChange={handleChange}
            placeholder="Horaire de l'évènement"
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md"
          />

          {/* Rappel de l'évènement */}
          <DynamicSelectGroup
            rootCategory="rappel"
            onChange={(selected) => {
              const rappelValue = Object.values(selected)[0]?.value || "";
              handleSelectChange("rappel_event", rappelValue);
              setSelectionRappel(selected);
            }}
          />

          {/* Description */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Ajoutez des détails sur l’évènement..."
            rows={4}
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md resize-none"
          />

          {/* Lieu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lieu de l&apos;évènement
            </label>
            <DynamicSelectGroup
              rootCategory="residence"
              onChange={(selected) => {
                const catValue = Object.values(selected)[0]?.value || "";
                handleSelectChange("lieu", catValue);
              }}
              onlyParent={true}
              islabel={false}
            />
          </div>

          {/* --- ✅ Section visibilité --- */}
          <h2 className="text-blue-800 font-semibold mt-4">Visibilité</h2>

          {/* Checkbox staff (visible uniquement pour les admins) */}
          {isAdmin && (
            <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-800">
                  Évènement réservé au staff
                </span>
                <span className="text-xs text-gray-500">
                  Si activé, seuls les résidentes admins verront cet évènement.
                </span>
              </div>
              <input
                type="checkbox"
                name="reserve_admin"
                checked={form.reserve_admin || false}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    reserve_admin: e.target.checked,
                  }))
                }
                className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
              />
            </label>
          )}

          {/* Multiselect de visibilité (désactivé si réservé au staff) */}
          <DynamicMultiSelectGroup
            rootCategory="residence"
            disabled={form.reserve_admin} // ✅ désactivé si réservé au staff
            onChange={(selected) => {
              const transformed: { [category: string]: string[] } = {};
              Object.entries(selected).forEach(([category, options]) => {
                transformed[category] = options.map((opt) => opt.value);
              });
              handleSelectChange("visibilite", transformed);
            }}
          />

          {/* Visible par les invitées */}
          <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">
                Visible par les invitées
              </span>
              <span className="text-xs text-gray-500">
                Rendez cet évènement accessible aux invitées.
              </span>
            </div>
            <input
              type="checkbox"
              name="visible_invites"
              checked={form.visible_invites || false}
              onChange={handleChange}
              className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
            />
          </label>

          {/* Confirmation participation */}
          <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">
                Demander confirmation
              </span>
              <span className="text-xs text-gray-500">
                Les utilisatrices devront indiquer si elles participent.
              </span>
            </div>
            <input
              type="checkbox"
              name="demander_confirmation"
              checked={form.demander_confirmation || false}
              onChange={handleChange}
              className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
            />
          </label>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2 border rounded-lg text-blue-700 text-sm hover:bg-blue-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="cursor-pointer px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
