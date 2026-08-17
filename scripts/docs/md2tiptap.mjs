// Génère supabase/sync-modes-emploi-inapp.sql à partir des manuels de docs/.
//
// Les modes d'emploi existent en DEUX copies qui doivent rester synchrones :
//   1. docs/*.md (+ PDF envoyés au foyer)  2. les rubriques `admin_sections` de l'onglet
//   Administratif, stockées en JSON tiptap.
// Ce script produit le SQL d'UPDATE de la copie in-app. Idempotent (UPDATE par titre).
//
// Usage : node scripts/docs/md2tiptap.mjs
//
// Note : les extensions tiptap doivent correspondre à celles de l'éditeur in-app
// (StarterKit + Link), sans quoi generateJSON supprime silencieusement des nœuds.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// Chaque manuel → la ou les rubriques in-app qui le portent.
const CIBLES = [
  {
    md: "docs/mode-operatoire-residentes.md",
    where: "title IN ('Mode d''emploi — Résidentes', 'Modes d''emploi')",
  },
  {
    md: "docs/mode-operatoire-administratrices.md",
    where: "title = 'Mode d''emploi — Administratrices'",
  },
];

// Même configuration que l'éditeur in-app (src/app/components/RichText.tsx) :
// StarterKit embarque son propre lien, désactivé au profit de l'extension Link.
const extensions = [StarterKit.configure({ link: false }), Link];

const sql = [
  "-- Synchronise le contenu in-app des modes d'emploi avec les manuels docs/.",
  "-- Idempotent (UPDATE par titre).",
  "-- Généré par scripts/docs/md2tiptap.mjs — ne pas éditer à la main.",
  "",
];

// L'éditeur in-app (StarterKit) ne connaît pas les tableaux : un tableau markdown y serait
// aplati en un paragraphe illisible. On le transforme donc en liste à puces, une puce par
// ligne, chaque cellule préfixée de son en-tête.
function tablesEnListes(md) {
  const lignes = md.split("\n");
  const out = [];
  for (let i = 0; i < lignes.length; i++) {
    const estLigne = (l) => l?.trim().startsWith("|");
    const separateur = /^\s*\|[\s:|-]+\|\s*$/;
    if (estLigne(lignes[i]) && separateur.test(lignes[i + 1] ?? "")) {
      const cellules = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const entetes = cellules(lignes[i]);
      i += 2;
      while (i < lignes.length && estLigne(lignes[i])) {
        const vals = cellules(lignes[i]);
        out.push(
          "- " +
            entetes
              .map((h, k) => (h ? `**${h}** : ${vals[k] ?? ""}` : vals[k] ?? ""))
              .filter((s) => s.trim())
              .join(" — ")
        );
        i++;
      }
      out.push("");
      i--;
    } else {
      out.push(lignes[i]);
    }
  }
  return out.join("\n");
}

for (const { md, where } of CIBLES) {
  const html = marked.parse(tablesEnListes(readFileSync(resolve(root, md), "utf8")), { async: false });
  const json = generateJSON(html, extensions);
  // Échappement SQL : une apostrophe littérale se double dans une chaîne PostgreSQL.
  const literal = JSON.stringify(json).replace(/'/g, "''");
  sql.push(`UPDATE public.admin_sections SET content = '${literal}'`, `WHERE ${where};`, "");
}

const out = resolve(root, "supabase/sync-modes-emploi-inapp.sql");
writeFileSync(out, sql.join("\n"));
console.log(`✓ ${out}`);
