import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import RepasOptionsManager from "@/app/components/admin/RepasOptionsManager";
import MealLockSettings from "@/app/components/admin/MealLockSettings";
import RepasNav from "@/app/components/admin/RepasNav";
import TopBar from "@/app/components/TopBar";
import { rightsFromRow, canViewSection, RIGHTS_COLUMNS } from "@/lib/roles";

export default async function RepasOptionsPage() {
  const supabase = await createSupabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/signin");

  const { data: res } = await supabase
    .from("residentes")
    .select(RIGHTS_COLUMNS)
    .eq("user_id", user.id)
    .single();

  if (!canViewSection(rightsFromRow(res as Record<string, unknown> | null), "repas")) redirect("/homePage");

  return (
    <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <TopBar />
      <RepasNav />
      <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-2">Options de repas</h1>
      <p className="text-center text-sm text-gray-400 mb-8">Créez les options et ouvrez les services jour par jour</p>
      <MealLockSettings />
      <RepasOptionsManager />
    </main>
  );
}
