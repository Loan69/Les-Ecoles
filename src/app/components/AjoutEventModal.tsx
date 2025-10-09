'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type ModalAjoutEvenementProps = {
  open: boolean
  onClose: () => void
  onSave: (data: FormData) => void
}

type FormData = {
  nom: string
  type: string
  date: string
  recurrence: string
  heures: string
  lieu: string
  visibilite: string
  buffet: boolean
  dinerConserve: boolean
}

export default function ModalAjoutEvenement({
  open,
  onClose,
  onSave,
}: ModalAjoutEvenementProps) {
  const [form, setForm] = useState<FormData>({
    nom: '',
    type: '',
    date: '',
    recurrence: '',
    heures: '',
    lieu: '',
    visibilite: '',
    buffet: true,
    dinerConserve: true,
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggle = (field: keyof FormData) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-md p-6 relative">
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Ajouter un évènement
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Nom */}
          <input
            name="nom"
            value={form.nom}
            onChange={handleChange}
            placeholder="Nom"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          {/* Type */}
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Type</option>
            <option value="anniversaire">Anniversaire</option>
            <option value="linge">Lingerie</option>
            <option value="autre">Autre</option>
          </select>

          {/* Date */}
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

          {/* Récurrence */}
          <select
            name="recurrence"
            value={form.recurrence}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Récurrence</option>
            <option value="aucune">Aucune</option>
            <option value="hebdo">Hebdomadaire</option>
            <option value="mensuelle">Mensuelle</option>
          </select>

          {/* Heures */}
          <input
            name="heures"
            value={form.heures}
            onChange={handleChange}
            placeholder="Heures"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

          {/* Lieux */}
          <select
            name="lieu"
            value={form.lieu}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Lieux</option>
            <option value="salle-commune">Salle commune</option>
            <option value="jardin">Jardin</option>
          </select>

          {/* Visibilité */}
          <select
            name="visibilite"
            value={form.visibilite}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Visibilité : Corail / ...</option>
            <option value="toutes">Toutes</option>
            <option value="corail">Corail</option>
            <option value="jade">Jade</option>
          </select>

          {/* Switches */}
          <div className="flex justify-between mt-2">
            <button
              type="button"
              onClick={() => handleToggle('buffet')}
              className={`px-3 py-1 rounded-lg border text-sm ${
                form.buffet
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-gray-50 text-gray-400 border-gray-300'
              }`}
            >
              Buffet : {form.buffet ? 'Oui' : 'Non'}
            </button>

            <button
              type="button"
              onClick={() => handleToggle('dinerConserve')}
              className={`px-3 py-1 rounded-lg border text-sm ${
                form.dinerConserve
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-gray-50 text-gray-400 border-gray-300'
              }`}
            >
              Dîner conservé : {form.dinerConserve ? 'Oui' : 'Non'}
            </button>
          </div>

          {/* Boutons action */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-blue-700 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
