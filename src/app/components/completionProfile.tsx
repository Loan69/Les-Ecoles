"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import SignupForm from "@/app/components/signupForm";
import LoadingSpinner from "./LoadingSpinner";

type Role = "residente" | "invitee";

export default function CompletionProfileClient() {
  const [role, setRole] = useState<Role>("residente");
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const urlRole = searchParams.get("role");
    if (urlRole === "residente" || urlRole === "invitee") {
      setRole(urlRole);
      setLoading(false);
    } else {
      router.push("/signin");
    }
  }, [searchParams, router]);

  const handleCreateAccount = async (email: string, password: string) => {
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/signin?email=${encodeURIComponent(email)}`,
          data: { role },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg("Un e-mail de confirmation a été envoyé ! Vérifiez votre boîte mail.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur est survenue lors de la création du compte.");
    }
  };

  if (loading)
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <SignupForm role={role} onSubmit={handleCreateAccount} />
      {errorMsg && <p className="text-red-500 mt-4 text-center">{errorMsg}</p>}
      {successMsg && <p className="text-green-600 mt-4 text-center">{successMsg}</p>}
    </div>
  );
}
