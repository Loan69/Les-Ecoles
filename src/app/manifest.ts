import type { MetadataRoute } from "next";
import { identiteFoyer } from "@/lib/foyerServeur";
import { COULEUR_APPLI } from "@/lib/foyer";

// Manifeste de l'application web, engendré à la demande depuis l'identité du foyer.
// Remplace public/manifest.json, qui était figé sur « Foyer des Écoles ».
//
// Next sert ce fichier à l'adresse /manifest.webmanifest — c'est celle que déclare
// `metadata.manifest` dans layout.tsx, et celle qu'exclut le matcher du middleware.
export const dynamic = "force-dynamic";

// Type MIME déduit de l'extension. Le téléversement nomme le fichier d'après le type
// réel reçu (voir /api/admin/identite/logo), l'extension fait donc foi.
function typeImage(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  return "image/png";
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const foyer = await identiteFoyer();

  // On n'utilise PAS le logo comme icône : un logo est transparent (rendu sur fond
  // noir par iOS et Android) et large (illisible une fois comprimé en carré).
  // `foyer_icone_url` est un réglage distinct ; à défaut, une icône VRAIMENT neutre —
  // une porte blanche sur fond bleu, sans marque. Les fichiers de repli précédents
  // étaient ceux du premier foyer : un foyer sans icône héritait de son logo.
  const icones = foyer.iconeUrl
    ? [
        // `sizes: "any"` et un type DÉDUIT de l'extension, tous deux nécessaires.
        // On déclarait auparavant `type: "image/png"` et des tailles 192/512 inventées,
        // pour un fichier dont on ne sait ni le format ni les dimensions : Chrome
        // vérifie ces deux annonces et **rejette** l'icône qui ne s'y conforme pas.
        // Une cliente ayant téléversé un JPEG voyait donc l'icône par défaut sur son
        // téléphone, alors que son image était bien enregistrée.
        { src: foyer.iconeUrl, sizes: "any", type: typeImage(foyer.iconeUrl) },
      ]
    : [
        { src: "/icons/defaut-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/defaut-512.png", sizes: "512x512", type: "image/png" },
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
