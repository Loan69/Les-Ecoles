"use client"

import { usePathname } from "next/navigation"
import BottomNav from "./components/bottomNav"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideBottomNav = ["/signin", "/signup", "/completionProfile", "/resetPassword"]
  const shouldHideNavbar = hideBottomNav.includes(pathname)

  return (
    <>
      <main className="flex-1 pb-16">{children}</main>
      {!shouldHideNavbar && <BottomNav />}
    </>
  )
}
