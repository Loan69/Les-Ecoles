'use client';

import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = {
    role: "residente" | "invitee";
    user: User | null;
};

export default function SignupForm({ role, user }: Props) {
    const [formData, setFormData] = useState({
        nom: "",
        prenom: "",
        dateNaissance: "",
        residence: "",
        etage: "",
        chambre: "",
        typeInvitee: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        if (!formData.password || !formData.confirmPassword) {
            setErrorMsg("Veuillez renseigner le mot de passe et sa confirmation.");
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setErrorMsg("Les mots de passe ne correspondent pas.");
            setLoading(false);
            return;
        }

        try {
            // 1️⃣ Vérifier que l'utilisateur est connecté
            if (!user) {
                setErrorMsg("Vous devez être connectée pour compléter votre profil.");
                setLoading(false);
                return;
            }

            // 2️⃣ Mise à jour du mot de passe
            const { error: pwError } = await supabase.auth.updateUser({
                password: formData.password,
            });
            if (pwError) {
                throw pwError;
            }

            // 3️⃣ Insertion dans la table appropriée
            const table = role === "residente" ? "residentes" : "invitees";
            const insertData =
                role === "residente"
                    ? {
                        user_id: user.id,
                        nom: formData.nom,
                        prenom: formData.prenom,
                        date_naissance: formData.dateNaissance,
                        residence: formData.residence,
                        etage: formData.etage,
                        chambre: formData.chambre,
                        email: user.email,
                    }
                    : {
                        user_id: user.id,
                        nom: formData.nom,
                        prenom: formData.prenom,
                        type_invitee: formData.typeInvitee,
                        email: user.email,
                    };

            const { error: insertError } = await supabase.from(table).insert(insertData);
            if (insertError) throw insertError;

            // 4️⃣ Supprimer la ligne dans pending_users
            const { error: pendingDeleteError } = await supabase
                .from("pending_users")
                .delete()
                .eq("emailInscription", user.email);
            if (pendingDeleteError) throw pendingDeleteError;

            setSuccessMsg("Compte complété avec succès ! Redirection...");
            setLoading(false);
            router.push("/homePage")

        } catch (err) {
            if (err instanceof Error) {
              console.error(err);
              setErrorMsg(err.message || "Une erreur est survenue.");
            } else {
              console.error(err);
              setErrorMsg("Une erreur inconnue est survenue.");
            }
            setLoading(false);
        }
    };

    return ( 
        <form 
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white shadow-md rounded-2xl p-6" 
        >
            {/* Titre */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-blue-800"> Informations complémentaires </h2> 
                <div className="w-full bg-blue-500 h-[2px]" /> 
            </div>
            {/* Nom */}
            <input 
                type="text"
                name="nom"
                placeholder="Nom"
                value={formData.nom}
                onChange={handleChange}
                className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
            />
            {/* Prénom */}
            <input
                type="text"
                name="prenom"
                placeholder="Prénom"
                value={formData.prenom}
                onChange={handleChange} 
                className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />
            {/* Cas résidente */} 
            {role === "residente" && ( 
                <> 
                    {/* Date de naissance */} 
                    <input
                        type="text"
                        name="dateNaissance"
                        placeholder="Date de naissance"
                        value={formData.dateNaissance}
                        onChange={handleChange}
                        className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    {/* Résidence */}
                    <div className="mb-4">
                        <div className="relative">
                            <select
                                name="residence"
                                value={formData.residence}
                                onChange={handleChange}
                                className="w-full appearance-none bg-white border border-blue-500 text-blue-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                            >
                                <option value="">Choisissez votre résidence</option>
                                <option value="12">Résidence 12</option>
                                <option value="36">Résidence 36</option>
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
                    {/* Étage */}
                    <div className="mb-4">
                        <div className="relative">
                            <select 
                                name="etage"
                                value={formData.etage}
                                onChange={handleChange}
                                className="w-full appearance-none bg-white border border-blue-500 text-blue-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                            >
                                <option value="">Choisissez votre étage</option>
                                <option value="1">Étage 1</option>
                                <option value="2">Étage 2</option>
                                <option value="3">Étage 3</option>
                                <option value="4">Étage 4</option>
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
                    {/* Chambre */}
                    <div className="mb-4">
                        <div className="relative">
                            <select 
                                name="chambre"
                                value={formData.chambre}
                                onChange={handleChange}
                                className="w-full appearance-none bg-white border border-blue-500 text-blue-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                            >
                                <option value="">Choisissez votre chambre</option>
                                <option value="picasso">Picasso</option>
                                <option value="monet">Monet</option>
                                <option value="vangogh">Van Gogh</option>
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
                </> 
            )}
            {/* Cas invitée */}
            {role === "invitee" && (
                <div className="mb-4">
                    <div className="relative">
                        <select
                            name="typeInvitee"
                            value={formData.typeInvitee}
                            onChange={handleChange}
                            className="w-full appearance-none bg-white border border-blue-500 text-blue-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                        >
                            <option value="">Type d&apos;invitée</option>
                            <option value="picasso">Étudiante</option>
                            <option value="monet">Autre</option>
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
            )} 
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-blue-800 mt-2">Informations personnelles</h2>
                <div className="w-full bg-blue-500 h-[2px]" />
            </div>
            {/* Mot de passe */}
            <input
                type="password"
                name="password"
                placeholder="Mot de passe"
                value={formData.password}
                onChange={handleChange}
                className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />
            {/* Confirmation */}
            <input
                type="password"
                name="confirmPassword"
                placeholder="Confirmez le mot de passe"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />
            {/* Bouton Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-2 border border-blue-600 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-800 transition cursor-pointer"
            > 
                {loading ? "Inscription..." : "S'inscrire"}
            </button>
            {/* Messages */}
            {errorMsg && (
                <p className="text-red-500 text-sm mt-3 text-center">{errorMsg}</p>
            )}
            {successMsg && (
                <p className="text-green-600 text-sm mt-3 text-center">{successMsg}</p>
            )}
        </form> 
    );
}
