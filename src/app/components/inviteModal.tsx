'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { User } from "@supabase/supabase-js";
import { useSupabase } from "../providers";
import DynamicSelectGroup from './DynamicSelectGroup';

type GuestRow = {
  id: number;
  nom: string;
  prenom: string;
}

export default function InviteModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [nom, setNom] = useState('')
    const [prenom, setPrenom] = useState('')
    const [repas, setRepas] = useState('')
    const [date, setDate] = useState('');
    const [lieuRepas, setLieuRepas] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const [invites, setInvites] = useState<GuestRow[]>([]);
    const [selectedInviteId, setSelectedInviteId] = useState<string>(''); // '' = nouvel invité
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

    // Récupération des invités existants
    useEffect(() => {
        if (!isOpen) return;
        const fetchInvites = async () => {
            const { data, error } = await supabase
                .from("invites")
                .select("id, nom, prenom")
            if (error) {
                console.error("Erreur lors du chargement des invités :", error);
            } else {
                const sorted = data.sort((a: GuestRow, b: GuestRow) =>
                    a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom)
                );
                setInvites(sorted);
            }
        };
        fetchInvites();
    }, [isOpen]);

    // Quand on sélectionne un invité existant, on pré-remplit nom/prénom
    const handleSelectInvite = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedInviteId(value);
        if (value === '') {
            setNom('');
            setPrenom('');
        } else if (value === 'new') {
            setNom('');
            setPrenom('');
        } else {
            const invite = invites.find(i => i.id === Number(value));
            if (invite) {
                setNom(invite.nom ?? '');
                setPrenom(invite.prenom ?? '');
            }
        }
    };

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
            // Reset
            setSelectedInviteId('');
            setNom('');
            setPrenom('');
            setDate('');
            setRepas('');
            setLieuRepas('');
            onClose();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'ajout de l'invité");
        }
    };

    const isNewGuest = selectedInviteId === 'new' || selectedInviteId === '';
    const showNameInputs = isNewGuest;

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

                            {/* Sélection invité existant ou nouvel invité */}
                            <div className="relative">
                                <select
                                    value={selectedInviteId}
                                    onChange={handleSelectInvite}
                                    className="w-full appearance-none bg-white rounded-lg border border-black text-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="">-- Sélectionner un invité existant --</option>
                                    <option value="new">✚ Nouvel invité</option>
                                    {invites.map(i => (
                                        <option key={i.id} value={i.id}>
                                            {i.nom} {i.prenom}
                                        </option>
                                    ))}
                                </select>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Inputs nom/prénom uniquement si nouvel invité */}
                            <AnimatePresence>
                                {showNameInputs && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-3 overflow-hidden"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Nom"
                                            value={nom}
                                            onChange={(e) => setNom(e.target.value)}
                                            className="w-full px-4 py-2 border border-black text-black focus:outline-none focus:ring-2 focus:ring-black rounded-lg"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Prénom"
                                            value={prenom}
                                            onChange={(e) => setPrenom(e.target.value)}
                                            className="w-full px-4 py-2 border border-black text-black focus:outline-none focus:ring-2 focus:ring-black rounded-lg"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 border border-black text-black focus:outline-none focus:ring-2 focus:ring-black rounded-lg"
                            />

                            <div className="relative">
                                <select
                                    value={repas}
                                    onChange={(e) => setRepas(e.target.value)}
                                    className="w-full appearance-none bg-white rounded-lg border border-black text-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="">Sélectionner votre repas</option>
                                    <option value="dejeuner">Déjeuner</option>
                                    <option value="diner">Diner</option>
                                </select>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <div className="mt-3 mb-4">
                            <DynamicSelectGroup
                                rootCategory='residence'
                                onChange={(selected) => setLieuRepas(selected.residence?.value || "")}
                                onlyParent={true}
                                selectClassName="w-full rounded-lg border border-black px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
                                islabel={false}
                            />
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