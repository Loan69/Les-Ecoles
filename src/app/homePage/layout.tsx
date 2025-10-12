import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function HomePageLayout({ children }: { children: ReactNode }) {
    const supabase = createServerComponentClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
  
    if (!session) {
      redirect('/signin')
    }
  
    return <>{children}</>
  }
  