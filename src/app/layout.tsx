import "./globals.css"
import { Providers } from "./providers"
import ClientLayout from "./ClientLayout"
import { Toaster } from "sonner"

export const metadata = {
  title: 'Les Écoles',
  description: 'Espace des résidentes et invitées du Foyer des Écoles',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
