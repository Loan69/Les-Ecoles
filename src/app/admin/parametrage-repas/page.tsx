import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import MealOptionsManager from "@/app/components/admin/MealOptionsManager";
import TopBar from "@/app/components/TopBar";

export default async function ParametrageRepasPage() {
  const supabase = await createSupabaseServer();

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = data?.user;

  if (!user) redirect("/signin");

  const { data: res } = await supabase
    .from("residentes")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!res?.is_admin) redirect("/homePage");

  return (
    <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      <TopBar />
      <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-6">
        Paramétrer les repas
      </h1>
      <MealOptionsManager />
    </main>
  );
}
