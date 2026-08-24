"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Send, X } from "lucide-react";
import { useMyRights } from "@/lib/useMyRights";

type Invitation = { id: string; email: string; created_at: string; expires_at: string };

// Inviter une super-administratrice côté client, sans lui attribuer de chambre.
//
// Au démarrage d'un foyer il n'existe encore ni bloc, ni étage, ni chambre : la voie
// d'invitation habituelle, qui exige une place libre, ne peut pas servir. C'est
// pourtant le moment où il faut passer la main, pour que l'installation du foyer ne
// dépende plus du compte technique.
export default function SuperAdminsPanel() {
  // Visible du seul compte technique, pas des super-admins clients : l'API applique
  // la même règle, ce composant ne fait que ne pas s'afficher.
  const estTechnique = useMyRights().rights.is_technique;
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [attente, setAttente] = useState<Invitation[]>([]);

  const recharger = useCallback(async () => {
    if (!estTechnique) return;
    const r = await fetch("/api/admin/invitations/super-admin");
    if (r.ok) setAttente((await r.json()).invitations ?? []);
  }, [estTechnique]);

  useEffect(() => { recharger(); }, [recharger]);

  if (!estTechnique) return null;

  const inviter = async () => {
    setEnvoi(true);
    const r = await fetch("/api/admin/invitations/super-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const corps = await r.json();
    setEnvoi(false);
    if (!r.ok) return toast.error(corps.error ?? "Invitation impossible.");
    toast.success(corps.message ?? "Invitation envoyée.");
    setEmail("");
    recharger();
  };

  const annuler = async (id: string) => {
    const r = await fetch("/api/admin/invitations/super-admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!r.ok) return toast.error((await r.json()).error ?? "Annulation impossible.");
    toast.success("Invitation annulée.");
    recharger();
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" /> Super-administratrices
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Une super-administratrice a tous les droits, sur toutes les sections, et peut à son tour
        régler l&apos;identité du foyer. Elle n&apos;occupe <strong>aucune chambre</strong> et
        n&apos;entre pas dans la capacité du foyer — on peut donc l&apos;inviter avant même
        d&apos;avoir créé le moindre bloc.
        <br />
        Si l&apos;adresse correspond à un compte existant, il est promu sans nouvel email.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && email && !envoi) inviter(); }}
          placeholder="adresse@exemple.fr"
          className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
        <button
          onClick={inviter}
          disabled={envoi || !email}
          className="flex items-center justify-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" /> {envoi ? "Envoi…" : "Inviter"}
        </button>
      </div>

      {attente.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-600 mb-2">Invitations en attente</p>
          <ul className="space-y-1">
            {attente.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span className="truncate">{i.email}</span>
                <button
                  onClick={() => annuler(i.id)}
                  className="flex items-center gap-1 text-xs text-red-700 hover:underline shrink-0 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Annuler
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
