"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "../providers";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import LoadingSpinner from "../components/LoadingSpinner";
import { Residente } from "@/types/Residente";

type ResidenteWithLabels = Residente & {
  etageLabel?: string | null;
  chambreLabel?: string | null;
};

export default function ProfilPage() {
    const { supabase } = useSupabase();
    const [profil, setProfil] = useState<ResidenteWithLabels | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfil = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("residentes")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (error || !data) {
            console.error(error);
            setLoading(false);
            return;
        }

        let etageLabel = null;
        let chambreLabel = null;

        const { data: options } = await supabase
            .from("select_options_residence")
            .select("value, label");

        if (options) {
            etageLabel = options.find((opt) => opt.value === data.etage)?.label || null;
            chambreLabel = options.find((opt) => opt.value === data.chambre)?.label || null;
        }

        setProfil({
            ...data,
            etageLabel,
            chambreLabel,
        });

        setLoading(false);
        };

        fetchProfil();
    }, [supabase]);

    if (loading)
        return (
        <div className="flex justify-center items-center h-screen">
            <LoadingSpinner />
        </div>
        );

    if (!profil)
        return (
        <div className="flex justify-center items-center h-screen">
            <p className="text-gray-500">Profil introuvable</p>
        </div>
        );

    return (
        <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-6">
        <div className="w-full max-w-md flex flex-col items-center">
            <div className="w-full shadow-lg border border-gray-100 rounded-2xl bg-white overflow-hidden">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
            <div className="flex flex-col items-center py-8 mt-3">
                <Avatar className="w-32 h-32 border-4 border-indigo-100 shadow-md">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${profil.prenom}+${profil.nom}`} />
                <AvatarFallback className="text-3xl">
                    {profil.prenom?.[0]}
                    {profil.nom?.[0]}
                </AvatarFallback>
                </Avatar>
                <h1 className="mt-4 text-3xl font-bold text-[#1b0a6d] text-center">
                {(profil.prenom ?? "") + " " + (profil.nom?.toUpperCase() ?? "")}
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                Résidence {profil.residence ?? "non renseigné"}
                </p>
            </div>
            </motion.div>

            <div className="divide-y divide-gray-100 px-6">
                <InfoRow label="Étage" value={profil.etageLabel ?? profil.etage} />
                <InfoRow label="Chambre" value={profil.chambreLabel ?? profil.chambre} />
                <InfoRow label="Date de naissance" value={profil.date_naissance} />
                {profil.is_admin ? (
                <InfoRow label="Statut" value="Administratrice" />
                ) : (
                    <InfoRow label="Statut" value="Résidente"/>
                )
                }
            </div>
            </div>
        </div>
        </main>
    );
}

function InfoRow({
    label,
    value,
    }: {
    label: string;
    value?: string | null;
    }) {

    return (
        <div className="flex justify-between items-center py-3">
            <span className="text-[#1b0a6d] font-medium">{label}</span>
            <motion.span
                whileHover={{ scale: 1.05 }}
                className="px-4 py-2 rounded-full bg-blue-100 flex items-center gap-2 shadow-sm"
            >
                {value ?? "Non renseigné"}
            </motion.span>
        </div>
    );
}
