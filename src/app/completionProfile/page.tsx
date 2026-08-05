import { Suspense } from "react";
import CompletionProfileClient from "../components/completionProfile";
import { FormSkeleton } from "../components/Skeleton";

export const revalidate = 0; // (optionnel) désactive la mise en cache statique

export default function CompletionProfilePage() {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <CompletionProfileClient />
    </Suspense>
  );
}
