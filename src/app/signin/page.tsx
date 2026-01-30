"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useSupabase } from "../providers";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react"; 

export default function SignInPage() {
    const { supabase } = useSupabase();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
      const savedEmail = localStorage.getItem("pendingEmail");
    
      if (savedEmail) {
        setEmail(savedEmail);
        localStorage.removeItem("pendingEmail");
      }
    }, []);

    // Connexion
    const handleSignIn = async () => {
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");
      
        if (!email || !password) {
          setErrorMsg("Merci de remplir votre adresse e-mail et votre mot de passe.");
          setLoading(false);
          return;
        }
      
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      
        if (error) {
          handleAuthError(error);
          setLoading(false);
          return;
        }
      
        await fetch("/api/sync-user", { method: "POST" });
        router.push("/homePage");
        setLoading(false);
    };

    // Réinitialisation du mot de passe
    const handleResetPassword = async () => {
      setResetLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      if (!email) {
        setErrorMsg("Merci de renseigner votre adresse e-mail.");
        setResetLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/resetPassword`,
      });

      if (error) {
        setErrorMsg("Une erreur est survenue. Vérifiez votre adresse e-mail.");
        setResetLoading(false);
        return;
      }

      setSuccessMsg("Un e-mail de réinitialisation a été envoyé. Vérifiez votre boîte mail.");
      setShowResetPassword(false);
      setResetLoading(false);
    };
      
    const handleAuthError = (error: Error) => {
        const message = error.message || "";
        
        if (message.includes("Invalid login credentials")) {
            setErrorMsg("Adresse e-mail ou mot de passe incorrect.");
        } else if (message.includes("Email not confirmed")) {
            setErrorMsg("Votre e-mail n'a pas encore été confirmé. Vérifiez votre boîte mail.");
        } else if (message.includes("Unable to validate email address: invalid format")) {
            setErrorMsg("Format d'email incorrect");
        } else {
            setErrorMsg("Une erreur est survenue. Veuillez réessayer.");
        }
    };  
      
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
            <Image
                src="/logo.png"
                alt="Logo des écoles"
                width={400}
                height={400}
                className="mb-3"
            />

            <div className="w-full max-w-sm bg-white shadow-md rounded-2xl p-6">
            <h1 className="text-2xl text-black font-bold text-blue-800">
              {showResetPassword ? "Mot de passe oublié" : "Connexion"}
            </h1>
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

            {/* Affichage conditionnel : Mot de passe ou Reset */}
            {!showResetPassword ? (
              <>
                <div className="relative w-full mb-3">
                  <input
                    type={showPassword ? "text" : "password"} // Change selon l'état
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSignIn();
                    }}
                    className="w-full px-4 py-2 pr-10 border border-blue-500 text-blue-800 
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800"
                  >
                    {showPassword ? <EyeOff className= "cursor-pointer" size={20} /> : 
                                    <Eye className= "cursor-pointer" size={20} />
                    }
                  </button>
                </div>

                <button
                    onClick={handleSignIn}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition cursor-pointer"
                >
                    {loading ? "Connexion..." : "Je me connecte"}
                </button>

                {/* Messages */}
                {errorMsg && (
                    <p className="text-red-500 text-sm mt-3 text-center">{errorMsg}</p>
                )}
                {successMsg && (
                    <p className="text-green-600 text-sm mt-3 text-center">{successMsg}</p>
                )}

                {/* Lien mot de passe oublié */}
                <button
                  onClick={() => setShowResetPassword(true)}
                  className="w-full text-blue-600 text-sm mt-3 hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>

                <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="w-full bg-blue-600 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition cursor-pointer mb-2"
                >
                    {resetLoading ? "Envoi..." : "Envoyer le lien"}
                </button>

                <button
                  onClick={() => {
                    setShowResetPassword(false);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="w-full text-blue-600 text-sm hover:underline cursor-pointer"
                >
                  Retour à la connexion
                </button>
              </>
            )}
            
            {/* Inscription */}
            {!showResetPassword && (
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
            )}
            </div>
        </div>
    );
}