"use client";

import Image from "next/image";
import { useState } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignInPage() {
    const supabase = createClientComponentClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const router = useRouter();

    useEffect(() => {
      // 1️⃣ Récupère depuis localStorage
      const savedEmail = localStorage.getItem("pendingEmail");
    
      if (savedEmail) {
        setEmail(savedEmail);
        localStorage.removeItem("pendingEmail");
        return;
      }
    }, []);

    // Connexion
    const handleSignIn = async () => {
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");
      
        // 1️⃣ Vérification côté client
        if (!email || !password) {
          setErrorMsg("Merci de remplir votre adresse e-mail et votre mot de passe.");
          setLoading(false);
          return;
        }
      
        // 2️⃣ Appel Supabase
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      
        // 3️⃣ Gestion des erreurs
        if (error) {
          handleAuthError(error);
          setLoading(false);
          return;
        }
      
        // 4️⃣ Succès
        // Appel de la route serveur
        await fetch("/api/sync-user", { method: "POST" });

        router.push("/homePage")
        setLoading(false);

    };
      
    // Fonction pour traduire les messages Supabase
    const handleAuthError = (error: Error) => {
        const message = error.message || "";
        
        if (message.includes("Invalid login credentials")) {
            setErrorMsg("Adresse e-mail ou mot de passe incorrect.");
        } else if (message.includes("Email not confirmed")) {
            setErrorMsg("Votre e-mail n’a pas encore été confirmé. Vérifiez votre boîte mail.");
        } else if (message.includes("Unable to validate email address: invalid format")) {
            setErrorMsg("Format d'email incorrect");
        } else {
            setErrorMsg("Une erreur est survenue. Veuillez réessayer.");
        }
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
                    <div className="flex gap-4 justify-center">
                      <button
                      onClick={() => router.push(`/completionProfile?role=residente`)}
                      className="px-6 py-2 border border-blue-600 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-800 transition cursor-pointer"
                      >
                        Résidente
                      </button>
                      <button
                      onClick={() => router.push(`/completionProfile?role=invitee`)}
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
