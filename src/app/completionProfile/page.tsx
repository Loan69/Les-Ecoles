'use client';

// Next.js indique à Vercel “ne pré-rends pas cette page”, elle sera servie côté client uniquement.
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import SignupForm from "@/app/components/signupForm";
import { User } from "@supabase/supabase-js";

type Role = "residente" | "invitee";

export default function CompletionProfile() {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>("residente");
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const router = useRouter();

    const email = searchParams.get("email");

    useEffect(() => {
    if (!email) {
        router.push("/signin");
        return;
    }

    const init = async () => {
        try {
        // 1️⃣ Récupérer le rôle depuis pending_users
        const { data: pendingUser, error: pendingError } = await supabase
            .from("pending_users")
            .select("*")
            .eq("emailInscription", email)
            .single();

        if (pendingError || !pendingUser) {
            throw new Error("Utilisateur temporaire non trouvé");
        }

        setRole(pendingUser.role);

        // 2️⃣ Récupérer le user connecté
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error("Utilisateur non connecté");
        }

        setUser(user);
        setLoading(false);
        } catch (err: unknown) {
        console.error(err);
        router.push("/signin");
        }
    };

    init();
    }, [email, router]);

    if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
        <p className="text-blue-600">Chargement...</p>
        </div>
    );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
            <SignupForm role={role} user={user} />
        </div>
    );
}
