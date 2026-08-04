"use client";

// Squelettes de chargement : plutôt qu'un spinner sur écran blanc, on affiche la
// silhouette de ce qui arrive. L'écran ne « repart pas de zéro », l'attente paraît
// plus courte et il n'y a pas de saut de mise en page à l'arrivée des données.
//
// Règle d'usage : la forme doit ressembler au contenu réel (mêmes hauteurs, mêmes
// arrondis, même nombre approximatif de blocs). Un squelette qui ne ressemble à rien
// est pire qu'un spinner.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// Enveloppe accessible : les lecteurs d'écran annoncent « Chargement » au lieu de
// lire une suite de blocs vides.
export function SkeletonScreen({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement en cours">
      {children}
    </div>
  );
}

// --- Accueil : logo, sélecteur de résidence, puis 3 cartes ---
export function HomeSkeleton() {
  return (
    <SkeletonScreen>
      <div className="max-w-md mx-auto px-4 pt-6 pb-28 space-y-4">
        <Skeleton className="h-16 w-40 mx-auto rounded-xl" />
        <Skeleton className="h-9 w-full rounded-full" />
        <Skeleton className="h-6 w-44 mx-auto rounded-full" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}

// --- Liste de jours (repas de la semaine) : en-tête coloré + deux sélecteurs ---
export function WeekDaysSkeleton({ days = 5 }: { days?: number }) {
  return (
    <SkeletonScreen>
      <div className="space-y-3">
        {Array.from({ length: days }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border-2 border-transparent overflow-hidden">
            <div className="px-4 py-2 bg-blue-50">
              <Skeleton className="h-4 w-40 bg-blue-100" />
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}

// --- Infos pratiques (onglet Administratif) : titre + rubriques en pleine largeur ---
export function InfoSectionsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonScreen>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <section key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </section>
        ))}
      </div>
    </SkeletonScreen>
  );
}

// --- Profil : avatar rond, nom, puis lignes d'informations ---
export function ProfilSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonScreen>
      <div className="w-full max-w-md mx-auto">
        <div className="w-full shadow-lg border border-gray-100 rounded-2xl bg-white overflow-hidden">
          <div className="flex flex-col items-center py-8 mt-3">
            <Skeleton className="w-32 h-32 rounded-full" />
            <Skeleton className="mt-4 h-8 w-52" />
            <Skeleton className="mt-2 h-5 w-32" />
          </div>
          <div className="divide-y divide-gray-100 px-6">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          <div className="p-6"><Skeleton className="h-10 w-full rounded-lg" /></div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

// --- Liste de cartes générique (calendrier, absences, rubriques) ---
export function CardListSkeleton({ count = 4, withHeader = true }: { count?: number; withHeader?: boolean }) {
  return (
    <SkeletonScreen>
      <div className="max-w-md mx-auto px-4 pt-6 pb-28 space-y-4">
        {withHeader && <Skeleton className="h-7 w-48 mx-auto rounded-full" />}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
