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
};

type VisibiliteKeys = keyof NonNullable<EventFormData["visibilite"]>;

export default function ModalAjoutEvenement({ open, onClose, onSave }: ModalProps) {
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
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Stocke toutes les options sélectionnées des select dynamiques
  const [selectionEvent, setSelectionEvent] = useState<{ [category: string]: Option }>({});
  const [selectionLieu, setSelectionLieu] = useState<{ [category: string]: Option }>({});
  const [selectionRec, setSelectionRec] = useState<{ [category: string]: Option }>({});

  // Stocke le résultat du multiselect
  const [selectionVisi, setSelectionVisi] = useState<{ [category: string]: Option[] }>({});


  // Remet à zéro à chaque ouverture
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
      });
      setSelectionEvent({});
      setSelectionLieu({});
      setSelectionRec({});
      setSelectionVisi({});
    }
  }, [open]);

  // Synchronise les selects dynamiques avec le form
  


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  
  // Gestion des changements de valeur dans les selects du formulaire
  const handleSelectChange = (name: keyof EventFormData, 
    value: string | string[] | { [category: string]: Option[] } | { [category: string]: Option } | { [category: string]: string[] }) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // On empêche le rechargement dès le début
    console.log(form)
    if (!form.category || !form.titre || !form.date_event || !form.lieu || !form.visibilite || !form.recurrence) {
      alert("Merci de remplir tous les champs");
      return
    }

    await onSave(form);
    console.log("🧩 Formulaire soumis :", form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-lg w-[90%] max-w-md max-h-[90vh] p-6 overflow-y-auto transition-all duration-300 ease-out transform
        scale-100 opacity-100"
      >
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
                // On prend la valeur de la catégorie correspondante
                const catValue = Object.values(selected)[0]?.value || "";
                handleSelectChange("category", catValue);
                setSelectionEvent(selected); // si on veut garder la sélection localement aussi
              }}
            />

            {/* Titre */}
            <input
              name="titre"
              value={form.titre}
              onChange={handleChange}
              placeholder="Titre de l'évènement"
              className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date et horaire de l&apos;évènement
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
                className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              />
            </div>

            {/* Heure */}
            <input
              name="heures"
              value={form.heures}
              onChange={handleChange}
              placeholder="Horaire de l'évènement"
              className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Description */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description de l&apos;évènement
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Ajoutez des détails sur l’évènement (ex : déroulé, matériel à prévoir...)"
                rows={4}
                className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />


            {/* Lieu */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu de l&apos;évènement
              </label>
              <DynamicSelectGroup 
                rootCategory="residence"
                onChange={(selected) => {
                  // On prend la valeur de la catégorie correspondante
                  const catValue = Object.values(selected)[0]?.value || "";
                  handleSelectChange("lieu", catValue);
                  setSelectionEvent(selected); // si on veut garder la sélection localement aussi
                }}
                onlyParent={true}
              />
            </div>

            {/* Récurrence */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Récurrence de l&apos;évènement
            </label>
            <DynamicSelectGroup
              rootCategory="recurrence"
              onChange={(selected) => {
                // On prend la valeur de la catégorie correspondante
                const catValue = Object.values(selected)[0]?.value || "";
                handleSelectChange("recurrence", catValue);
                setSelectionEvent(selected); // si on veut garder la sélection localement aussi
              }}
            />

            {/* Visibilité */}
            <h2 className="text-blue-800 font-semibold mt-4">
              Visibilité de l&apos;évènement
            </h2>
            <DynamicMultiSelectGroup
              rootCategory="residence"
              onChange={(selected) => {
                // selected: { [category: string]: Option[] }
                const transformed: { [category: string]: string[] } = {};
            
                Object.entries(selected).forEach(([category, options]) => {
                  transformed[category] = options.map(opt => opt.value);
                });
            
                handleSelectChange("visibilite", transformed);
              }}
            />


            {/* Checkbox invités */}
            <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-800">Visible par les invités</span>
                <span className="text-xs text-gray-500">
                  Rendez cet évènement accessible aux invitées.
                </span>
              </div>
              <input
                type="checkbox"
                name="visible_invites"
                checked={form.visible_invites || false}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    visible_invites: e.target.checked,
                  }))
                }
                className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
              />
            </label>

            {/* Checkbox confirmation */}
            <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-800">
                  Demander confirmation de participation
                </span>
                <span className="text-xs text-gray-500">
                  Les utilisatrices devront indiquer si elles participent à cet évènement.
                </span>
              </div>
              <input
                type="checkbox"
                name="demander_confirmation"
                checked={form.demander_confirmation || false}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    demander_confirmation: e.target.checked,
                  }))
                }
                className="w-5 h-5 accent-blue-600 rounded-md cursor-pointer"
              />
            </label>

            {/* Boutons */}
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg text-blue-700 text-sm cursor-pointer hover:bg-blue-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm cursor-pointer hover:bg-blue-800 transition"
              >
                Enregistrer
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
