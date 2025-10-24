import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import UsersTable from '@/app/components/admin/UsersTable'
import MealOptionsManager from '@/app/components/admin/MealOptionsManager'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default async function AdminUsersPage() {
  const supabase = createServerComponentClient({ cookies: () => cookies() })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')

  const { data: res } = await supabase
    .from('residentes')
    .select('is_admin')
    .eq('user_id', session.user.id)
    .single()

  if (!res?.is_admin) redirect('/')

  return (
    <main className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      <h1 className="text-3xl font-semibold text-center mb-6">Espace d'administration</h1>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex justify-center mb-6">
          <TabsTrigger value="users">👩‍💻 Utilisatrices</TabsTrigger>
          <TabsTrigger value="meals">🍽️ Repas</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTable currentUserId={session.user.id} />
        </TabsContent>

        <TabsContent value="meals">
          <MealOptionsManager />
        </TabsContent>
      </Tabs>
    </main>
  )
}
