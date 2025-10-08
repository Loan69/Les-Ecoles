"use client"

import "./globals.css";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";
import BottomNav from "./components/bottomNav";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClientComponentClient());
  const pathname = usePathname();

  // Liste des pages où la navbar ne doit PAS apparaître
  const hideBottomNav = ["/signin", "/signup", "/completionProfile"];

  const shouldHideNavbar = hideBottomNav.includes(pathname);

  return (
    <html lang="fr">
      <body>
        <SessionContextProvider supabaseClient={supabase}>
          <main className="flex-1 pb-15">{children}</main>
          {!shouldHideNavbar && <BottomNav />}
        </SessionContextProvider>
      </body>
    </html>
  );
}
