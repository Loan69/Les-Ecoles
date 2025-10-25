import { redirect } from 'next/navigation'
import { createServerClient } from "@supabase/ssr";
import { cookies } from 'next/headers'
import UsersTable from '@/app/components/admin/UsersTable'
import MealOptionsManager from '@/app/components/admin/MealOptionsManager'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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

  if (!res?.is_admin) redirect('/')

  return (
    <main className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      <h1 className="text-3xl font-semibold text-center mb-6">Espace d&apos;administration</h1>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex justify-center mb-6">
          <TabsTrigger value="users">👩‍💻 Utilisatrices</TabsTrigger>
          <TabsTrigger value="meals">🍽️ Repas</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTable currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="meals">
          <MealOptionsManager />
        </TabsContent>
      </Tabs>
    </main>
  )
}
