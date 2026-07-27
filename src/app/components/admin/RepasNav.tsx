"use client";

import { usePathname, useRouter } from "next/navigation";
import { Utensils, ClipboardList, Settings } from "lucide-react";

// Sous-navigation de l'univers repas : passer de la visualisation au paramétrage
// (et vice versa) sans repasser par l'accueil.
const LINKS = [
  { path: "/repasSemaine", label: "Repas de la semaine", icon: Utensils },
  { path: "/admin/repas-v2", label: "Inscriptions & compta", icon: ClipboardList },
  { path: "/admin/repas-options", label: "Paramétrer les repas", icon: Settings },
];

export default function RepasNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="flex flex-wrap justify-center gap-2 mb-6">
      {LINKS.map(({ path, label, icon: Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => !active && router.push(path)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition cursor-pointer ${
              active
                ? "bg-blue-600 text-white shadow-sm cursor-default"
                : "bg-white border border-blue-100 text-blue-800 hover:bg-blue-50"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        );
      })}
    </nav>
  );
}
