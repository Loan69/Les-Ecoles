"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Building2 } from "lucide-react";
import { useMyRights } from "@/lib/useMyRights";

// Sous-navigation de l'univers administration, sur le modèle de RepasNav.
// « Identité du foyer » n'apparaît que pour le super-admin : c'est un réglage
// de fondation, pas d'intendance courante.
export default function AdminNav() {
  const pathname = usePathname();
  const estSuperAdmin = useMyRights().isSuperAdmin;

  const liens = [
    { path: "/admin/utilisatrices", label: "Comptes & chambres", icon: Users, visible: true },
    { path: "/admin/identite", label: "Identité du foyer", icon: Building2, visible: estSuperAdmin },
  ].filter((l) => l.visible);

  if (liens.length < 2) return null; // un seul onglet : pas de navigation à afficher

  return (
    <nav className="flex flex-wrap justify-center gap-2 mb-6">
      {liens.map(({ path, label, icon: Icon }) => {
        const actif = pathname === path;
        return (
          <Link
            key={path}
            href={path}
            aria-current={actif ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              actif
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
