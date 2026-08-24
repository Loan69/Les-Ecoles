import type { MetadataRoute } from "next";
import { identiteFoyer } from "@/lib/foyerServeur";
import { COULEUR_APPLI } from "@/lib/foyer";

// Manifeste de l'application web, engendré à la demande depuis l'identité du foyer.
// Remplace public/manifest.json, qui était figé sur « Foyer des Écoles ».
//
// Next sert ce fichier à l'adresse /manifest.webmanifest — c'est celle que déclare
// `metadata.manifest` dans layout.tsx, et celle qu'exclut le matcher du middleware.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const foyer = await identiteFoyer();

  // On n'utilise PAS le logo comme icône : un logo est transparent (rendu sur fond
  // noir par iOS et Android) et large (illisible une fois comprimé en carré).
  // `foyer_icone_url` est un réglage distinct ; à défaut, icônes statiques neutres.
  const icones = foyer.iconeUrl
    ? [
        { src: foyer.iconeUrl, sizes: "192x192", type: "image/png" as const },
        { src: foyer.iconeUrl, sizes: "512x512", type: "image/png" as const },
      ]
    : [
        { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" as const },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" as const },
      ];

  return {
    name: foyer.nom,
    short_name: foyer.nomCourt,
    description: foyer.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: COULEUR_APPLI,
    icons: icones,
  };
}
