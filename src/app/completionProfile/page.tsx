import { Suspense } from "react";
import CompletionProfileClient from "../components/completionProfile";

export const revalidate = 0; // (optionnel) désactive la mise en cache statique

export default function CompletionProfilePage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <CompletionProfileClient />
    </Suspense>
  );
}
