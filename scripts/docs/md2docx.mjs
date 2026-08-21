// Régénère les .docx de docs/word/ à partir des .md de docs/.
//
// Usage :
//   node scripts/docs/md2docx.mjs                 → tous les documents
//   node scripts/docs/md2docx.mjs specifications-regles mode-operatoire-residentes
//
// Même source et même charte que les PDF (style-docs.mjs) : le foyer lit le PDF et
// annote le Word, les deux doivent se ressembler page pour page. Régénérer les deux
// ensemble. Ne jamais éditer un .docx à la main : il est écrasé à la génération.
//
// Le PDF pense en points CSS ; Word pense en demi-points (polices), en twips
// (espacements, 1 pt = 20 twips) et en huitièmes de point (filets). Tout le travail
// de ce fichier est cette traduction — les valeurs, elles, ne sont pas redéfinies.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LineRuleType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ExternalHyperlink, ShadingType,
} from "docx";
import { COULEURS, TAILLES, ESPACES, INTERLIGNE, PAGE, POLICES, FILETS, RETRAITS } from "./style-docs.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const c = COULEURS;

// --- Conversions d'unités -------------------------------------------------
const pt2demi = (pt) => Math.round(pt * 2);        // taille de police
const pt2twip = (pt) => Math.round(pt * 20);       // espacements, retraits
const pt2huit = (pt) => Math.max(1, Math.round(pt * 8)); // épaisseur de filet
const mm2twip = (mm) => Math.round((mm / 25.4) * 1440);

const ligne = { line: Math.round(INTERLIGNE * 240), lineRule: LineRuleType.AUTO };
const esp = (nom, extra = {}) => ({ before: pt2twip(ESPACES[nom][0]), after: pt2twip(ESPACES[nom][1]), ...ligne, ...extra });
const filetFin = (couleur, space = 0) => ({ style: BorderStyle.SINGLE, size: pt2huit(FILETS.fin), color: couleur, space });

const TITRES = [
  { cle: "h1", niveau: HeadingLevel.HEADING_1, couleur: c.titre1 },
  { cle: "h2", niveau: HeadingLevel.HEADING_2, couleur: c.titre2 },
  { cle: "h3", niveau: HeadingLevel.HEADING_3, couleur: c.titre2 },
  { cle: "h4", niveau: HeadingLevel.HEADING_4, couleur: c.texte }, // le PDF ne colore pas h4
];

/** Tokens inline de marked → runs docx. `base` porte la taille/couleur du contexte. */
function runsInline(tokens, base = {}) {
  const defaut = { font: POLICES.texteNom, size: pt2demi(TAILLES.corps), color: c.texte, ...base };
  const out = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "strong": out.push(...runsInline(t.tokens, { ...base, bold: true })); break;
      case "em":     out.push(...runsInline(t.tokens, { ...base, italics: true })); break;
      case "del":    out.push(...runsInline(t.tokens, { ...base, strike: true })); break;
      case "codespan":
        out.push(new TextRun({
          ...defaut, text: t.text, font: POLICES.codeNom, size: pt2demi(TAILLES.code),
          shading: { type: ShadingType.CLEAR, fill: c.codeFond },
        }));
        break;
      case "link": {
        // Le PDF ne souligne pas les liens : on s'aligne.
        const enfants = runsInline(t.tokens, { ...base, color: c.lien });
        out.push(new ExternalHyperlink({ children: enfants.length ? enfants : [new TextRun({ ...defaut, text: t.href, color: c.lien })], link: t.href }));
        break;
      }
      case "br":    out.push(new TextRun({ break: 1 })); break;
      case "image": out.push(new TextRun({ ...defaut, text: t.text || t.href, italics: true })); break;
      case "text":
        // Un token texte peut porter lui-même des enfants (gras dans une puce…).
        if (t.tokens?.length) { out.push(...runsInline(t.tokens, base)); break; }
        out.push(new TextRun({ ...defaut, text: t.text ?? "" }));
        break;
      default:
        if (t.tokens?.length) { out.push(...runsInline(t.tokens, base)); break; }
        out.push(new TextRun({ ...defaut, text: t.text ?? t.raw ?? "" }));
    }
  }
  return out;
}

function cellule(tokens, entete) {
  const base = { size: pt2demi(TAILLES.tableau), ...(entete ? { bold: true, color: c.tableauTexteEntete } : {}) };
  return new TableCell({
    children: [new Paragraph({ children: runsInline(tokens, base), spacing: { ...ligne } })],
    shading: entete ? { type: ShadingType.CLEAR, fill: c.tableauFondEntete } : undefined,
    margins: {
      top: pt2twip(RETRAITS.celluleV), bottom: pt2twip(RETRAITS.celluleV),
      left: pt2twip(RETRAITS.celluleH), right: pt2twip(RETRAITS.celluleH),
    },
  });
}

function tableau(token) {
  const b = filetFin(c.tableauBordure);
  return new Table({
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: token.header.map((x) => cellule(x.tokens, true)) }),
      // Le PDF interdit la coupure d'une ligne entre deux pages (tr { page-break-inside: avoid }).
      ...token.rows.map((r) => new TableRow({ cantSplit: true, children: r.map((x) => cellule(x.tokens, false)) })),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b },
  });
}

/**
 * Un token markdown de bloc → un ou plusieurs éléments docx.
 * `niveau` : imbrication (listes, citations) · `citation` : dans un `>`.
 * Tout est récursif : une citation dans une puce ne doit rien perdre.
 */
function bloc(token, { niveau = 0, citation = false } = {}) {
  const retraitListe = niveau ? { indent: { left: pt2twip(RETRAITS.liste) * niveau } } : {};
  // Citation : filet bleu à gauche + fond très clair, comme le blockquote du PDF.
  const habillageCitation = citation
    ? {
        border: { left: { style: BorderStyle.SINGLE, size: pt2huit(FILETS.citation), color: c.citationFilet, space: RETRAITS.citation } },
        shading: { type: ShadingType.CLEAR, fill: c.citationFond },
        indent: { left: pt2twip(RETRAITS.citation) },
      }
    : {};
  const texteCitation = citation ? { color: c.citationTexte } : {};

  switch (token.type) {
    case "heading": {
      const t = TITRES[Math.min(token.depth, 4) - 1];
      return [new Paragraph({
        children: runsInline(token.tokens, { bold: true, color: t.couleur, size: pt2demi(TAILLES[t.cle]) }),
        heading: t.niveau,
        spacing: esp(t.cle),
        // Le PDF évite une coupure juste après un titre (page-break-after: avoid).
        keepNext: token.depth > 1,
        ...(token.depth === 2 ? { border: { bottom: filetFin(c.filetTitre2, 3) } } : {}),
      })];
    }

    case "paragraph":
    case "text":
      return [new Paragraph({
        children: runsInline(token.tokens ?? [{ type: "text", text: token.text }], texteCitation),
        spacing: esp(citation ? "citation" : "paragraphe"),
        ...retraitListe,
        ...habillageCitation,
      })];

    case "list":
      return token.items.flatMap((item) => {
        const contenu = item.tokens ?? [];
        const inline = contenu.filter((t) => t.type === "text" || t.type === "paragraph");
        const suite = contenu.filter((t) => t.type !== "text" && t.type !== "paragraph");
        const puce = new Paragraph({
          children: runsInline(inline.flatMap((t) => t.tokens ?? [{ type: "text", text: t.text }]), texteCitation),
          bullet: token.ordered ? undefined : { level: niveau },
          numbering: token.ordered ? { reference: "numerotation", level: niveau, instance: 0 } : undefined,
          spacing: esp("liste"),
          ...habillageCitation,
        });
        return [puce, ...suite.flatMap((t) => bloc(t, { niveau: niveau + 1, citation }))];
      });

    case "blockquote":
      return (token.tokens ?? []).flatMap((t) => bloc(t, { niveau, citation: true }));

    case "code":
      return [new Paragraph({
        children: token.text.split("\n").flatMap((l, i) => [
          ...(i ? [new TextRun({ break: 1 })] : []),
          new TextRun({ text: l, font: POLICES.codeNom, size: pt2demi(TAILLES.code), color: c.texte }),
        ]),
        shading: { type: ShadingType.CLEAR, fill: c.codeFond },
        spacing: esp("codeBloc"),
        ...retraitListe,
      })];

    case "table":
      // Word colle les tableaux au texte : on aère comme le fait la marge CSS.
      return [tableau(token), new Paragraph({ text: "", spacing: { after: pt2twip(ESPACES.tableau[1]) } })];

    case "hr":
      return [new Paragraph({ text: "", border: { bottom: filetFin(c.filet) }, spacing: esp("filet") })];

    case "space":
      return [];

    default:
      return token.text || token.tokens
        ? [new Paragraph({ children: runsInline(token.tokens ?? [{ type: "text", text: token.text }], texteCitation), spacing: esp("paragraphe"), ...retraitListe })]
        : [];
  }
}

// Styles nommés : ils font vivre le volet Navigation de Word et permettent au foyer
// de retoucher tous les titres d'un coup plutôt qu'un par un.
const stylesTitres = TITRES.map((t, i) => ({
  id: `Heading${i + 1}`,
  name: `Heading ${i + 1}`,
  basedOn: "Normal",
  next: "Normal",
  quickFormat: true,
  run: { font: POLICES.texteNom, size: pt2demi(TAILLES[t.cle]), bold: true, color: t.couleur },
  paragraph: { spacing: esp(t.cle), keepNext: i > 0 },
}));

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
    description: "Généré depuis docs/*.md par scripts/docs/md2docx.mjs — ne pas éditer à la main.",
    numbering: {
      config: [{
        reference: "numerotation",
        levels: [0, 1, 2].map((level) => ({
          level, format: "decimal", text: `%${level + 1}.`, alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: pt2twip(RETRAITS.liste) * (level + 1), hanging: pt2twip(RETRAITS.liste) } } },
        })),
      }],
    },
    styles: {
      default: {
        document: {
          run: { font: POLICES.texteNom, size: pt2demi(TAILLES.corps), color: c.texte },
          paragraph: { spacing: esp("paragraphe") },
        },
      },
      paragraphStyles: stylesTitres,
    },
    sections: [{
      properties: {
        page: {
          size: { width: mm2twip(PAGE.formatMm[0]), height: mm2twip(PAGE.formatMm[1]) }, // A4
          margin: {
            top: mm2twip(PAGE.margeMm.vertical), bottom: mm2twip(PAGE.margeMm.vertical),
            left: mm2twip(PAGE.margeMm.horizontal), right: mm2twip(PAGE.margeMm.horizontal),
          },
        },
      },
      children: enfants,
    }],
  });

  const out = join(root, "docs/word", doc.replace(/\.md$/, ".docx"));
  writeFileSync(out, await Packer.toBuffer(document));
  console.log(`✓ ${out}`);
}
