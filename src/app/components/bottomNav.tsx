'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Home, UserX, Users, Sandwich } from 'lucide-react'; // exemple d’icônes
import { useEffect, useState } from 'react';

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [active, setActive] = useState<string>('/');

    useEffect(() => {
    setActive(pathname || '/');
    }, [pathname]);

    const navItems = [
    { path: '/calendrier', icon: <Calendar size={22} />, label: 'Calendrier' },
    //{ path: '/users', icon: <UserX size={22} />, label: 'Utilisateurs' },
    { path: '/homePage', icon: <Home size={22} />, label: 'Accueil' },
    //{ path: '/homePage', icon: <Users size={22} />, label: 'Communauté' },
    //{ path: '/homePage', icon: <Sandwich size={22} />, label: 'Menu' },
    ];


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
