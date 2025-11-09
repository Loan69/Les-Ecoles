"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import DynamicSelectGroup from "./DynamicSelectGroup";
import DynamicMultiSelectGroup from "./DynamicMultiSelectGroup";
import DateSelector from "./DatesSelector";
import { CalendarEvent } from "@/types/CalendarEvent";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: CalendarEvent) => void | Promise<void>;
  isAdmin?: boolean;
  eventToEdit?: Partial <CalendarEvent | null>; // ✅ Événement à modifier
  isEditing?: boolean;
};

export default function ModalAjoutEvenement({ 
  open, 
  onClose, 
  onSave, 
  isAdmin = false,
  eventToEdit = null, // ✅ null = mode ajout, objet = mode édition
  isEditing = false
}: ModalProps) {
  
  const [form, setForm] = useState<CalendarEvent>({
    titre: "",
    category: "",
    description: "",
    dates_event: [],
    recurrence: "",
    heures: "",
    lieu: "",
    visibilite: { residence: [], etage: [], chambre: [] },
    visible_invites: false,
    demander_confirmation: false,
    reserve_admin: null,
    rappel_event: 0,
  });

  // ✅ Réinitialisation à chaque ouverture
  useEffect(() => {
    if (open) {
      if (eventToEdit) {
        // Mode édition : pré-remplir avec les données existantes
        setForm({
          titre: eventToEdit.titre || "",
          category: eventToEdit.category || "",
          description: eventToEdit.description || "",
          dates_event: eventToEdit.dates_event || [],
          recurrence: eventToEdit.recurrence || "",
          heures: eventToEdit.heures || "",
          lieu: eventToEdit.lieu || "",
          visibilite: eventToEdit.visibilite || { residence: [], etage: [], chambre: [] },
          visible_invites: eventToEdit.visible_invites || false,
          demander_confirmation: eventToEdit.demander_confirmation || false,
          reserve_admin: eventToEdit.reserve_admin || null,
          rappel_event: eventToEdit.rappel_event || 0,
        });
      } else {
        // Mode ajout : formulaire vide
        setForm({
          titre: "",
          category: "",
          description: "",
          dates_event: [],
          recurrence: "",
          heures: "",
          lieu: "",
          visibilite: { residence: [], etage: [], chambre: [] },
          visible_invites: false,
          demander_confirmation: false,
          reserve_admin: null,
          rappel_event: 0,
        });
      }
    }
  }, [open, eventToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = type === "checkbox" ? target.checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = (name: keyof CalendarEvent, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.category || !form.titre || !form.dates_event?.length || !form.lieu) {
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

        <h2 className="text-lg font-semibold text-blue-800">
          {isEditing ? "Modifier l'évènement" : "Ajouter un évènement"}
        </h2>
        <div className="w-full bg-blue-500 h-[1px] mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Type d'évènement */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de l&apos;évènement
          </label>
          <DynamicSelectGroup
            key={`event-${open}`}
            rootCategory="evenement"
            onChange={(selected) => {
              const catValue = Object.values(selected)[0]?.value || "";
              handleSelectChange("category", catValue);
            }}
            initialValue={form.category}
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

          {/* Dates */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date(s) de l&apos;événement
          </label>
          <DateSelector form={form} setForm={setForm} />

          {/* Heure */}
          <input
            name="heures"
            value={form.heures}
            onChange={handleChange}
            placeholder="Horaire de l'évènement"
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md"
          />

          {/* Rappel */}
          <DynamicSelectGroup
            key={`rappel-${open}`}
            rootCategory="rappel"
            onChange={(selected) => {
              const rappelValue = Object.values(selected)[0]?.value || "";
              handleSelectChange("rappel_event", Number(rappelValue) || 0);
            }}
            initialValue={String(form.rappel_event)}
          />

          {/* Description */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Ajoutez des détails sur l'évènement..."
            rows={4}
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md resize-none"
          />

          {/* Lieu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lieu de l&apos;évènement
            </label>
            <DynamicSelectGroup
              key={`lieu-${open}`}
              rootCategory="residence"
              onChange={(selected) => {
                const catValue = Object.values(selected)[0]?.value || "";
                handleSelectChange("lieu", catValue);
              }}
              initialValue={form.lieu}
              onlyParent={true}
              islabel={false}
            />
          </div>

          {/* Section visibilité */}
          <h2 className="text-blue-800 font-semibold mt-4">Visibilité</h2>

          {/* Checkbox staff */}
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
               <select
                  name="reserve_admin"
                  value={form.reserve_admin || ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : e.target.value;
                    handleSelectChange("reserve_admin", value);
                  }}
                  className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Accessible à tous</option>
                  <option value="12">Staff Résidence 12 uniquement</option>
                  <option value="36">Staff Résidence 36 uniquement</option>
                  <option value="all">Tout le staff</option>
                </select>
            </label>
          )}

          {/* Multiselect visibilité */}
          <DynamicMultiSelectGroup
            key={`visi-${open}`}
            rootCategory="residence"
            disabled={!!form.reserve_admin} // désactivé si un staff est sélectionné
            onChange={(selected) => {
              const transformed: { [category: string]: string[] } = {};
              Object.entries(selected).forEach(([category, options]) => {
                transformed[category] = options.map((opt) => opt.value);
              });
              handleSelectChange("visibilite", transformed);
            }}
            initialValues={form.visibilite}
          />

          {/* Visible invitées */}
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

          {/* Demander confirmation */}
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
              {isEditing ? "Enregistrer les modifications" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}