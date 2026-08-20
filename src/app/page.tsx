import { redirect } from 'next/navigation'

// Filet de sécurité : en temps normal le middleware traite déjà la racine
// (accueil si la session est valide, connexion sinon) et cette page n'est
// jamais atteinte. Elle ne sert que si le middleware ne s'exécute pas.
export default function Home() {
  redirect('/signin')
}
