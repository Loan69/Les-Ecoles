// Pastille d'un groupe de personnes (ciblage de visibilité — voir src/lib/visibilite.ts).
//
// La couleur est **dérivée de l'identifiant du groupe**, pas choisie à la main : deux
// groupes différents se distinguent d'un coup d'œil, et la couleur d'un groupe ne change
// jamais — ni au renommage (l'identifiant ne bouge pas), ni d'un écran à l'autre.
//
// Les classes sont écrites en entier : Tailwind ne conserve que les noms de classes qu'il
// voit littéralement dans le code, une classe assemblée à la volée serait purgée.

const PALETTE = [
  "bg-emerald-50 text-emerald-800 border-emerald-200",
  "bg-sky-50 text-sky-800 border-sky-200",
  "bg-violet-50 text-violet-800 border-violet-200",
  "bg-amber-50 text-amber-800 border-amber-200",
  "bg-rose-50 text-rose-800 border-rose-200",
  "bg-teal-50 text-teal-800 border-teal-200",
  "bg-indigo-50 text-indigo-800 border-indigo-200",
  "bg-orange-50 text-orange-800 border-orange-200",
];

export function couleurGroupe(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function GroupeBadge({
  id,
  nom,
  title,
}: {
  id: string;
  nom: string;
  title?: string;
}) {
  return (
    <span
      title={title ?? "Groupe (visibilité)"}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${couleurGroupe(id)}`}
    >
      {nom}
    </span>
  );
}
