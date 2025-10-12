import { Suspense } from "react";
import CompletionProfileClient from "../components/completionProfile";
import LoadingSpinner from "../components/LoadingSpinner";

export const revalidate = 0; // (optionnel) désactive la mise en cache statique

export default function CompletionProfilePage() {
  return (
    <Suspense fallback={<main className="flex items-center justify-center min-h-screen bg-white">
                          <LoadingSpinner />
                        </main>}
    >
      <CompletionProfileClient />
    </Suspense>
  );
}
