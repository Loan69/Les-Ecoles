'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { User } from "@supabase/supabase-js";
import { useSupabase } from "../providers";

export default function InviteModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [nom, setNom] = useState('')
    const [prenom, setPrenom] = useState('')
    const [repas, setRepas] = useState('')
    const [date, setDate] = useState('');
    const [lieuRepas, setLieuRepas] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const { supabase } = useSupabase();

    // Récupération de l'utilisateur
    useEffect(() => {
        const fetchUser = async () => {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error) throw error;
            setUser(data.user);
        } catch (err) {
            console.error("Erreur récupération user :", err);
        }
        };

        fetchUser();
    }, []);

    const handleConfirm = async () => {
        if (!nom || !prenom || !date || !repas) {
          alert("Merci de remplir tous les champs");
          return;
        }
      
        try {
          const res = await fetch("/api/invite-repas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nom,
              prenom,
              date,
              repas,
              lieuRepas,
              userId: user?.id,
            }),
          });
      
          const data = await res.json();
      
          if (!res.ok) throw new Error(data.error || "Erreur inconnue");
      
          alert("Invité ajouté !");
          onClose();
        } catch (err) {
          console.error(err);
          alert("Erreur lors de l’ajout de l’invité");
        }
      };
      

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
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                >
                {/* En-tête */}
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-lg text-blue-800">Ajouter un invité</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="w-full bg-blue-500 h-[1px] mb-2" />

                {/* Champs */}
                <div className="space-y-3">
                    <input
                    type="text"
                    placeholder="Nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full mb-3 px-4 py-2 border border-black text-black
                    focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-2"
                    />
                    <input
                    type="text"
                    placeholder="Prénom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full mb-3 px-4 py-2 border border-black text-black
                    focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-2"
                    />

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full mb-3 px-4 py-2 border border-black text-black
                        focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-2"
                    />

                    <div className="mb-4">
                        <div className="relative">
                            <select
                                value={repas}
                                onChange={(e) => setRepas(e.target.value)}
                                className="w-full appearance-none bg-white rounded-lg border border-black text-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            >
                                <option value="">Sélectionner votre repas</option>
                                <option value="déjeuner">Déjeuner</option>
                                <option value="diner">Diner</option>
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
                </div>

                <div className="mb-4">
                    <div className="relative">
                        <select
                            value={lieuRepas}
                            onChange={(e) => setLieuRepas(e.target.value)}
                            className="w-full appearance-none bg-white rounded-lg border border-black text-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                        >
                            <option value="">Sélectionner le lieu du repas</option>
                            <option value="12">Résidence 12</option>
                            <option value="36">Résidence 36</option>
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

                {/* Boutons */}
                <div className="flex justify-center mt-3">
                    <button
                    onClick={handleConfirm}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition cursor-pointer"
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
