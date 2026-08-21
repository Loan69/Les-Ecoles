// Régénère les .docx de docs/word/ à partir des .md de docs/.
//
// Usage :
//   node scripts/docs/md2docx.mjs                 → tous les documents
//   node scripts/docs/md2docx.mjs specifications-regles mode-operatoire-residentes
//
// Même rôle que md2pdf.mjs, autre format : le foyer reçoit les PDF pour lire et les
// Word pour annoter. Les deux sortent du MÊME .md — ne jamais éditer un .docx à la
// main, il serait écrasé à la régénération suivante. Le style suit celui des PDF
// (titres bleus, tableaux à en-tête clair) pour que les deux versions se ressemblent.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ExternalHyperlink, ShadingType,
} from "docx";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// Reprend la palette des PDF (voir md2pdf.mjs).
const BLEU_TITRE = "1E3A8A";
const BLEU_SOUS = "1E40AF";
const GRIS_TEXTE = "1F2937";
const GRIS_CITATION = "334155";
const BORDURE = "CBD5E1";
const FOND_ENTETE = "EFF6FF";
const FOND_CODE = "F1F5F9";

const POLICE = "Calibri";
const POLICE_CODE = "Consolas";

/** Tokens inline de marked → runs docx (gras, italique, code, liens). */
function runsInline(tokens, herite = {}) {
  const out = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "strong":
        out.push(...runsInline(t.tokens, { ...herite, bold: true }));
        break;
      case "em":
        out.push(...runsInline(t.tokens, { ...herite, italics: true }));
        break;
      case "del":
        out.push(...runsInline(t.tokens, { ...herite, strike: true }));
        break;
      case "codespan":
        out.push(new TextRun({ text: t.text, font: POLICE_CODE, size: 18, shading: { type: ShadingType.CLEAR, fill: FOND_CODE }, ...herite }));
        break;
      case "link": {
        const enfants = runsInline(t.tokens, { ...herite, color: "1D4ED8", underline: {} });
        out.push(new ExternalHyperlink({ children: enfants.length ? enfants : [new TextRun({ text: t.href })], link: t.href }));
        break;
      }
      case "br":
        out.push(new TextRun({ break: 1 }));
        break;
      case "image":
        // Aucune image dans ces documents ; on garde le texte alternatif plutôt que de perdre l'info.
        out.push(new TextRun({ text: t.text || t.href, italics: true, ...herite }));
        break;
      default:
        out.push(new TextRun({ text: t.raw ?? t.text ?? "", font: POLICE, size: 21, color: GRIS_TEXTE, ...herite }));
    }
  }
  return out;
}

const NIVEAUX = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];

function cellule(tokens, entete) {
  return new TableCell({
    children: [
      new Paragraph({
        children: runsInline(tokens, entete ? { bold: true, color: BLEU_TITRE } : {}),
        spacing: { before: 40, after: 40 },
      }),
    ],
    shading: entete ? { type: ShadingType.CLEAR, fill: FOND_ENTETE } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function tableau(token) {
  const bordure = { style: BorderStyle.SINGLE, size: 4, color: BORDURE };
  const lignes = [
    new TableRow({
      tableHeader: true,
      children: token.header.map((c) => cellule(c.tokens, true)),
    }),
    ...token.rows.map((r) => new TableRow({ children: r.map((c) => cellule(c.tokens, false)) })),
  ];
  return new Table({
    rows: lignes,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: bordure, bottom: bordure, left: bordure, right: bordure, insideHorizontal: bordure, insideVertical: bordure },
  });
}

/**
 * Un token markdown de bloc → un ou plusieurs éléments docx.
 *
 * `niveau`   : profondeur d'imbrication (listes, citations) — commande le retrait.
 * `citation` : le bloc est dans un `>` — italique grisé + filet bleu à gauche.
 *
 * Tout token de bloc est traité récursivement : une citation dans une puce, ou une
 * sous-liste dans une citation, ne doit rien perdre en route.
 */
function bloc(token, { niveau = 0, citation = false } = {}) {
  const retrait = niveau ? { indent: { left: 360 * niveau } } : {};
  const filet = citation
    ? { border: { left: { style: BorderStyle.SINGLE, size: 12, color: "93C5FD", space: 8 } } }
    : {};
  const styleTexte = citation ? { italics: true, color: GRIS_CITATION } : {};

  switch (token.type) {
    case "heading":
      return [new Paragraph({
        children: runsInline(token.tokens, {
          bold: true,
          color: token.depth === 1 ? BLEU_TITRE : BLEU_SOUS,
          size: [40, 28, 24, 22][Math.min(token.depth, 4) - 1],
        }),
        heading: NIVEAUX[Math.min(token.depth, 4) - 1],
        spacing: { before: token.depth === 1 ? 0 : 240, after: 120 },
        ...retrait,
      })];

    case "paragraph":
    case "text":
      return [new Paragraph({
        children: runsInline(token.tokens ?? [{ type: "text", text: token.text }], styleTexte),
        spacing: { after: 120 },
        ...retrait,
        ...filet,
      })];

    case "list":
      return token.items.flatMap((item) => {
        const contenu = item.tokens ?? [];
        // Le texte de la puce elle-même…
        const inline = contenu.filter((t) => t.type === "text" || t.type === "paragraph");
        // …et tout le reste (sous-liste, citation, bloc de code…), qui suit en retrait.
        const suite = contenu.filter((t) => t.type !== "text" && t.type !== "paragraph");

        const puce = new Paragraph({
          children: runsInline(
            inline.flatMap((t) => t.tokens ?? [{ type: "text", text: t.text }]),
            styleTexte
          ),
          bullet: token.ordered ? undefined : { level: niveau },
          numbering: token.ordered ? { reference: "numerotation", level: niveau, instance: 0 } : undefined,
          spacing: { after: 60 },
          ...filet,
        });

        return [puce, ...suite.flatMap((t) => bloc(t, { niveau: niveau + 1, citation }))];
      });

    case "blockquote":
      return (token.tokens ?? []).flatMap((t) => bloc(t, { niveau, citation: true }));

    case "code":
      return [new Paragraph({
        children: token.text.split("\n").flatMap((l, i) => [
          ...(i ? [new TextRun({ break: 1 })] : []),
          new TextRun({ text: l, font: POLICE_CODE, size: 18 }),
        ]),
        shading: { type: ShadingType.CLEAR, fill: FOND_CODE },
        spacing: { after: 120 },
        ...retrait,
      })];

    case "table":
      // Word colle les tableaux au texte : on aère avec un paragraphe vide.
      return [tableau(token), new Paragraph({ text: "", spacing: { after: 120 } })];

    case "hr":
      return [new Paragraph({
        text: "",
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0" } },
        spacing: { before: 120, after: 120 },
      })];

    case "space":
      return [];

    default:
      // Type inattendu : on préfère un paragraphe brut à une perte silencieuse.
      return token.text || token.tokens
        ? [new Paragraph({
            children: runsInline(token.tokens ?? [{ type: "text", text: token.text }], styleTexte),
            spacing: { after: 120 },
            ...retrait,
          })]
        : [];
  }
}

const demandes = process.argv.slice(2).map((a) => basename(a, ".md"));
const docs = readdirSync(join(root, "docs"))
  .filter((f) => f.endsWith(".md"))
  .filter((f) => demandes.length === 0 || demandes.includes(basename(f, ".md")));

if (docs.length === 0) {
  console.error("Aucun document à convertir.");
  process.exit(1);
}

mkdirSync(join(root, "docs/word"), { recursive: true });

for (const doc of docs) {
  const md = readFileSync(join(root, "docs", doc), "utf8");
  const titre = (md.match(/^#\s+(.+)$/m) ?? [, doc])[1].replace(/\*\*/g, "");
  const enfants = marked.lexer(md).flatMap((t) => bloc(t));

  const document = new Document({
    creator: "Les Écoles",
    title: titre,
    description: "Document généré depuis docs/ — ne pas éditer à la main.",
    numbering: {
      config: [{
        reference: "numerotation",
        levels: [0, 1, 2].map((level) => ({
          level, format: "decimal", text: `%${level + 1}.`, alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } } },
        })),
      }],
    },
    styles: { default: { document: { run: { font: POLICE, size: 21, color: GRIS_TEXTE } } } },
    sections: [{
      properties: { page: { margin: { top: 1020, bottom: 1020, left: 900, right: 900 } } },
      children: enfants,
    }],
  });

  const out = join(root, "docs/word", doc.replace(/\.md$/, ".docx"));
  writeFileSync(out, await Packer.toBuffer(document));
  console.log(`✓ ${out}`);
}
