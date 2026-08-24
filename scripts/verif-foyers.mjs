// Vérifie qu'un déploiement multi-foyer sert bien le BON foyer sur chaque adresse.
//
//   node scripts/verif-foyers.mjs https://les-ecoles.vercel.app https://guerledan-foyer.vercel.app
//
// S'appuie sur /manifest.webmanifest, qui est public (aucune session requise) et
// engendré à partir de l'identité lue en base : c'est donc un témoin direct de la
// base réellement atteinte par chaque nom d'hôte.
//
// Le point critique n'est pas « chaque foyer répond », mais « aucun ne répond à la
// place d'un autre » : deux adresses qui renverraient le même nom ou la même base
// signeraient un repli silencieux du registre.

const urls = process.argv.slice(2);
if (urls.length < 2) {
  console.error("Usage : node scripts/verif-foyers.mjs <url foyer 1> <url foyer 2> […]");
  process.exit(1);
}

const resultats = [];

for (const base of urls) {
  const racine = base.replace(/\/$/, "");
  const ligne = { url: racine, nom: null, projet: null, erreurs: [] };

  try {
    const r = await fetch(`${racine}/manifest.webmanifest`, { redirect: "follow" });
    if (!r.ok) {
      ligne.erreurs.push(`manifeste HTTP ${r.status}`);
    } else {
      const m = await r.json();
      ligne.nom = m.name;
      ligne.nomCourt = m.short_name;
      ligne.couleur = m.theme_color;
      const icone = m.icons?.[0]?.src ?? "";
      const projet = icone.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
      ligne.projet = projet ?? (icone.startsWith("/") ? "(icône statique, pas de logo configuré)" : "?");
    }
  } catch (e) {
    ligne.erreurs.push(`injoignable : ${e.message}`);
  }

  try {
    const r = await fetch(`${racine}/signin`, { redirect: "follow" });
    if (!r.ok) ligne.erreurs.push(`/signin HTTP ${r.status}`);
  } catch (e) {
    ligne.erreurs.push(`/signin injoignable : ${e.message}`);
  }

  resultats.push(ligne);
}

console.log("");
for (const r of resultats) {
  console.log(`${r.url}`);
  console.log(`  nom            ${r.nom ?? "—"}`);
  console.log(`  nom court      ${r.nomCourt ?? "—"}`);
  console.log(`  couleur        ${r.couleur ?? "—"}`);
  console.log(`  base atteinte  ${r.projet ?? "—"}`);
  for (const e of r.erreurs) console.log(`  ⚠️  ${e}`);
  console.log("");
}

// --- Le vrai test : aucun croisement ---------------------------------------
let souci = resultats.some((r) => r.erreurs.length > 0);

const noms = resultats.map((r) => r.nom).filter(Boolean);
if (new Set(noms).size !== noms.length) {
  console.log("🔴 Deux adresses renvoient le MÊME nom de foyer.");
  console.log("   Le registre FOYERS ne reconnaît pas l'un des hôtes et se replie sur le premier.");
  console.log("   Vérifiez que le champ `host` correspond exactement au domaine, sans https:// ni /.");
  souci = true;
}

const projets = resultats.map((r) => r.projet).filter((p) => p && /^[a-z0-9]+$/.test(p));
if (new Set(projets).size !== projets.length) {
  console.log("🔴 Deux adresses pointent vers la MÊME base Supabase — les données ne sont pas cloisonnées.");
  souci = true;
}

console.log(souci ? "❌ Contrôle non concluant." : "✅ Chaque adresse sert un foyer distinct, sur sa propre base.");
process.exit(souci ? 1 : 0);
