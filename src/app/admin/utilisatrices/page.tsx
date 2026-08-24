import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import PlacesManager from "@/app/components/admin/PlacesManager";
import AdminNav from "@/app/components/admin/AdminNav";
import TopBar from "@/app/components/TopBar";
import { rightsFromRow, canViewSection, RIGHTS_COLUMNS } from "@/lib/roles";

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServer();

  // Pas de session (ou jeton expiré) → écran de connexion, comme les autres pages admin.
  // Lever l'erreur ici renvoyait une page 500 au visiteur non connecté.
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/signin");

  const { data: res } = await supabase
    .from("residentes")
    .select(RIGHTS_COLUMNS)
    .eq("user_id", user.id)
    .single();

  if (!canViewSection(rightsFromRow(res as Record<string, unknown> | null), "comptes")) redirect("/homePage");

  return (
    <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      <TopBar />
      <AdminNav />
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold">Administration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les utilisatrices et leurs chambres, les droits d&apos;accès, les invitations et les comptes désactivés.
        </p>
      </div>

      <PlacesManager currentUserId={user.id} />
    </main>
  );
}
