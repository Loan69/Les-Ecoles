// Amorçage d'un foyer neuf : crée le compte technique (super-admin) et sa ligne
// `residentes`. C'est la seule étape que le SQL ne peut pas faire — créer un
// utilisateur avec un mot de passe valide passe par l'API d'authentification.
//
// À lancer APRÈS la migration de socle et supabase/seed.sql.
//
// Usage :
//   FOYER_URL=https://xxx.supabase.co \
//   FOYER_SERVICE_KEY=eyJ... \
//   FOYER_ADMIN_EMAIL=intendance@exemple.fr \
//   node scripts/foyer-nouveau.mjs
//
// Options :
//   FOYER_ADMIN_MOTDEPASSE=…   mot de passe imposé (sinon : engendré et affiché une fois)
//   FOYER_ADMIN_NOM / _PRENOM  identité affichée (défaut : « Compte technique »)
//
// Le mot de passe engendré n'est affiché qu'à l'écran, jamais écrit sur disque.

import { randomBytes } from "node:crypto";

const requis = (nom) => {
  const v = process.env[nom];
  if (!v) {
    console.error(`✖ Variable manquante : ${nom}`);
    process.exit(1);
  }
  return v;
};

const URL_BASE = requis("FOYER_URL").replace(/\/$/, "");
const CLE = requis("FOYER_SERVICE_KEY");
const EMAIL = requis("FOYER_ADMIN_EMAIL").trim().toLowerCase();
const NOM = process.env.FOYER_ADMIN_NOM ?? "technique";
const PRENOM = process.env.FOYER_ADMIN_PRENOM ?? "Compte";
const MOTDEPASSE =
  process.env.FOYER_ADMIN_MOTDEPASSE ?? randomBytes(18).toString("base64url");

const entetes = {
  apikey: CLE,
  Authorization: `Bearer ${CLE}`,
  "Content-Type": "application/json",
};

const appel = async (chemin, options = {}) => {
  const r = await fetch(`${URL_BASE}${chemin}`, { ...options, headers: { ...entetes, ...options.headers } });
  const texte = await r.text();
  let corps = null;
  try { corps = texte ? JSON.parse(texte) : null; } catch { corps = texte; }
  return { ok: r.ok, statut: r.status, corps };
};

// ── 1. Le socle est-il en place ? ───────────────────────────────────────────
console.log(`\nFoyer : ${URL_BASE}`);
const sonde = await appel("/rest/v1/residentes?select=user_id&limit=1");
if (!sonde.ok) {
  console.error(`✖ La table 'residentes' ne répond pas (HTTP ${sonde.statut}).`);
  console.error("  Jouez d'abord la migration de socle, puis supabase/seed.sql.");
  process.exit(1);
}

const reglages = await appel("/rest/v1/app_settings?select=key");
if (!Array.isArray(reglages.corps) || reglages.corps.length === 0) {
  console.error("✖ Aucun réglage dans app_settings — supabase/seed.sql n'a pas été joué.");
  process.exit(1);
}

// ── 2. Un compte technique existe-t-il déjà ? ───────────────────────────────
const dejaLa = await appel("/rest/v1/residentes?select=user_id,email&is_technique=eq.true");
if (Array.isArray(dejaLa.corps) && dejaLa.corps.length > 0) {
  console.error(`✖ Ce foyer a déjà un compte technique (${dejaLa.corps[0].email}).`);
  console.error("  L'amorçage ne se joue qu'une fois. Rien n'a été modifié.");
  process.exit(1);
}

// ── 3. Créer l'utilisateur d'authentification ───────────────────────────────
const creation = await appel("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({ email: EMAIL, password: MOTDEPASSE, email_confirm: true }),
});
if (!creation.ok || !creation.corps?.id) {
  console.error(`✖ Création du compte refusée (HTTP ${creation.statut}) :`, creation.corps);
  process.exit(1);
}
const userId = creation.corps.id;
console.log(`✓ compte d'authentification créé (${EMAIL})`);

// ── 4. Sa ligne residentes ──────────────────────────────────────────────────
// `residentes.id` est un bigint hérité, antérieur au passage de la clé primaire
// sur user_id. Rien ne garantit qu'il porte encore une séquence : on tente sans,
// et on calcule max(id)+1 si la base le réclame.
const ligne = {
  user_id: userId,
  email: EMAIL,
  nom: NOM,
  prenom: PRENOM,
  statut: "active",
  is_technique: true,
  is_super_admin: true,
  niveau_repas: 3, niveau_evenements: 3, niveau_absences: 3,
  niveau_comptes: 3, niveau_infos: 3,
  // Aucune place : le compte technique n'occupe pas de chambre et n'est jamais
  // compté dans la capacité du foyer.
  place_id: null, residence: null, etage: null, chambre: null,
};

let insertion = await appel("/rest/v1/residentes", {
  method: "POST",
  headers: { Prefer: "return=representation" },
  body: JSON.stringify(ligne),
});

if (!insertion.ok && /null value in column "id"|violates not-null.*"id"/i.test(JSON.stringify(insertion.corps))) {
  const max = await appel("/rest/v1/residentes?select=id&order=id.desc&limit=1");
  const suivant = (Array.isArray(max.corps) && max.corps[0]?.id ? Number(max.corps[0].id) : 0) + 1;
  console.log(`  (colonne id sans séquence → attribution manuelle : ${suivant})`);
  insertion = await appel("/rest/v1/residentes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...ligne, id: suivant }),
  });
}

if (!insertion.ok) {
  console.error(`✖ Insertion dans residentes refusée (HTTP ${insertion.statut}) :`, insertion.corps);
  console.error("  Le compte d'authentification a été créé mais n'a pas de profil.");
  console.error(`  Supprimez-le avant de relancer : DELETE /auth/v1/admin/users/${userId}`);
  process.exit(1);
}

console.log("✓ ligne residentes créée (technique + super-admin, sans place)\n");
console.log("─".repeat(64));
console.log("  Identifiants du compte technique — à conserver maintenant,");
console.log("  le mot de passe n'est affiché qu'une fois :");
console.log(`    adresse      : ${EMAIL}`);
console.log(`    mot de passe : ${MOTDEPASSE}`);
console.log("─".repeat(64));
console.log("\nÉtapes suivantes, depuis l'application :");
console.log("  1. se connecter avec ce compte ;");
console.log("  2. Administration → créer les blocs, étages, chambres et postes ;");
console.log("  3. inviter l'intendance et lui donner ses droits ;");
console.log("  4. importer les modes opératoires : node scripts/docs/md2tiptap.mjs\n");
