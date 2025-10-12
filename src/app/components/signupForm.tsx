'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Role = "residente" | "invitee";

interface Props {
    role: Role;
    onSubmit: (email: string, password: string) => Promise<void>;
  }

export default function SignupForm({ role, onSubmit }: Props) {
    const [formData, setFormData] = useState({
        nom: "",
        prenom: "",
        datenaissance: "",
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

    // Regarder si l'email est déjà associé à un compte
    const checkUserExists = async (email: string) => {
        const res = await fetch('/api/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
        });
        const data = await res.json();
        return data.exists;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

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
            // On vérifie si l'adresse mail n'existe pas déjà
            const exists = await checkUserExists(formData.email);
  
            if (exists) {
                setErrorMsg("Un compte existe déjà avec cette adresse email. Veuillez vous connecter.");
                setLoading(false);
                return;
            }
            
            // Création du compte supabase
            const email = formData.email
            const password = formData.password
            
            // On enregistre l'email
            localStorage.setItem("pendingEmail", email);

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: `${window.location.origin}/signin` }
            });
        
            if (error) {
                setErrorMsg(`Erreur lors de la création du compte : ${error.message}`);
            }

            // Insertion dans la table pending_user
            const insertData = {
                email: formData.email,
                role: role,
                nom: formData.nom,
                prenom: formData.prenom,
                datenaissance: role === "residente" ? formData.datenaissance : null,
                residence: role === "residente" ? formData.residence : null,
                etage: role === "residente" ? formData.etage : null,
                chambre: role === "residente" ? formData.chambre : null,
              };
            
            //const { error: insertError } = await supabase.from("pending_users").insert(insertData);

            //if (insertError) {
              //  setErrorMsg("Erreur lors de la création du compte");
                //console.error(insertError)
            //};

            setSuccessMsg("Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.");
            setLoading(false);

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
                        name="datenaissance"
                        placeholder="Date de naissance"
                        value={formData.datenaissance}
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
            {/* Prénom */}
            <input
                type="text"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange} 
                className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />
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
