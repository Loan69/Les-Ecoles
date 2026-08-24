import type { MetadataRoute } from "next";
import { identiteFoyer } from "@/lib/foyerServeur";

// Manifeste de l'application web, engendré à la demande depuis l'identité du foyer.
// Remplace public/manifest.json, qui était figé sur « Foyer des Écoles ».
//
// Next sert ce fichier à l'adresse /manifest.webmanifest — c'est celle que déclare
// `metadata.manifest` dans layout.tsx, et celle qu'exclut le matcher du middleware.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const foyer = await identiteFoyer();

  // Un logo téléversé par le foyer sert aussi d'icône d'écran d'accueil. À défaut,
  // on retombe sur les icônes statiques — neutres, mais à remplacer par chaque foyer.
  const icones = foyer.logoUrl
    ? [
        { src: foyer.logoUrl, sizes: "192x192", type: "image/png" as const },
        { src: foyer.logoUrl, sizes: "512x512", type: "image/png" as const },
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
    theme_color: foyer.couleur,
    icons: icones,
  };
}
