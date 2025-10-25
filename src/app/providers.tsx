'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createContext, useContext, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

// ✅ Définis le type du contexte
type SupabaseContextType = {
  supabase: SupabaseClient;
};

// ✅ Initialise avec undefined mais type correctement
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

// ✅ Hook avec vérification de type
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within Providers');
  }
  return context;
};