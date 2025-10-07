"use client";

import "./globals.css";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClientComponentClient());

  return (
    <html lang="fr">
      <body>
        <SessionContextProvider supabaseClient={supabase}>
          {children}
        </SessionContextProvider>
      </body>
    </html>
  );
}
