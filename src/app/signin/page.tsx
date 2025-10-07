"use client";

import Image from "next/image";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [emailInscription, setEmailInscription] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingInscription, setLoadingInscription] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const router = useRouter();

    // Connexion
    const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) setErrorMsg(error.message);
    else {
        setLoading(false);
        router.push("/homePage")
        }
    }

    // Inscription
    const handleSignUp = async (role: string) => {
        if (!emailInscription) {
            alert('Veuillez entrer votre email.')
            return
          }
        setLoadingInscription(true);
        setSuccessMsg("");

        // Ajouter dans pending_users
        const { error: pendingError } = await supabase
        .from("pending_users")
        .insert({ emailInscription, role });

        if (pendingError) {
            setErrorMsg(pendingError.message)
        };

        // mot de passe temporaire
        const tempPassword = Math.random().toString(36).slice(-8);

        const { error } = await supabase.auth.signUp({
        email: emailInscription,
        password: tempPassword,
        options: {
            emailRedirectTo: `${window.location.origin}/completionProfile?email=${emailInscription}`,
            data: { role },
        },
        });

        if (error) {
        setErrorMsg(error.message);
        } else {
        setSuccessMsg("Un email de confirmation vous a été envoyé !");
        }

        setLoadingInscription(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
            {/* Logo */}
            <Image
                src="/logo.png"
                alt="Logo des écoles"
                width={400}   // ajuster selon la taille souhaitée
                height={400}
                className="mb-3"
            />

            {/* Formulaire */}
            <div className="w-full max-w-sm bg-white shadow-md rounded-2xl p-6">
            <h1 className="text-2xl text-black font-bold text-blue-800">Connexion</h1>
            <div className="w-full bg-blue-500 h-[2px] mb-2" />
            {/* Email */}
            <input
                type="email"
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Mot de passe */}
            <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Bouton connexion */}
            <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition cursor-pointer"
            >
                {loading ? "Connexion..." : "Je me connecte"}
            </button>
            
            {/* Inscription */}
            <div className="mt-8">
                <h1 className="text-2xl text-blue-800 font-bold">Ou inscrivez-vous</h1>
                <div className="w-full bg-blue-500 h-[2px] mb-2" />
                    {/* Email */}
                    <input
                        type="email"
                        placeholder="Entrer un email"
                        value={emailInscription}
                        onChange={(e) => setEmailInscription(e.target.value)}
                        className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex gap-4 justify-center">
                        <button
                        onClick={() => handleSignUp("residente")}
                        className="px-6 py-2 border border-blue-600 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-800 transition cursor-pointer"
                        >
                        Résidente
                        </button>
                        <button
                        onClick={() => handleSignUp("invitee")}
                        className="px-6 py-2 border border-blue-600 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-800 transition cursor-pointer"
                        >
                        Invitée
                        </button>
                    </div>
                </div>
                {/* Messages */}
                {errorMsg && (
                    <p className="text-red-500 text-sm mt-3 text-center">{errorMsg}</p>
                )}
                {successMsg && (
                    <p className="text-green-600 text-sm mt-3 text-center">{successMsg}</p>
                )}
            </div>
        </div>
    );
}
