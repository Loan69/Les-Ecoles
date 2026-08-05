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

// --- Barre de boutons en haut à droite (TopBar : Administration / Profil / Déconnexion) ---
export function TopBarSkeleton() {
  return (
    <div className="flex justify-end items-center gap-2 mb-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
  );
}

// --- Écrans d'intendance « jour par jour » (Présences au foyer, Repas) ---
// Même ossature : barre de boutons, titre, plage de dates, puis des cartes-jour
// contenant un bloc par résidence avec des compteurs cliquables.
// `tone` reprend la couleur dominante de l'écran (bleu pour le foyer, ambre pour les repas).
export function AdminDaysSkeleton({
  tone = "blue",
  withNav = false,
  withTabs = false,
  withLockCard = false,
  days = 4,
}: {
  tone?: "blue" | "amber";
  withNav?: boolean;
  withTabs?: boolean;
  withLockCard?: boolean;
  days?: number;
}) {
  const bg = tone === "amber" ? "from-yellow-50 to-white" : "from-blue-50 to-white";
  return (
    <SkeletonScreen>
      <div className={`min-h-screen bg-gradient-to-br ${bg} py-10 px-4 sm:px-6`}>
        <div className="max-w-5xl mx-auto">
          <TopBarSkeleton />
          {withNav && (
            <div className="flex justify-center gap-2 mb-6">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          )}
          <div className="flex flex-col items-center gap-2 mb-8">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>

          {withLockCard && <Skeleton className="h-24 w-full rounded-2xl mb-8" />}

          {/* Plage de dates + actions */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-8 w-36 rounded-lg" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-8 w-36 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>

          {withTabs && (
            <div className="flex justify-center mb-8">
              <Skeleton className="h-16 w-full max-w-lg rounded-3xl" />
            </div>
          )}

          {/* Cartes-jour : un encadré par résidence, deux compteurs chacun */}
          <div className="space-y-3">
            {Array.from({ length: days }).map((_, i) => (
              <div key={i} className="rounded-2xl border-2 border-gray-100 bg-white shadow-sm p-4">
                <Skeleton className="h-4 w-56 mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1].map((j) => (
                    <div key={j} className="border border-gray-100 rounded-xl p-3">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-10 flex-1 rounded-xl" />
                        <Skeleton className="h-10 flex-1 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

// --- Options de repas : catalogue (liste de lignes) puis ouverture des services (cartes-jour) ---
export function RepasOptionsSkeleton({ options = 5, days = 3 }: { options?: number; days?: number }) {
  return (
    <SkeletonScreen>
      <div className="space-y-12">
        <section>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-4/5 mb-4" />
          <ul className="space-y-2">
            {Array.from({ length: options }).map((_, i) => (
              <li key={i} className="flex items-center justify-between border border-gray-200 bg-white rounded-xl px-4 py-3 shadow-sm">
                <Skeleton className="h-4 w-48" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-11 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-10 w-52 rounded-lg" />
          </div>
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: days }).map((_, i) => (
              <div key={i} className="rounded-2xl border-2 border-gray-100 bg-white shadow-sm p-4">
                <Skeleton className="h-4 w-48 mb-3" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1].map((j) => (
                    <div key={j} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SkeletonScreen>
  );
}

// --- Comptes : une section par résidence, chacune listant des lignes utilisatrice ---
export function PlacesSkeleton({ sections = 2, rows = 4 }: { sections?: number; rows?: number }) {
  return (
    <SkeletonScreen>
      <div className="space-y-6">
        {Array.from({ length: sections }).map((_, s) => (
          <section key={s} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                  <div className="min-w-0 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </SkeletonScreen>
  );
}

// --- Écrans d'authentification (activation, complétion de profil) : logo + carte de formulaire ---
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <SkeletonScreen>
      <div className="min-h-screen flex flex-col items-center px-4 py-8 bg-gray-50">
        <Skeleton className="w-[150px] h-[150px] rounded-2xl mb-3" />
        <div className="w-full max-w-sm bg-white shadow-md rounded-2xl p-6">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-3 w-full mb-5" />
          <div className="space-y-3">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-6 h-12 w-full rounded-xl" />
        </div>
      </div>
    </SkeletonScreen>
  );
}

// --- Liste de personnes (modale des confirmations) : pastille d'initiales + nom + chambre ---
export function PeopleListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <SkeletonScreen>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/30 border border-orange-100/50">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full bg-orange-100" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        ))}
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
