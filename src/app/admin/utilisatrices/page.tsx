import { redirect } from 'next/navigation'
import { createServerClient } from "@supabase/ssr";
import { cookies } from 'next/headers'
import UsersTable from '@/app/components/admin/UsersTable'
import MealOptionsManager from '@/app/components/admin/MealOptionsManager'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import AdminSettingsManager from '@/app/components/admin/AdminSettingsManager';
import { Cog, CookingPot, Users } from 'lucide-react';

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ service role key côté serveur uniquement
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

  if (!user) redirect('/signin')

  const { data: res } = await supabase
    .from('residentes')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!res?.is_admin) redirect('/homePage')

  return (
    <main className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      <h1 className="text-3xl font-semibold text-center mb-6">Espace d&apos;administration</h1>

      <Tabs defaultValue="users" className="w-full">
        <div className="flex justify-center">
          <TabsList className="flex items-center justify-center gap-4 bg-gray-100 rounded-2xl p-3 shadow-sm overflow-hidden max-w-full">
            <TabsTrigger
              value="users"
              className="cursor-pointer inline-flex items-center justify-center h-12 text-lg font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 rounded-full transition-all duration-200 hover:bg-blue-100 hover:text-blue-700 whitespace-nowrap min-w-[10rem]"
            >
              <Users /> Utilisatrices
            </TabsTrigger>

            <TabsTrigger
              value="meals"
              className="cursor-pointer inline-flex items-center justify-center h-12 text-lg font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 rounded-full transition-all duration-200 hover:bg-blue-100 hover:text-blue-700 whitespace-nowrap min-w-[10rem]"
            >
              <CookingPot/> Repas
            </TabsTrigger>

            <TabsTrigger
              value="settings"
              className="cursor-pointer inline-flex items-center justify-center h-12 text-lg font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 rounded-full transition-all duration-200 hover:bg-blue-100 hover:text-blue-700 whitespace-nowrap min-w-[10rem]"
            >
              <Cog /> Paramétrage
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-8">
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
  )
}
