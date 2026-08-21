// Régénère les PDF de docs/pdf/ à partir des .md de docs/ (Chrome headless).
//
// Usage :
//   node scripts/docs/md2pdf.mjs                 → tous les documents
//   node scripts/docs/md2pdf.mjs specifications-regles mode-operatoire-residentes
//
// Les PDF sont les exemplaires envoyés au foyer : garder le même style d'un document à
// l'autre. Le foyer reçoit AUSSI une version Word (md2docx.mjs) : régénérer les deux
// ensemble, sinon le client compare deux états différents. La copie in-app des modes
// d'emploi se régénère à part (md2tiptap.mjs).

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { marked } from "marked";
import { COULEURS, TAILLES, ESPACES, INTERLIGNE, PAGE, POLICES, FILETS, RETRAITS } from "./style-docs.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// La charte est partagée avec la version Word (style-docs.mjs) : on la traduit ici en CSS.
const c = COULEURS;
const CSS = `
  @page { size: A4; margin: ${PAGE.margeMm.vertical}mm ${PAGE.margeMm.horizontal}mm; }
  body { font-family: ${POLICES.texteCss};
         font-size: ${TAILLES.corps}pt; line-height: ${INTERLIGNE}; color: #${c.texte}; }
  h1 { font-size: ${TAILLES.h1}pt; margin: ${ESPACES.h1[0]}pt 0 ${ESPACES.h1[1]}pt; color: #${c.titre1}; }
  h2 { font-size: ${TAILLES.h2}pt; margin: ${ESPACES.h2[0]}pt 0 ${ESPACES.h2[1]}pt; padding-bottom: 3pt;
       border-bottom: ${FILETS.fin}pt solid #${c.filetTitre2}; color: #${c.titre2}; page-break-after: avoid; }
  h3 { font-size: ${TAILLES.h3}pt; margin: ${ESPACES.h3[0]}pt 0 ${ESPACES.h3[1]}pt; color: #${c.titre2}; page-break-after: avoid; }
  h4 { font-size: ${TAILLES.h4}pt; margin: ${ESPACES.h4[0]}pt 0 ${ESPACES.h4[1]}pt; page-break-after: avoid; }
  p, li { orphans: 2; widows: 2; }
  ul, ol { padding-left: ${RETRAITS.liste}pt; }
  li { margin: ${ESPACES.liste[1]}pt 0; }
  blockquote { margin: ${ESPACES.citation[0]}pt 0; padding: 6pt ${RETRAITS.citation}pt;
               border-left: ${FILETS.citation}pt solid #${c.citationFilet};
               background: #${c.citationFond}; color: #${c.citationTexte}; }
  blockquote p { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin: ${ESPACES.tableau[0]}pt 0; font-size: ${TAILLES.tableau}pt; }
  th, td { border: ${FILETS.fin}pt solid #${c.tableauBordure};
           padding: ${RETRAITS.celluleV}pt ${RETRAITS.celluleH}pt; text-align: left; vertical-align: top; }
  th { background: #${c.tableauFondEntete}; color: #${c.tableauTexteEntete}; }
  tr { page-break-inside: avoid; }
  code { font-family: ${POLICES.codeCss}; font-size: ${TAILLES.code}pt; background: #${c.codeFond};
         padding: 0 3px; border-radius: 3px; }
  pre { background: #${c.codeFond}; padding: 8pt; border-radius: 4px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: ${FILETS.fin}pt solid #${c.filet}; margin: ${ESPACES.filet[0]}pt 0; }
  a { color: #${c.lien}; text-decoration: none; }
`;

const demandes = process.argv.slice(2).map((a) => basename(a, ".md"));
const docs = readdirSync(join(root, "docs"))
  .filter((f) => f.endsWith(".md"))
  .filter((f) => demandes.length === 0 || demandes.includes(basename(f, ".md")));

if (docs.length === 0) {
  console.error("Aucun document à convertir.");
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "md2pdf-"));
try {
  for (const doc of docs) {
    const md = readFileSync(join(root, "docs", doc), "utf8");
    const titre = (md.match(/^#\s+(.+)$/m) ?? [, doc])[1];
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${titre}</title><style>${CSS}</style></head><body>${marked.parse(md, { async: false })}</body></html>`;

    const src = join(tmp, doc.replace(/\.md$/, ".html"));
    const out = join(root, "docs/pdf", doc.replace(/\.md$/, ".pdf"));
    writeFileSync(src, html);
    execFileSync(CHROME, [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${out}`,
      `file://${src}`,
    ], { stdio: "ignore" });
    console.log(`✓ ${out}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
