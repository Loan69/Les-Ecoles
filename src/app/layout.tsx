import "./globals.css"
import Head from "next/head"
import { Providers } from "./providers"
import ClientLayout from "./ClientLayout"

export const metadata = {
  title: 'Les Écoles',
  description: 'Espace des résidentes et invitées du Foyer des Écoles',
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <Head>
        {/* Titre et description */}
        <title>Les Écoles</title>
        <meta name="description" content="Espace des résidentes et invitées du Foyer des Écoles" />

        {/* Favicon / Logo */}
        <link rel="icon" type="image/png" href="/logo.png" />

        {/* Icônes pour les appareils Apple */}
        <link rel="apple-touch-icon" href="/logo-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Les Écoles" />

        {/* Couleur du thème pour Android */}
        <meta name="theme-color" content="#1E3A8A" />

        {/* Manifest PWA */}
        <link rel="manifest" href="/manifest.json" />

        {/* Viewport mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
      </Head>

      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  )
}
