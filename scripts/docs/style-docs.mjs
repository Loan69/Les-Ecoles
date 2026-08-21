// Charte commune aux documents remis au foyer.
//
// Le PDF (md2pdf.mjs) et le Word (md2docx.mjs) sortent du même .md et doivent se
// ressembler page pour page : le client lit le PDF et annote le Word. Les valeurs
// vivent donc ICI, une seule fois, et chaque script les traduit dans ses unités —
// CSS en points pour le PDF, demi-points et twips pour le Word.
//
// Modifier une valeur ici change les DEUX formats. C'est voulu.

export const COULEURS = {
  texte: "1F2937",
  titre1: "1E3A8A",
  titre2: "1E40AF",
  filetTitre2: "DBEAFE",
  citationTexte: "334155",
  citationFilet: "93C5FD",
  citationFond: "F8FAFC",
  tableauBordure: "CBD5E1",
  tableauFondEntete: "EFF6FF",
  tableauTexteEntete: "1E3A8A",
  codeFond: "F1F5F9",
  lien: "1D4ED8",
  filet: "E2E8F0",
};

// Toutes les tailles en points.
export const TAILLES = { corps: 10.5, h1: 20, h2: 14, h3: 11.5, h4: 10.5, tableau: 9, code: 9 };

// Marges verticales des blocs, en points (avant / après).
export const ESPACES = {
  h1: [0, 4],
  h2: [20, 6],
  h3: [14, 4],
  h4: [12, 3],
  paragraphe: [0, 10.5],
  liste: [0, 2],
  citation: [8, 8],
  tableau: [8, 8],
  filet: [14, 14],
  codeBloc: [8, 8],
};

export const INTERLIGNE = 1.55;

// A4, marges 18 mm en haut/bas et 16 mm sur les côtés.
export const PAGE = { formatMm: [210, 297], margeMm: { vertical: 18, horizontal: 16 } };

// Le PDF liste des familles (le navigateur choisit) ; Word veut un nom unique et
// substitue lui-même si la police manque — d'où les deux formes.
export const POLICES = {
  texteCss: '"Helvetica Neue", -apple-system, system-ui, sans-serif',
  texteNom: "Helvetica Neue",
  codeCss: "Menlo, monospace",
  codeNom: "Menlo",
};

// Épaisseurs de filets, en points.
export const FILETS = { fin: 0.75, citation: 2.25 };

// Retrait des listes et rembourrage des cellules, en points.
export const RETRAITS = { liste: 18, citation: 10, celluleV: 4, celluleH: 6 };
