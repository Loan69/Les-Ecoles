'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Calendar, Home, PersonStanding, Utensils } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMyRights } from '@/lib/useMyRights';
import type { Section } from '@/lib/roles';

export default function BottomNav() {
  const pathname = usePathname();
  const [active, setActive] = useState<string>('/');
  const { canAccess, loading } = useMyRights();

  useEffect(() => {
    setActive(pathname || '/');
  }, [pathname]);

  // Chaque onglet dépend de sa section : au niveau « Aucun » (0), il n'est pas affiché.
  // L'accueil n'est rattaché à aucune section — il reste toujours accessible.
  const allItems: { path: string; icon: React.ReactNode; label: string; section?: Section }[] = [
    { path: '/calendrier', icon: <Calendar size={22} />, label: 'Calendrier', section: 'evenements' },
    { path: '/repasSemaine', icon: <Utensils size={22} />, label: 'Repas de la semaine', section: 'repas' },
    { path: '/homePage', icon: <Home size={22} />, label: 'Accueil' },
    { path: '/presenceFoyer', icon: <PersonStanding size={22} />, label: 'Présence foyer', section: 'absences' },
    { path: '/administratif', icon: <BookOpen size={22} />, label: 'Administratif', section: 'infos' },
  ];
  const navItems = allItems.filter((item) => !item.section || canAccess(item.section));

  // Tant que les droits ne sont pas chargés, on n'affiche pas la barre : elle apparaîtrait
  // complète puis perdrait des onglets sous les yeux de l'utilisatrice.
  if (loading) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full flex justify-center bg-white pb-safe z-10">
      <nav className="w-full max-w-md bg-white border-t border-gray-200 flex justify-around items-center py-3 shadow-sm rounded-t-2xl">
        {navItems.map((item) => {
          const isActive = active === item.path;
          return (
            // <Link> plutôt qu'un bouton : Next.js précharge alors le code et les données
            // de l'onglet tant qu'il est visible à l'écran, donc l'affichage est déjà prêt
            // au moment du tap. Avec un onClick, tout ne démarrait qu'au clic.
            <Link
              key={item.path}
              href={item.path}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center rounded-xl p-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              {item.icon}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
