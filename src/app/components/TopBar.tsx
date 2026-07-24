import AdministrationButton from "./administrationButton";
import ProfileButton from "./profileButton";
import LogoutButton from "./logoutButton";

// Barre de boutons en haut à droite (Administration / Profil / Déconnexion),
// identique sur tous les écrans.
export default function TopBar({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-end items-center gap-2 mb-3 ${className}`}>
      <AdministrationButton />
      <ProfileButton />
      <LogoutButton />
    </div>
  );
}
