import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import RepasOptionsManager from "@/app/components/admin/RepasOptionsManager";

export default async function RepasOptionsPage() {
  const supabase = await createSupabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/signin");

  const { data: res } = await supabase
    .from("residentes")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!res?.is_admin) redirect("/homePage");

  return (
    <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-2">Options de repas</h1>
      <p className="text-center text-sm text-gray-400 mb-8">Nouveau modèle — en test (Lot 2)</p>
      <RepasOptionsManager />
    </main>
  );
}
