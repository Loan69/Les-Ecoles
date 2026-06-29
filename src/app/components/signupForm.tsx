"use client";

import { useState } from "react";
import { useSupabase } from "@/app/providers";
import DynamicSelectGroup from "./DynamicSelectGroup";
import { Option } from "@/types/Option";
import DateNaissanceSelect from "./DateNaissanceSelect";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Role = "residente" | "invitee";

interface Props {
  role: Role;
}

export default function SignupForm({ role }: Props) {
  const { supabase } = useSupabase();
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
  const [selection, setSelection] = useState<{ [category: string]: Option }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const checkUserExists = async (email: string) => {
    const res = await fetch("/api/check-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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

    const missingFields: string[] = [];
    if (!formData.nom.trim()) missingFields.push("nom");
    if (!formData.prenom.trim()) missingFields.push("prénom");
    if (!formData.email.trim()) missingFields.push("email");
    if (!formData.password.trim() || !formData.confirmPassword.trim()) {
      missingFields.push("mot de passe");
    }
    if (role === "residente") {
      if (!formData.datenaissance) missingFields.push("date de naissance");
      if (!selection.residence?.value) missingFields.push("résidence");
      if (selection.residence?.value !== "corail") {
        if (!selection.etage?.value) missingFields.push("étage");
        if (!selection.chambre?.value) missingFields.push("chambre");
      }
    }
    if (role === "invitee") {
      if (!formData.typeInvitee) missingFields.push("type d'invitée");
    }

    if (missingFields.length > 0) {
      toast.error(`Champs obligatoires manquants : ${missingFields.join(", ")}`);
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    try {
      const exists = await checkUserExists(formData.email);
      if (exists) {
        setErrorMsg("Un compte existe déjà avec cette adresse email. Veuillez vous connecter.");
        setLoading(false);
        return;
      }

      const email = formData.email;
      const insertData = {
        email,
        role,
        nom: formData.nom,
        prenom: formData.prenom,
        datenaissance: role === "residente" ? formData.datenaissance : null,
        residence: role === "residente" ? selection.residence?.value || null : null,
        etage: role === "residente" ? selection.etage?.value || null : null,
        chambre: role === "residente" ? selection.chambre?.value || null : null,
        typeInvitee: role === "invitee" ? formData.typeInvitee : null,
      };

      const { error: insertError } = await supabase.from("pending_users").insert(insertData);
      if (insertError) {
        setErrorMsg("Erreur lors de la création du compte (insertion)");
        setLoading(false);
        return;
      }

      localStorage.setItem("pendingEmail", email);

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: { emailRedirectTo: `${window.location.origin}/signin` },
      });

      if (signUpError) {
        await supabase.from("pending_users").delete().eq("email", email);
        setErrorMsg(`Erreur lors de la création du compte : ${signUpError.message}`);
        setLoading(false);
        return;
      }

      setSuccessMsg("Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.");
      setLoading(false);
    } catch (err) {
      if (formData.email) {
        await supabase.from("pending_users").delete().eq("email", formData.email);
      }
      setErrorMsg(err instanceof Error ? err.message : "Une erreur inconnue est survenue.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md bg-white shadow-md rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-blue-800">Informations complémentaires</h2>
        <div className="w-full bg-blue-500 h-[2px]" />
      </div>

      <input
        type="text"
        name="nom"
        placeholder="Nom"
        value={formData.nom}
        onChange={handleChange}
        className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 focus:ring-2 focus:ring-blue-500"
      />

      <input
        type="text"
        name="prenom"
        placeholder="Prénom"
        value={formData.prenom}
        onChange={handleChange}
        className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 focus:ring-2 focus:ring-blue-500"
      />

      {role === "residente" && (
        <>
          <DateNaissanceSelect
            value={formData.datenaissance}
            onChange={(v) => setFormData({ ...formData, datenaissance: v })}
          />
          <DynamicSelectGroup
            rootCategory="residence"
            onChange={(selected) => setSelection(selected)}
          />
        </>
      )}

      {role === "invitee" && (
        <div className="mb-4">
          <div className="relative">
            <select
              name="typeInvitee"
              value={formData.typeInvitee}
              onChange={handleChange}
              className="w-full appearance-none bg-white border border-blue-500 text-blue-800 px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Type d&apos;invitée</option>
              <option value="picasso">Étudiante</option>
              <option value="monet">Autre</option>
            </select>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mt-2">Informations personnelles</h2>
        <div className="w-full bg-blue-500 h-[2px]" />
      </div>

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        className="w-full mb-3 px-4 py-2 border border-blue-500 text-blue-800 focus:ring-2 focus:ring-blue-500"
      />

      <div className="relative w-full mb-3">
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Mot de passe"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-4 py-2 pr-10 border border-blue-500 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800"
        >
          {showPassword ? <EyeOff className="cursor-pointer" size={20} /> : <Eye className="cursor-pointer" size={20} />}
        </button>
      </div>

      <div className="relative w-full mb-3">
        <input
          type={showPasswordConfirm ? "text" : "password"}
          name="confirmPassword"
          placeholder="Confirmez le mot de passe"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full px-4 py-2 pr-10 border border-blue-500 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800"
        >
          {showPasswordConfirm ? <EyeOff className="cursor-pointer" size={20} /> : <Eye className="cursor-pointer" size={20} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer w-full px-6 py-2 border border-blue-600 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-800 transition"
      >
        {loading ? "Inscription..." : "S'inscrire"}
      </button>

      {errorMsg && <p className="text-red-500 text-sm mt-3 text-center">{errorMsg}</p>}
      {successMsg && <p className="text-green-600 text-sm mt-3 text-center">{successMsg}</p>}
    </form>
  );
}
