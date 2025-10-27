import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import UsersTable from "@/app/components/admin/UsersTable";
import MealOptionsManager from "@/app/components/admin/MealOptionsManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminSettingsManager from "@/app/components/admin/AdminSettingsManager";
import { Cog, CookingPot, Users } from "lucide-react";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

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
      <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-6">
        Espace d&apos;administration
      </h1>

      <Tabs defaultValue="users" className="w-full">
        {/* --- Onglets principaux --- */}
        <div className="flex justify-center w-full overflow-x-auto">
          <TabsList
            className="
              flex items-center justify-start sm:justify-center gap-2 sm:gap-4 
              bg-gray-100 rounded-2xl p-2 sm:p-3 shadow-sm 
               max-w-full
            "
          >
            <TabsTrigger
              value="users"
              className="
                flex items-center justify-center gap-2
                cursor-pointer text-sm sm:text-base font-medium
                data-[state=active]:bg-blue-600 data-[state=active]:text-white 
                px-3 sm:px-4 py-2 sm:py-3 rounded-full 
                transition-all duration-200 hover:bg-blue-100 hover:text-blue-700 
                whitespace-nowrap min-w-[8rem] sm:min-w-[10rem]
              "
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" /> Utilisatrices
            </TabsTrigger>

            <TabsTrigger
              value="meals"
              className="
                flex items-center justify-center gap-2
                cursor-pointer text-sm sm:text-base font-medium
                data-[state=active]:bg-blue-600 data-[state=active]:text-white 
                px-3 sm:px-4 py-2 sm:py-3 rounded-full 
                transition-all duration-200 hover:bg-blue-100 hover:text-blue-700 
                whitespace-nowrap min-w-[8rem] sm:min-w-[10rem]
              "
            >
              <CookingPot className="w-4 h-4 sm:w-5 sm:h-5" /> Repas
            </TabsTrigger>

            <TabsTrigger
              value="settings"
              className="
                flex items-center justify-center gap-2
                cursor-pointer text-sm sm:text-base font-medium
                data-[state=active]:bg-blue-600 data-[state=active]:text-white 
                px-3 sm:px-4 py-2 sm:py-3 rounded-full 
                transition-all duration-200 hover:bg-blue-100 hover:text-blue-700 
                whitespace-nowrap min-w-[8rem] sm:min-w-[10rem]
              "
            >
              <Cog className="w-4 h-4 sm:w-5 sm:h-5" /> Paramétrage
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- Contenu --- */}
        <div className="mt-6 sm:mt-8">
          <TabsContent value="users">
            <UsersTable currentUserId={user.id} />
          </TabsContent>

          <TabsContent value="meals">
            <MealOptionsManager />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettingsManager />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
