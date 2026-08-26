"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import EventVisibilitySelector from "./EventVisibilitySelector";
import DateSelector from "./DatesSelector";
import { CalendarEvent } from "@/types/CalendarEvent";
import { toast } from "sonner";
import { useResidences } from "@/lib/useResidences";
import { CATEGORIES_EVENEMENT, DELAIS_RAPPEL } from "@/lib/evenementOptions";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: CalendarEvent) => void | Promise<void>;
  eventToEdit?: Partial<CalendarEvent | null>;
  isEditing?: boolean;
};

export default function ModalAjoutEvenement({ 
  open, 
  onClose, 
  onSave, 
  eventToEdit = null,
  isEditing = false
}: ModalProps) {
  
  const [form, setForm] = useState<CalendarEvent>({
    titre: "",
    category: "",
    description: "",
    dates_event: [],
    recurrence: "",
    heures: "",
    lieu: [],
    visibilite: { residence: [], etage: [], groupes: [] },
    visible_invites: false,
    demander_confirmation: false,
    rappel_event: 0,
  });

  // État pour les valeurs initiales du multiselect lieu
  // Blocs du foyer, source unique des lieux possibles.
  // Seuls les blocs de LIEU peuvent accueillir un événement. Un bloc d'équipe
  // (intendance, bénévoles) n'est pas un endroit physique : il n'a pas d'intercalaire
  // sur l'accueil, et un événement qu'on y rattacherait n'aurait nulle part où
  // s'afficher. Il se cible par la visibilité, pas par le lieu.
  const { residences } = useResidences();
  const blocs = residences.filter((b) => b.kind === "chambre");

  useEffect(() => {
    if (open) {
      if (eventToEdit) {
        const lieu = Array.isArray(eventToEdit.lieu) ? eventToEdit.lieu : [];
        
        setForm({
          titre: eventToEdit.titre || "",
          category: eventToEdit.category || "",
          description: eventToEdit.description || "",
          dates_event: eventToEdit.dates_event || [],
          recurrence: eventToEdit.recurrence || "",
          heures: eventToEdit.heures || "",
          lieu: lieu,
          visibilite: eventToEdit.visibilite || { residence: [], etage: [], groupes: [] },
          visible_invites: eventToEdit.visible_invites || false,
          demander_confirmation: eventToEdit.demander_confirmation || false,
          rappel_event: eventToEdit.rappel_event || 0,
        });

        // Mettre à jour les valeurs initiales pour le multiselect
      } else {
        setForm({
          titre: "",
          category: "",
          description: "",
          dates_event: [],
          recurrence: "",
          heures: "",
          lieu: [],
          visibilite: { residence: [], etage: [], groupes: [] },
          visible_invites: false,
          demander_confirmation: false,
                rappel_event: 0,
        });

        // Réinitialiser les valeurs initiales
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
    
    if (!form.category || !form.titre || !form.dates_event?.length) {
      toast.error("Merci de remplir les champs requis (titre, catégorie, date).");
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
          <select
            value={form.category}
            onChange={(e) => handleSelectChange("category", e.target.value)}
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md bg-white mb-3"
          >
            <option value="">— Choisir —</option>
            {CATEGORIES_EVENEMENT.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
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
          <select
            value={String(form.rappel_event ?? 0)}
            onChange={(e) => handleSelectChange("rappel_event", Number(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 rounded-md bg-white mb-3"
          >
            {DELAIS_RAPPEL.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

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

          {/* Lieu avec multiselect */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lieu(x) de l&apos;évènement <span className="text-gray-400">(facultatif)</span>
            </label>
            <p className="text-xs text-gray-400 mb-1">Sans lieu, l&apos;événement s&apos;affiche en rappel « Aujourd&apos;hui » sur l&apos;accueil le jour J.</p>
            {/* Les blocs viennent de la table `residences`, source de vérité unique.
                Ils étaient lus dans `select_options_residence`, qui les décrivait une
                seconde fois : un bloc créé depuis Administration n'y apparaissait pas,
                et ne pouvait donc pas être choisi comme lieu. */}
            <div className="flex flex-wrap gap-2">
              {blocs.length === 0 && (
                <p className="text-xs text-gray-400 italic">Aucun bloc de lieu n&apos;est encore créé.</p>
              )}
              {blocs.map((b) => {
                const choisi = (form.lieu ?? []).includes(b.value);
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => {
                      const actuels = form.lieu ?? [];
                      handleSelectChange("lieu", choisi ? actuels.filter((v) => v !== b.value) : [...actuels, b.value]);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-sm transition cursor-pointer ${
                      choisi ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-blue-200 text-blue-800 hover:bg-blue-50"
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section visibilité */}
          <h2 className="text-blue-800 font-semibold mt-4">Visibilité</h2>

          {/* Visibilité : résidence / étage puis liste de noms cochables */}
          <EventVisibilitySelector
            key={`visi-${open}`}
            value={form.visibilite ?? { residence: [], etage: [], groupes: [], exclusions: [] }}
            onChange={(v) => handleSelectChange("visibilite", v)}
          />

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