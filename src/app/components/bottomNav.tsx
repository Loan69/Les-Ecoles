'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Home, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSupabase } from "@/app/providers";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<string>('/');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const { supabase } = useSupabase();

  // --- Récupère le statut admin ---
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('residentes')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(profile?.is_admin ?? false);
    };

    fetchProfile();
  }, [supabase]);

  useEffect(() => {
    setActive(pathname || '/');
  }, [pathname]);

  const navItems = [
    { path: '/calendrier', icon: <Calendar size={22} />, label: 'Calendrier' },
    { path: '/homePage', icon: <Home size={22} />, label: 'Accueil' },
  ];

  if (isAdmin) {
    navItems.push({
      path: '/admin/utilisatrices',
      icon: <Settings size={22} />,
      label: 'Administration',
    });
  }

  return (
    <div className="fixed bottom-0 left-0 w-full flex justify-center bg-white pb-safe z-10">
      <nav className="w-full max-w-md bg-white border-t border-gray-200 flex justify-around items-center py-3 shadow-sm rounded-t-2xl">
        {navItems.map((item) => {
          const isActive = active === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center rounded-xl p-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
