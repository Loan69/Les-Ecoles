"use client"

import "./globals.css";
import { usePathname } from "next/navigation";
import BottomNav from "./components/bottomNav";
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideBottomNav = ["/signin", "/signup", "/completionProfile"];
  const shouldHideNavbar = hideBottomNav.includes(pathname);

  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logo.png" sizes="any" />
        <title>Les Écoles</title>
        <meta name="description" content="Espace des résidentes et invitées des Écoles" />
      </head>
      <body>
        <Providers>
          <main className="flex-1 pb-15">{children}</main>
          {!shouldHideNavbar && <BottomNav />}
        </Providers>
      </body>
    </html>
  );
}
