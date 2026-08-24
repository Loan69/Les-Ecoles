// Recette RLS — vérifie les deux moitiés à la fois :
//   1. plus rien ne fuit en anonyme ;
//   2. une personne connectée voit toujours ce dont l'appli a besoin.
//
//   node scripts/verif-rls.mjs                       → lecture seule
//   node scripts/verif-rls.mjs --ecriture            → + sonde d'écriture anonyme
//
// Identifiants de la phase connectée : deux lignes à ajouter TEMPORAIREMENT dans
// .env.local (fichier ignoré par git), puis à retirer après la recette :
//   VERIF_EMAIL=adresse@exemple.fr
//   VERIF_PASSWORD=motdepasse
// Ils peuvent aussi venir de l'environnement. Sans eux, seule la phase anonyme tourne.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lisibles en anonyme À DESSEIN : le formulaire d'inscription des invitées les
// affiche avant que le compte existe. Aucune donnée personnelle.
const ANON_ATTENDU = new Set(["residences", "etages"]);

// Tables que l'appli DOIT pouvoir lire une fois connectée. Un 0 ici veut dire
// qu'un écran est cassé.
const REQUISES = new Set([
  "residentes", "evenements", "meal_options", "meal_service_options",
  "invites", "invites_repas", "admin_sections", "app_settings",
  "places", "groupes", "residences", "etages", "select_options_residence",
]);

const TABLES = [
  "residentes", "invitees", "pending_users", "invitations", "places", "etages",
  "residences", "groupes", "groupe_membres", "presences", "absences_sejour",
  "absences", "evenements", "meal_options", "meal_service_options", "invites",
  "invites_repas", "meal_audit_log", "admin_sections", "app_settings",
  "select_options_residence", "select_options_evenement", "select_options_rappel",
  "select_options_recurrence",
];

const compter = async (table, jeton) => {
  const r = await fetch(`${URL_BASE}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jeton ?? ANON}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (r.status === 401 || r.status === 403) return "refus";
  const cr = r.headers.get("content-range");
  return cr ? Number(cr.split("/")[1]) : `HTTP ${r.status}`;
};

const connexion = async () => {
  // Identifiants pris dans l'environnement, ou à défaut dans .env.local (ignoré par git) :
  // le shell interactif n'étant pas disponible ici, écrire deux lignes dans .env.local
  // évite de faire passer le mot de passe par l'historique du terminal.
  const email = process.env.VERIF_EMAIL ?? env.VERIF_EMAIL;
  const motdepasse = process.env.VERIF_PASSWORD ?? env.VERIF_PASSWORD;
  if (!email || !motdepasse) return null;
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: motdepasse }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Connexion refusée : ${j.error_description ?? j.msg ?? r.status}`);
  return j.access_token;
};

// Sonde d'écriture : réécrit `nom` avec SA PROPRE VALEUR. Aucune donnée ne change,
// même si la policy laisse passer — c'est justement ce qu'on cherche à savoir.
const sondeEcritureAnonyme = async () => {
  const r0 = await fetch(`${URL_BASE}/rest/v1/residentes?select=user_id,nom&limit=1`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const lignes = await r0.json();
  if (!Array.isArray(lignes) || !lignes.length) {
    console.log("  résidentes illisibles en anonyme → sonde d'écriture sans objet ✅");
    return;
  }
  const { user_id, nom } = lignes[0];
  const r = await fetch(`${URL_BASE}/rest/v1/residentes?user_id=eq.${user_id}`, {
    method: "PATCH",
    headers: {
      apikey: ANON, Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: JSON.stringify({ nom }),
  });
  const res = await r.json().catch(() => null);
  const modifiees = Array.isArray(res) ? res.length : 0;
  console.log(modifiees > 0
    ? `  🔴 ÉCHEC — l'anonyme a modifié ${modifiees} ligne(s) de residentes. Le hotfix n'est pas passé.`
    : `  ✅ écriture anonyme sur residentes refusée (HTTP ${r.status})`);
};

const jeton = await connexion();
console.log(`\nBase : ${URL_BASE}`);
console.log(jeton ? "Phase connectée : activée\n" : "Phase connectée : ignorée — ajoutez VERIF_EMAIL et VERIF_PASSWORD dans .env.local\n");

console.log("TABLE                        ANONYME      CONNECTÉE    VERDICT");
console.log("───────────────────────────  ───────────  ───────────  ─────────────────────");

let fuites = 0, casses = 0;
for (const t of TABLES) {
  const a = await compter(t, null);
  const c = jeton ? await compter(t, jeton) : "—";
  let verdict = "";
  const aOuvert = typeof a === "number" && a > 0;
  if (aOuvert && !ANON_ATTENDU.has(t)) { verdict = "🔴 FUITE ANONYME"; fuites++; }
  else if (aOuvert) verdict = "✅ ouvert à dessein";
  else verdict = "✅ fermé";
  if (jeton && REQUISES.has(t) && c === 0) { verdict = "⚠️  VIDE UNE FOIS CONNECTÉE"; casses++; }
  console.log(`${t.padEnd(27)}  ${String(a).padEnd(11)}  ${String(c).padEnd(11)}  ${verdict}`);
}

if (process.argv.includes("--ecriture")) {
  console.log("\nSonde d'écriture anonyme (no-op : réécrit la valeur existante)");
  await sondeEcritureAnonyme();
}

console.log(`\n${fuites === 0 ? "✅" : "🔴"} ${fuites} fuite(s) anonyme(s)   ${casses === 0 ? "✅" : "⚠️ "} ${casses} table(s) vide(s) une fois connectée`);
process.exit(fuites || casses ? 1 : 0);
