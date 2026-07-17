"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useSupabase } from "../providers";
import { formatEtage, formatChambre } from "@/lib/adminPeople";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ActivationPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [email, setEmail] = useState("");
  const [placeLabel, setPlaceLabel] = useState<string>("");

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [datenaissance, setDatenaissance] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const loadFor = useCallback(
    async (user: User) => {
      setEmail(user.email ?? "");
      const placeId = (user.user_metadata as { place_id?: string } | null)?.place_id;
      if (placeId) {
        const { data: place } = await supabase.from("places").select("*").eq("id", placeId).maybeSingle();
        if (place) {
          const name = place.label || formatChambre(place.code) || place.code;
          setPlaceLabel(
            place.kind === "poste"
              ? `Corail · ${name}`
              : `Résidence ${place.residence} · ${formatEtage(place.etage) ?? ""} · ${name}`.replace(/ · $/, "")
          );
        }
      }
      setReady(true);
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user && mounted && !ready) loadFor(s.user);
    });
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user && mounted) {
        loadFor(data.user);
      } else {
        // Laisse le temps au client de traiter le token du lien, sinon lien invalide.
        setTimeout(async () => {
          if (!mounted) return;
          const { data: retry } = await supabase.auth.getUser();
          if (retry.user) loadFor(retry.user);
          else setInvalid(true);
        }, 2500);
      }
    })();
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, ready, loadFor]);

  const submit = async () => {
    if (!nom.trim() || !prenom.trim()) return toast.error("Nom et prénom requis.");
    if (!datenaissance) return toast.error("Date de naissance requise.");
    if (password.length < 6) return toast.error("Le mot de passe doit contenir au moins 6 caractères.");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas.");

    setSubmitting(true);
    const { error: pwdErr } = await supabase.auth.updateUser({ password });
    if (pwdErr) {
      setSubmitting(false);
      return toast.error("Impossible de définir le mot de passe. Le lien a peut-être expiré.");
    }
    const res = await fetch("/api/activation/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, prenom, datenaissance }),
    });
    const j = await res.json();
    setSubmitting(false);
    if (!res.ok) return toast.error(j.error || "Erreur lors de l'activation.");
    setDone(true);
    setTimeout(() => router.push("/homePage"), 1800);
  };

  if (invalid) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50 text-center">
        <Image src="/logo.png" alt="Logo" width={160} height={160} className="mb-4" />
        <h1 className="text-xl font-bold text-blue-800 mb-2">Lien invalide ou expiré</h1>
        <p className="text-gray-500 max-w-sm">Ce lien d&apos;activation n&apos;est plus valide. Demandez à l&apos;intendance de vous renvoyer une invitation.</p>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50 text-center">
        <CheckCircle className="w-14 h-14 text-green-500 mb-4" />
        <h1 className="text-xl font-bold text-blue-800 mb-1">Compte activé 🎉</h1>
        <p className="text-gray-500">Redirection vers l&apos;application…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 bg-gray-50">
      <Image src="/logo.png" alt="Logo" width={150} height={150} className="mb-3" />
      <div className="w-full max-w-sm bg-white shadow-md rounded-2xl p-6">
        <h1 className="text-xl font-bold text-blue-800 mb-1">Activer mon compte</h1>
        <p className="text-sm text-gray-500 mb-5">Bienvenue ! Complétez votre profil et choisissez un mot de passe.</p>

        {/* Infos imposées (verrouillées) */}
        <div className="mb-5 space-y-2">
          <LockedField label="Email" value={email} />
          {placeLabel && <LockedField label="Logement / poste" value={placeLabel} />}
        </div>

        <div className="space-y-3">
          <Field label="Nom">
            <input value={nom} onChange={(e) => setNom(e.target.value)} className="inp" placeholder="Votre nom" />
          </Field>
          <Field label="Prénom">
            <input value={prenom} onChange={(e) => setPrenom(e.target.value)} className="inp" placeholder="Votre prénom" />
          </Field>
          <Field label="Date de naissance">
            <input type="date" value={datenaissance} onChange={(e) => setDatenaissance(e.target.value)} className="inp" />
          </Field>
          <Field label="Mot de passe">
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="inp pr-10"
                placeholder="Au moins 6 caractères"
              />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirmer le mot de passe">
            <input type={showPwd ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="inp" placeholder="Confirmez" />
          </Field>
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
        >
          <Lock className="w-4 h-4" /> {submitting ? "Activation…" : "Activer mon compte"}
        </button>
      </div>

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 0.625rem;
          font-size: 0.95rem;
          outline: none;
        }
        :global(.inp:focus) {
          box-shadow: 0 0 0 2px #2563eb;
          border-color: #2563eb;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 truncate">{value}</p>
      </div>
      <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
    </div>
  );
}
