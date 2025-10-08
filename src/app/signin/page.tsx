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
        setLoading(false);
        router.push("/homePage");
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
      

    // Inscription
    const handleSignUp = async (role: string) => {
        // Éviter le double clic
        if (loadingInscription) return;
      
        // Validation basique
        if (!emailInscription) {
          setErrorMsg("Veuillez entrer votre adresse e-mail.");
          return;
        }
      
        setLoadingInscription(true);
        setSuccessMsg("");
        setErrorMsg("");
      
        try {
          // Vérifier si l'email existe déjà dans pending_users
          const { data: existingPending, error: pendingCheckError } = await supabase
            .from("pending_users")
            .select("emailInscription")
            .eq("emailInscription", emailInscription)
            .single();
      
          if (pendingCheckError && pendingCheckError.code !== "PGRST116") {
            // PGRST116 = Pas de ligne trouvée (normal)
            throw new Error("Erreur lors de la vérification de l'email existant.");
          }
      
          if (existingPending) {
            setErrorMsg("Cette adresse e-mail a déjà été utilisée pour une inscription.");
            setLoadingInscription(false);
            return;
          }
      
          // Générer un mot de passe temporaire
          const tempPassword = Math.random().toString(36).slice(-8);
      
          // Créer le compte dans Supabase Auth
          const { error: signUpError } = await supabase.auth.signUp({
            email: emailInscription,
            password: tempPassword,
            options: {
              emailRedirectTo: `${window.location.origin}/completionProfile?email=${emailInscription}`,
              data: { role },
            },
          });
      
          if (signUpError) {
            // Erreurs côté Supabase
            if (signUpError.message.includes("User already registered")) {
              setErrorMsg("Un compte existe déjà avec cette adresse e-mail.");
            } else {
                handleAuthError(signUpError);
            }
            setLoadingInscription(false);
            return;
          }
      
          // Ajouter dans la table pending_users
          const { error: pendingError } = await supabase
            .from("pending_users")
            .insert([{ emailInscription, role }]);
      
          if (pendingError) {
            console.error(pendingError.message);
            setErrorMsg("Une erreur est survenue lors de l’ajout du compte en attente.");
            setLoadingInscription(false);
            return;
          }
      
          // Succès
          setSuccessMsg("Un e-mail de confirmation vous a été envoyé !");
        } catch (err) {
            if (err instanceof Error) {
                console.error(err);
                setErrorMsg(err.message || "Une erreur est survenue.");
              } else {
                console.error(err);
                setErrorMsg("Une erreur inconnue est survenue.");
              }
        } finally {
          setLoadingInscription(false);
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
