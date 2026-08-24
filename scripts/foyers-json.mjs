// Fabrique la valeur de la variable d'environnement FOYERS à coller dans Vercel.
//
// Lit les clés dans les fichiers .env.* locaux (jamais versionnés) et les assemble
// avec les noms d'hôte que vous passez en argument. Rien n'est envoyé nulle part :
// le JSON est écrit sur la sortie standard, à vous de le copier.
//
// Usage :
//   node scripts/foyers-json.mjs ecoles=.env.local.ecoles:les-ecoles.vercel.app \
//                                guerledan=.env.guerledan:guerledan-foyer.vercel.app
//
// Chaque argument est  <slug>=<fichier env>:<nom d'hôte>

import { readFileSync } from "node:fs";

const lire = (fichier) =>
  Object.fromEntries(
    readFileSync(fichier, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage : node scripts/foyers-json.mjs <slug>=<fichier env>:<hôte> […]");
  process.exit(1);
}

const foyers = args.map((a) => {
  const [slug, reste] = a.split("=");
  const sep = reste.lastIndexOf(":");
  const fichier = reste.slice(0, sep);
  const host = reste.slice(sep + 1);
  const env = lire(fichier);

  const manquantes = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]
    .filter((c) => !env[c]);
  if (manquantes.length) {
    console.error(`✖ ${fichier} : ${manquantes.join(", ")} manquant(s)`);
    process.exit(1);
  }

  return {
    slug,
    host,
    url: env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""),
    anon: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRole: env.SUPABASE_SERVICE_ROLE_KEY,
  };
});

// Contrôle : deux foyers ne doivent jamais partager une base ni un hôte.
for (const champ of ["host", "url"]) {
  const vus = new Set();
  for (const f of foyers) {
    if (vus.has(f[champ])) { console.error(`✖ ${champ} en double : ${f[champ]}`); process.exit(1); }
    vus.add(f[champ]);
  }
}

console.error("Foyers assemblés :");
for (const f of foyers) console.error(`  ${f.slug.padEnd(12)} ${f.host.padEnd(32)} → ${f.url.replace(/https:\/\/([^.]+).*/, "$1")}`);
console.error("\nValeur à coller dans Vercel (variable FOYERS, environnement Production) :\n");

console.log(JSON.stringify(foyers));
