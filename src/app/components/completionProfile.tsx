"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SignupForm from "@/app/components/signupForm";
import LoadingSpinner from "./LoadingSpinner";

type Role = "residente" | "invitee";

export default function CompletionProfileClient() {
  const [role, setRole] = useState<Role>("residente");
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const urlRole = searchParams.get("role");
    if (urlRole === "residente" || urlRole === "invitee") {
      setRole(urlRole);
      setLoading(false);
    } else {
      router.push("/signin");
    }
  }, [searchParams, router]);

  if (loading)
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <SignupForm role={role} />
    </div>
  );
}
