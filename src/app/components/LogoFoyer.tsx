"use client";

import { useIdentite } from "@/app/providers";

// Le logo du foyer, partout où l'ancien `/logo.png` était écrit en dur.
//
// Un seul composant pour les sept écrans concernés : sans cela, ajouter un foyer
// obligerait à repasser sur chacun — c'est précisément l'oubli qui avait laissé le
// logo des Écoles s'afficher sur Guerlédan.
//
// **Taille imposée, identique partout.** Les appels précédents passaient des largeurs
// de 150 à 400 px héritées du logo des Écoles ; un logo plus haut que large mangeait
// alors la moitié de l'écran. On contraint donc la HAUTEUR — la largeur suit les
// proportions — et un logo très large est plafonné à son tour.
//
// `<img>` et non `next/image` : l'adresse vient de la base et peut pointer n'importe
// où, alors que next/image exige de déclarer chaque domaine dans next.config.ts.
//
// Sans logo configuré, on affiche le nom du foyer — jamais un logo d'emprunt.
export default function LogoFoyer({ className = "" }: { className?: string }) {
  const foyer = useIdentite();

  if (!foyer.logoUrl) {
    return (
      <p className={`text-2xl sm:text-3xl font-bold text-blue-800 text-center ${className}`}>
        {foyer.nom}
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={foyer.logoUrl}
      alt={foyer.nom}
      className={`h-20 sm:h-24 w-auto max-w-[240px] object-contain mx-auto ${className}`}
    />
  );
}
