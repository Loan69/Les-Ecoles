// --- Registre des foyers ----------------------------------------------------
//
// Un déploiement Next unique, une base Supabase par foyer (décision D1), le foyer
// résolu à l'exécution d'après le nom d'hôte (D2/D4) : `ecoles.exemple.fr` et
// `guerledan.exemple.fr` servent la même application sur deux bases distinctes.
//
// Le registre vit dans la variable d'environnement **serveur** `FOYERS`, un tableau
// JSON. Jamais `NEXT_PUBLIC_` : il contient les clés service role.
//
//   FOYERS='[{"slug":"ecoles","host":"ecoles.exemple.fr","url":"https://aaa.supabase.co",
//             "anon":"…","serviceRole":"…"}, …]'
//
// Modifier ce registre demande un redéploiement — Next fige les `process.env` du
// middleware au build. Ajouter un foyer ne demande en revanche AUCUNE modification
// de code.

export type Foyer = {
  slug: string;
  host: string;
  url: string;
  anon: string;
  serviceRole: string;
};

let memo: Foyer[] | null = null;

/**
 * Lecture (et mémorisation) du registre.
 *
 * Repli sur `NEXT_PUBLIC_SUPABASE_*` quand `FOYERS` est absent : le développement
 * local et le déploiement mono-foyer continuent de fonctionner tels quels, sans
 * registre à écrire. C'est aussi ce qui permet de déployer P4 sans rien casser.
 */
export function registreFoyers(): Foyer[] {
  if (memo) return memo;

  const brut = process.env.FOYERS;
  if (brut) {
    try {
      const liste = JSON.parse(brut) as Partial<Foyer>[];
      const valides = liste.filter((f) => f.host && f.url && f.anon && f.serviceRole);
      if (valides.length !== liste.length) {
        console.error("[foyers] entrées ignorées : host, url, anon et serviceRole sont tous requis.");
      }
      if (valides.length > 0) {
        memo = valides.map((f) => ({
          slug: f.slug ?? f.host!.split(".")[0],
          host: f.host!.toLowerCase(),
          url: f.url!.replace(/\/$/, ""),
          anon: f.anon!,
          serviceRole: f.serviceRole!,
        }));
        return memo;
      }
    } catch (e) {
      // On ne se rabat PAS silencieusement : un JSON invalide servirait le mauvais
      // foyer à tout le monde. Mieux vaut un message explicite dans les journaux.
      console.error("[foyers] FOYERS n'est pas un JSON valide :", e);
    }
  }

  memo = [
    {
      slug: "defaut",
      host: "*",
      url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, ""),
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    },
  ];
  return memo;
}

/**
 * Foyer correspondant à un nom d'hôte.
 *
 * Le port est retiré : en développement l'hôte vaut `localhost:3000`. Si aucun hôte
 * ne correspond, on prend `FOYER_DEV` s'il est défini, sinon la première entrée —
 * ce qui rend `npm run dev` utilisable sans configurer de domaine.
 */
export function foyerParHost(host: string | null | undefined): Foyer {
  const liste = registreFoyers();
  const propre = (host ?? "").toLowerCase().split(":")[0];

  const exact = liste.find((f) => f.host === propre);
  if (exact) return exact;

  const dev = process.env.FOYER_DEV;
  if (dev) {
    const choisi = liste.find((f) => f.slug === dev);
    if (choisi) return choisi;
    console.error(`[foyers] FOYER_DEV="${dev}" ne correspond à aucun foyer du registre.`);
  }

  // Hôte inconnu alors qu'un vrai registre existe : c'est une erreur de configuration,
  // et elle est dangereuse — on servirait les données du premier foyer à un visiteur
  // arrivé par une autre adresse. Cas concret : les déploiements de PRÉ-PRODUCTION de
  // Vercel, dont l'hôte est `<projet>-<empreinte>.vercel.app` et ne figure dans aucun
  // registre. On journalise fort, et on recommande de définir FOYER_DEV sur ces
  // environnements pour choisir explicitement la base visée.
  if (liste.length > 1 || liste[0].host !== "*") {
    console.error(
      `[foyers] hôte "${propre}" absent du registre — repli sur "${liste[0].slug}". ` +
      `Définissez FOYER_DEV pour lever l'ambiguïté, ou ajoutez cet hôte au registre.`
    );
  }

  return liste[0];
}

// `foyerCourant()` — le foyer de la requête en cours — vit dans src/lib/foyerServeur.ts.
// Ce fichier-ci reste volontairement PUR : le middleware l'importe, et il tourne dans
// le runtime Edge, où `next/headers` n'existe pas.
