import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import PlacesManager from "@/app/components/admin/PlacesManager";
import TopBar from "@/app/components/TopBar";
import { rightsFromRow, canViewSection, RIGHTS_COLUMNS } from "@/lib/roles";

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServer();

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
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
