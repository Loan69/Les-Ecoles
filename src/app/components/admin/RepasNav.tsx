"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Utensils, ClipboardList, Settings } from "lucide-react";

// Sous-navigation de l'univers repas : passer de la visualisation au paramétrage
// (et vice versa) sans repasser par l'accueil.
const LINKS = [
  { path: "/repasSemaine", label: "Repas de la semaine", icon: Utensils },
  { path: "/admin/repas", label: "Inscriptions & compta", icon: ClipboardList },
  { path: "/admin/repas-options", label: "Paramétrer les repas", icon: Settings },
];

export default function RepasNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap justify-center gap-2 mb-6">
      {LINKS.map(({ path, label, icon: Icon }) => {
        const active = pathname === path;
        // <Link> pour bénéficier du préchargement de la route (cf. bottomNav).
        return (
          <Link
            key={path}
            href={path}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-blue-600 text-white shadow-sm cursor-default pointer-events-none"
                : "bg-white border border-blue-100 text-blue-800 hover:bg-blue-50 cursor-pointer"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
