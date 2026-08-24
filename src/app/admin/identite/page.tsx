import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import TopBar from "@/app/components/TopBar";
import AdminNav from "@/app/components/admin/AdminNav";
import IdentiteFoyerSettings from "@/app/components/admin/IdentiteFoyerSettings";
import SuperAdminsPanel from "@/app/components/admin/SuperAdminsPanel";
import { rightsFromRow, isSuperAdmin, RIGHTS_COLUMNS } from "@/lib/roles";

// Identité du foyer — onglet séparé de « Comptes & chambres » : on n'y vient que
// pour installer ou renommer un foyer, jamais dans le travail quotidien.
export default async function IdentitePage() {
  const supabase = await createSupabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) redirect("/signin");

  const { data: res } = await supabase
    .from("residentes")
    .select(RIGHTS_COLUMNS)
    .eq("user_id", user.id)
    .single();

  if (!isSuperAdmin(rightsFromRow(res as Record<string, unknown> | null))) redirect("/homePage");

  return (
    <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <TopBar />
      <AdminNav />
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold">Identité du foyer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Le nom, le logo et les réglages régionaux de l&apos;application.
        </p>
      </div>
      <IdentiteFoyerSettings />
      <SuperAdminsPanel />
    </main>
  );
}
