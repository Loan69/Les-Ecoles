"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Building2, Upload, Trash2 } from "lucide-react";
import { useMyRights } from "@/lib/useMyRights";
import { useIdentite } from "@/app/providers";
import { CLES_IDENTITE, FUSEAUX, LOCALES, type CleIdentite } from "@/lib/foyer";

// Identité du foyer : ce qui fait que l'application s'appelle « Guerlédan » plutôt
// que « Les Écoles ». Réservé au super-admin — l'API et la policy SQL disent la même
// chose, ce composant ne fait que ne pas s'afficher.
//
// Après enregistrement on recharge la page entière : le titre de l'onglet et le
// manifeste sont produits par le serveur (generateMetadata), un simple re-rendu
// React ne les mettrait pas à jour.

// Fuseau et format de date sont des LISTES, pas des champs libres : « Europe/Pris »
// ferait échouer silencieusement tous les calculs de verrouillage.
const LISTES: { cle: CleIdentite; label: string; aide: string; options: readonly { value: string; label: string }[] }[] = [
  { cle: "foyer_fuseau", label: "Fuseau horaire", aide: "Référence des heures de verrouillage des repas et de la présence.", options: FUSEAUX },
  { cle: "foyer_locale", label: "Format des dates", aide: "Façon dont les dates s’écrivent dans l’application.", options: LOCALES },
];

const CHAMPS: { cle: CleIdentite; label: string; aide: string; type?: string }[] = [
  { cle: "foyer_nom", label: "Nom du foyer", aide: "Titre de l'onglet du navigateur, et nom utilisé dans les emails." },
  { cle: "foyer_nom_court", label: "Nom court", aide: "Sous l'icône, quand l'application est installée sur un téléphone. Deux mots maximum." },
  { cle: "foyer_description", label: "Description", aide: "Phrase reprise par les aperçus de lien et sous l’icône de l’application installée. Invisible dans l’application elle-même." },
];

export default function IdentiteFoyerSettings() {
  const estSuperAdmin = useMyRights().isSuperAdmin;
  const identiteCourante = useIdentite();
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoiLogo, setEnvoiLogo] = useState<"logo" | "icone" | null>(null);
  const champLogo = useRef<HTMLInputElement>(null);
  const champIcone = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!estSuperAdmin) { setChargement(false); return; }
    (async () => {
      const r = await fetch("/api/admin/identite");
      if (r.ok) {
        const { reglages } = (await r.json()) as { reglages: { key: string; value: string }[] };
        setValeurs(Object.fromEntries(reglages.map((l) => [l.key, l.value])));
      }
      setChargement(false);
    })();
  }, [estSuperAdmin]);

  if (!estSuperAdmin || chargement) return null;

  const enregistrer = async () => {
    setEnregistrement(true);
    const corps = Object.fromEntries(CLES_IDENTITE.filter((c) => c in valeurs).map((c) => [c, valeurs[c]]));
    const r = await fetch("/api/admin/identite", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    setEnregistrement(false);
    if (!r.ok) return toast.error((await r.json()).error ?? "Enregistrement impossible.");
    toast.success("Identité enregistrée.");
    window.location.reload();
  };

  const envoyerImage = async (cible: "logo" | "icone", fichier: File) => {
    setEnvoiLogo(cible);
    const form = new FormData();
    form.append("cible", cible);
    form.append("fichier", fichier);
    const r = await fetch("/api/admin/identite/logo", { method: "POST", body: form });
    setEnvoiLogo(null);
    if (!r.ok) return toast.error((await r.json()).error ?? "Téléversement impossible.");
    toast.success("Enregistré.");
    window.location.reload();
  };

  const retirerImage = async (cible: "logo" | "icone") => {
    const r = await fetch("/api/admin/identite/logo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cible }),
    });
    if (!r.ok) return toast.error((await r.json()).error ?? "Suppression impossible.");
    toast.success("Retiré.");
    window.location.reload();
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-blue-600" /> Identité du foyer
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Le nom, le logo et la couleur de l&apos;application. Visibles dès l&apos;écran de connexion,
        avant même que quiconque se connecte.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {CHAMPS.map(({ cle, label, aide, type }) => (
          <div key={cle}>
            <label htmlFor={cle} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            <input
              id={cle}
              type={type ?? "text"}
              value={valeurs[cle] ?? ""}
              onChange={(e) => setValeurs((v) => ({ ...v, [cle]: e.target.value }))}
              className={`border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none ${
                type === "color" ? "h-10 w-20 p-1" : "w-full"
              }`}
            />
            <p className="text-xs text-gray-400 mt-1">{aide}</p>
          </div>
        ))}

        {LISTES.map(({ cle, label, aide, options }) => (
          <div key={cle}>
            <label htmlFor={cle} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            <select
              id={cle}
              value={valeurs[cle] ?? ""}
              onChange={(e) => setValeurs((v) => ({ ...v, [cle]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {/* Une valeur déjà en base mais absente de la liste reste sélectionnable :
                  on n'écrase pas en silence un réglage qu'on ne reconnaît pas. */}
              {valeurs[cle] && !options.some((o) => o.value === valeurs[cle]) && (
                <option value={valeurs[cle]}>{valeurs[cle]} (valeur actuelle)</option>
              )}
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">{aide}</p>
          </div>
        ))}
      </div>

      {/* Images ---------------------------------------------------------- */}
      {/* Deux images distinctes, et c'est volontaire : un logo d'en-tête est
          transparent et large — parfait dans l'application, désastreux en icône,
          où iOS et Android composent la transparence sur du NOIR et où un format
          allongé devient illisible à 180 px. */}
      <div className="mt-5 pt-5 border-t border-gray-100 grid gap-6 sm:grid-cols-2">
        {([
          {
            cible: "logo" as const,
            titre: "Logo",
            url: identiteCourante.logoUrl,
            champ: champLogo,
            vide: "Aucun logo — les écrans affichent le nom du foyer.",
            aide: "Affiché en tête des écrans. La transparence est bienvenue ici.",
            fond: "",
          },
          {
            cible: "icone" as const,
            titre: "Icône de l'application",
            url: identiteCourante.iconeUrl,
            champ: champIcone,
            vide: "Aucune icône — une icône neutre est utilisée.",
            aide: "Écran d'accueil du téléphone. Carrée et sur fond OPAQUE : une image transparente s'affiche sur fond noir.",
            fond: "bg-white",
          },
        ]).map(({ cible, titre, url, champ, vide, aide, fond }) => (
          <div key={cible}>
            <p className="block text-sm font-medium text-gray-600 mb-2">{titre}</p>
            <div className="flex flex-wrap items-center gap-3">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={titre} className={`h-16 w-auto max-w-[120px] object-contain rounded border border-gray-100 p-1 ${fond}`} />
              ) : (
                <span className="text-sm text-gray-400 italic">{vide}</span>
              )}

              <input
                ref={champ}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) envoyerImage(cible, f); e.target.value = ""; }}
              />
              <button
                onClick={() => champ.current?.click()}
                disabled={envoiLogo !== null}
                className="flex items-center gap-1 bg-white border border-blue-200 text-blue-800 rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-4 h-4" /> {envoiLogo === cible ? "Envoi…" : url ? "Remplacer" : "Choisir"}
              </button>

              {url && (
                <button onClick={() => retirerImage(cible)} className="flex items-center gap-1 text-xs text-red-700 hover:underline cursor-pointer">
                  <Trash2 className="w-4 h-4" /> Retirer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">{aide}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">PNG, JPEG, WebP ou SVG, 2 Mo maximum.</p>

      <div className="mt-5">
        <button
          onClick={enregistrer}
          disabled={enregistrement}
          className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" /> {enregistrement ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}
