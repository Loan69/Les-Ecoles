import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Providers } from "./providers"
import ClientLayout from "./ClientLayout"
import { Toaster } from "sonner"
import { identiteFoyer, foyerCourant } from "@/lib/foyerServeur"

// Titre, description et couleur viennent de la base (clés `foyer_*` d'app_settings),
// plus du code : c'est ce qui permet à un second foyer de s'appeler autrement sans
// qu'on recompile quoi que ce soit. Voir src/lib/foyer.ts.
// Rendu à la demande, jamais au build. `generateMetadata` lit le nom du foyer en
// base : sans cette ligne, Next pré-rendait /homePage, /calendrier et /signin au
// moment du build et y figeait le titre d'alors. Un foyer qui se renomme ne verrait
// rien changer. L'application étant entièrement derrière authentification, le rendu
// statique n'apportait rien.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const foyer = await identiteFoyer()
  return {
    title: foyer.nom,
    description: foyer.description,
    icons: {
      // Même raison que le manifeste : l'icône n'est pas le logo.
      icon: foyer.iconeUrl ?? '/favicon.ico',
      apple: foyer.iconeUrl ?? '/apple-touch-icon.png',
    },
    manifest: '/manifest.webmanifest',
  }
}

// `themeColor` ne vit plus dans `metadata` depuis Next 14 : il a son propre export.
export async function generateViewport(): Promise<Viewport> {
  const foyer = await identiteFoyer()
  return { themeColor: foyer.couleur }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lu ici pour être transmis aux composants client : sans cela, l'écran de
  // connexion referait la requête depuis le navigateur avant même d'afficher
  // son logo. `identiteFoyer` est mémorisé par requête, ceci ne coûte rien.
  const [foyer, base] = await Promise.all([identiteFoyer(), foyerCourant()])

  return (
    <html lang={foyer.locale.split('-')[0] || 'fr'}>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers identite={foyer} supabaseUrl={base.url} supabaseAnonKey={base.anon}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
