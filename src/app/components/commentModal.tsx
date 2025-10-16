'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CommentModal({
  isOpen,
  onClose,
  onSave,
  initialComment,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (comment: string) => void
  initialComment: string
}) {
  const [comment, setComment] = useState('')
  const [saved, setSaved] = useState(false)

  // Reset du textarea à chaque ouverture
  useEffect(() => {
    if (isOpen) setComment('')
  }, [isOpen])

  // Sauvegarde du commentaire
  const handleSave = () => {
    if (!comment.trim()) return // ignore si vide
    onSave(comment)
    setSaved(true)
    setTimeout(() => {setSaved(false), onClose()}, 500)
    setComment('') // reset input
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
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-lg font-semibold text-blue-800 mb-3">
              Commentaire
            </h2>

            {/* Animation du “commentaire enregistré” */}
            <AnimatePresence>
              {saved && (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-2 p-2 bg-green-100 text-green-800 rounded text-sm text-center"
                >
                  ✅ Commentaire enregistré !
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zone de texte */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="Exemple : Allergie, j’arriverai un peu en retard…"
              rows={4}
            />

            {/* Ancien commentaire affiché */}
            {initialComment && (
              <motion.div
                key="submitted-comment"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 mb-5"
              >
                <span className="font-medium text-gray-800">
                  Commentaire soumis pour ce repas :
                </span>{' '}
                <span className="font-bold">{initialComment}</span>
              </motion.div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
