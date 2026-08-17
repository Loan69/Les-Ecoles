// Régénère les PDF de docs/pdf/ à partir des .md de docs/ (Chrome headless).
//
// Usage :
//   node scripts/docs/md2pdf.mjs                 → tous les documents
//   node scripts/docs/md2pdf.mjs specifications-regles mode-operatoire-residentes
//
// Les PDF sont les exemplaires envoyés au foyer : garder le même style d'un document à
// l'autre. La copie in-app des modes d'emploi se régénère à part (md2tiptap.mjs).

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { marked } from "marked";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Helvetica Neue", -apple-system, system-ui, sans-serif;
         font-size: 10.5pt; line-height: 1.55; color: #1f2937; }
  h1 { font-size: 20pt; margin: 0 0 4pt; color: #1e3a8a; }
  h2 { font-size: 14pt; margin: 20pt 0 6pt; padding-bottom: 3pt;
       border-bottom: 1px solid #dbeafe; color: #1e40af; page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 14pt 0 4pt; color: #1e40af; page-break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 12pt 0 3pt; page-break-after: avoid; }
  p, li { orphans: 2; widows: 2; }
  ul, ol { padding-left: 18pt; }
  li { margin: 2pt 0; }
  blockquote { margin: 8pt 0; padding: 6pt 10pt; border-left: 3px solid #93c5fd;
               background: #f8fafc; color: #334155; }
  blockquote p { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 9pt; }
  th, td { border: 1px solid #cbd5e1; padding: 4pt 6pt; text-align: left;
           vertical-align: top; }
  th { background: #eff6ff; color: #1e3a8a; }
  tr { page-break-inside: avoid; }
  code { font-family: Menlo, monospace; font-size: 9pt; background: #f1f5f9;
         padding: 0 3px; border-radius: 3px; }
  pre { background: #f1f5f9; padding: 8pt; border-radius: 4px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 14pt 0; }
  a { color: #1d4ed8; text-decoration: none; }
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
