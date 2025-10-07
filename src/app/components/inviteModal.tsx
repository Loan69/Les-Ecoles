'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function InviteModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [repas, setRepas] = useState('')

  const handleConfirm = () => {
    // ici tu géreras l’ajout d’un invité (ex: envoi à Supabase)
    console.log({ nom, prenom, repas })
    onClose()
  }

    return (
        <AnimatePresence>
            {isOpen && (
            <motion.div 
                className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                >
                {/* En-tête */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-blue-900">Ajouter un invité</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Champs */}
                <div className="space-y-3">
                    <input
                    type="text"
                    placeholder="Nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full mb-3 px-4 py-2 border border-black text-black
                    focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
                    />
                    <input
                    type="text"
                    placeholder="Prénom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full mb-3 px-4 py-2 border border-black text-black
                    focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
                    />
                    <div className="mb-4">
                        <div className="relative">
                            <select
                                value={repas}
                                onChange={(e) => setRepas(e.target.value)}
                                className="w-full appearance-none bg-white border border-blue-500 text-blue-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                            >
                                <option value="">Sélectionner</option>
                                <option value="12">Repas adulte</option>
                                <option value="36">Repas enfant</option>
                            </select>
                            {/* Flèche bleue custom */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none cursor-pointer"
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
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-2 mt-6">
                    <button
                    onClick={handleConfirm}
                    className="px-4 py-2 border border-blue-700 text-blue-700 rounded-lg hover:bg-blue-50 transition"
                    >
                    Confirmer et ajouter un nouvel invité
                    </button>
                    <button
                    onClick={handleConfirm}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
                    >
                    Confirmer
                    </button>
                </div>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>
    )
}
