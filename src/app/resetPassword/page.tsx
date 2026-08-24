"use client";

import LogoFoyer from "@/app/components/LogoFoyer";
import { useState, useEffect } from "react";
import { useSupabase } from "../providers";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const { supabase } = useSupabase();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // L'utilisateur a cliqué sur le lien de réinitialisation
      }
    });
  }, [supabase]);

  // ✅ Validation en temps réel de la force du mot de passe
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (password.length < 6) return { strength: 1, label: "Faible", color: "text-red-500" };
    if (password.length < 8) return { strength: 2, label: "Moyen", color: "text-yellow-500" };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 3, label: "Fort", color: "text-green-500" };
    }
    return { strength: 2, label: "Moyen", color: "text-yellow-500" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // ✅ Traduction des erreurs Supabase
  const translateError = (error: Error) => {
    const message = error?.message || "";
    
    // Erreurs courantes de Supabase Auth
    if (message.includes("New password should be different")) {
      return "Le nouveau mot de passe doit être différent de l'ancien.";
    }
    if (message.includes("Password should be at least 6 characters")) {
      return "Le mot de passe doit contenir au moins 6 caractères.";
    }
    if (message.includes("User not found")) {
      return "Session expirée. Veuillez demander un nouveau lien de réinitialisation.";
    }
    if (message.includes("Invalid token")) {
      return "Le lien de réinitialisation a expiré ou est invalide.";
    }
    if (message.includes("Token expired")) {
      return "Ce lien a expiré. Veuillez demander un nouveau lien de réinitialisation.";
    }
    if (message.includes("same as the old password")) {
      return "Le nouveau mot de passe ne peut pas être identique à l'ancien.";
    }
    
    // Erreur générique
    return "Une erreur est survenue. Veuillez réessayer ou demander un nouveau lien.";
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Validations côté client
    if (!newPassword || !confirmPassword) {
      setErrorMsg("Merci de remplir tous les champs.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    // Recommandation de sécurité
    if (newPassword.length < 8) {
      setErrorMsg("Pour votre sécurité, nous recommandons un mot de passe d'au moins 8 caractères.");
      setLoading(false);
      return;
    }

    // Mise à jour du mot de passe
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setErrorMsg(translateError(error));
      setLoading(false);
      return;
    }

    setSuccessMsg("✅ Votre mot de passe a été réinitialisé avec succès !");
    
    // Redirection après 2 secondes
    setTimeout(() => {
      router.push("/signin");
    }, 2000);

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <LogoFoyer className="mb-3" />

      <div className="w-full max-w-sm bg-white shadow-md rounded-2xl p-6">
        <h1 className="text-2xl text-black font-bold text-blue-800">
          🔐 Nouveau mot de passe
        </h1>
        <div className="w-full bg-blue-500 h-[2px] mb-4" />

        <p className="text-sm text-gray-600 mb-4">
          Choisissez un nouveau mot de passe sécurisé pour votre compte.
        </p>

        {/* Nouveau mot de passe */}
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border border-blue-500 text-blue-800 
            focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm cursor-pointer"
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>

        {/* Indicateur de force du mot de passe */}
        {newPassword && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength.strength === 1
                      ? "bg-red-500 w-1/3"
                      : passwordStrength.strength === 2
                      ? "bg-yellow-500 w-2/3"
                      : "bg-green-500 w-full"
                  }`}
                />
              </div>
              <span className={`text-xs font-medium ${passwordStrength.color}`}>
                {passwordStrength.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Recommandation : 8 caractères minimum avec majuscules et chiffres
            </p>
          </div>
        )}

        {/* Confirmation du mot de passe */}
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleResetPassword();
          }}
          className="w-full mb-4 px-4 py-2 border border-blue-500 text-blue-800 
          focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleResetPassword}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
        </button>

        {errorMsg && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm text-center">{successMsg}</p>
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/signin")}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}