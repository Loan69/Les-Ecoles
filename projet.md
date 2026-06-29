# Projet — Les Écoles

## Contexte

Application web **PWA mobile-first** de gestion interne d'un **foyer d'étudiantes** (résidence religieuse). Le foyer comprend deux résidences : **Résidence 12** et **Résidence 36**.

Déployée sur **Vercel**, base de données **Supabase** (PostgreSQL).

---

## Utilisateurs

| Rôle | Description |
|---|---|
| **Résidente** | Habite au foyer. Peut s'inscrire aux repas, voir les événements, signaler ses absences. |
| **Invitée** | Compte simplifié. Peut s'inscrire aux repas et voir les événements. |
| **Administratrice** | Résidente avec `is_admin = true`. Accès au panneau admin. |

---

## Stack technique

- **Framework** : Next.js 15 (App Router, Turbopack)
- **UI** : Tailwind CSS v4, Radix UI (via shadcn/ui), Framer Motion, Lucide React, Sonner (toasts)
- **Backend** : Supabase (auth, base de données)
- **Client Supabase** :
  - Côté client : `@supabase/ssr` `createBrowserClient` via `providers.tsx` (hook `useSupabase()`)
  - Côté serveur (API routes) : `@supabase/ssr` `createServerClient` avec `SUPABASE_SERVICE_ROLE_KEY`
  - ⚠️ Ancien pattern encore présent : `src/app/lib/supabaseClient.ts` (singleton `createClient`)

---

## Arborescence principale

```
src/
├── app/
│   ├── layout.tsx              — Layout racine + metadata
│   ├── page.tsx                — Redirige vers /signin
│   ├── ClientLayout.tsx        — Gestion affichage BottomNav
│   ├── providers.tsx           — Context Supabase (useSupabase hook)
│   ├── globals.css
│   ├── favicon.ico
│   │
│   ├── signin/page.tsx         — Connexion + mot de passe oublié + liens inscription
│   ├── completionProfile/      — Inscription (résidente ou invitée)
│   ├── resetPassword/page.tsx  — Réinitialisation mot de passe
│   ├── homePage/page.tsx       — Page principale (présence foyer + repas du jour + événements)
│   ├── repasSemaine/page.tsx   — Vue semaine pour planifier ses repas
│   ├── calendrier/page.tsx     — Calendrier des événements
│   ├── profil/page.tsx         — Profil de l'utilisatrice
│   │
│   ├── admin/
│   │   ├── utilisatrices/page.tsx  — Gestion users, invités, repas spéciaux, paramètres
│   │   ├── repas/page.tsx          — Inscriptions repas (vue admin)
│   │   └── foyer/page.tsx          — Présences au foyer par résidence
│   │
│   ├── api/
│   │   ├── presence-repas/         — Enregistrer une présence repas (upsert/delete)
│   │   ├── presence-foyer/         — Toggle absence/présence au foyer
│   │   ├── get-is-absent/          — Vérifier si l'utilisatrice est absente
│   │   ├── get-presence-foyer/     — Liste des IDs absentes (pour admin foyer)
│   │   ├── invite-repas/           — Ajouter un invité à un repas
│   │   ├── sync-user/              — Synchroniser pending_user → residentes/invitees après confirmation email
│   │   ├── check-user/             — Vérifier si un email existe déjà en auth
│   │   └── admin/
│   │       ├── users/              — Lister les utilisatrices (GET)
│   │       ├── users/toggle/       — Promouvoir/révoquer admin (POST)
│   │       ├── users/delete/       — Supprimer une utilisatrice (DELETE)
│   │       └── meals/              — Gérer les repas spéciaux (⚠️ table repas_options — semble inutilisé)
│   │
│   ├── components/
│   │   ├── bottomNav.tsx           — Navigation fixe en bas
│   │   ├── logoutButton.tsx        — Déconnexion
│   │   ├── presenceButton.tsx      — Bouton présence/absent foyer
│   │   ├── inviteModal.tsx         — Modal inviter quelqu'un à un repas
│   │   ├── commentModal.tsx        — Modal commentaire sur un repas
│   │   ├── calendrierView.tsx      — Composant calendrier mensuel
│   │   ├── AjoutEventModal.tsx     — Modal ajout/édition événement
│   │   ├── DeleteEventModal.tsx    — Modal suppression événement
│   │   ├── completionProfile.tsx   — Formulaire inscription (client)
│   │   ├── signupForm.tsx          — Formulaire de détails inscription
│   │   ├── SelectField.tsx         — Select natif HTML avec styles
│   │   ├── SelectField2.tsx        — Select Radix UI avec styles
│   │   ├── DynamicSelectGroup.tsx  — Select dynamique multi-niveaux depuis BDD
│   │   ├── DynamicMultiSelectGroup.tsx — Variante multi-select
│   │   ├── ConfirmationToggle.tsx  — Toggle confirmation événement
│   │   ├── VisionConfirmation.tsx  — Vue admin des confirmations
│   │   ├── LoadingSpinner.tsx      — Spinner de chargement
│   │   ├── DatesSelector.tsx       — Sélecteur de dates multiples
│   │   ├── DateNaissanceSelect.tsx — Sélecteur date naissance
│   │   └── admin/
│   │       ├── UsersTable.tsx          — Tableau gestion utilisatrices
│   │       ├── GuestsTable.tsx         — Tableau gestion invités
│   │       ├── MealOptionsManager.tsx  — Gestion repas spéciaux
│   │       └── AdminSettingsManager.tsx — Paramètres (heure verrouillage, etc.)
│   │
│   └── lib/
│       └── supabaseClient.ts   — ⚠️ Ancien client singleton (à migrer)
│
├── components/ui/              — Composants shadcn/ui (button, card, dialog, etc.)
│
├── lib/
│   ├── utils.ts                — cn() helper
│   ├── utilDate.ts             — formatDateKeyLocal, parseDateKeyLocal, formatDateFR
│   └── rulesUtils.ts           — getMostRecentRule, getLatestRulesByService
│
└── types/
    ├── CalendarEvent.ts
    ├── InviteRepas.ts
    ├── Option.ts
    ├── Personne.ts
    ├── Repas.ts
    ├── Residence.ts
    ├── Residente.ts
    └── Rule.ts
```

---

## Tables Supabase principales

| Table | Description |
|---|---|
| `residentes` | Profils des résidentes (nom, prenom, residence, etage, chambre, is_admin) |
| `invitees` | Profils des invitées |
| `pending_users` | Données d'inscription en attente de confirmation email |
| `presences` | Inscriptions repas (id_repas, user_id, date_repas, type_repas, choix_repas, option_id, commentaire) |
| `absences` | Absences au foyer (user_id, date_absence) |
| `evenements` | Événements du foyer (titre, dates_event, lieu, visibilite, couleur, rappel_event…) |
| `invites` | Personnes invitées (nom, prenom) |
| `invites_repas` | Inscription d'un invité à un repas |
| `residences` | Résidences (value: "12"/"36", label) |
| `select_options_repas` | Options de repas par défaut (oui, non, plateau, pn_chaud, pn_froid…) |
| `select_options_residence` | Options pour les sélects résidence/étage/chambre |
| `special_meal_options` | Règles de repas spéciaux avec plages de dates |
| `app_settings` | Paramètres applicatifs (verrouillage_repas, verrouillage_weekend) |

---

## Flux d'inscription

1. L'utilisatrice remplit `SignupForm` → les données sont insérées dans `pending_users`
2. Supabase envoie un email de confirmation
3. Après confirmation, l'utilisatrice se connecte → le `POST /api/sync-user` est appelé
4. `sync-user` lit `pending_users` et insère dans `residentes` ou `invitees` selon le rôle
5. `pending_users` est nettoyé

---

## Logique de verrouillage des repas

Configurable via `app_settings` :
- `verrouillage_repas` : heure de verrouillage (ex: "21:00") — après cette heure, les repas du jour ne sont plus modifiables
- `verrouillage_foyer` : heure de verrouillage foyer
- `verrouillage_weekend` : booléen — si activé, les repas du weekend sont verrouillés dès le vendredi à l'heure normale

Les pique-niques (`pn_chaud`, `pn_froid`) ont une logique particulière : ils doivent être commandés **la veille** avant l'heure de lock.

---

## Repas spéciaux

Via `special_meal_options` : les admins peuvent créer des règles qui remplacent les options par défaut sur une plage de dates (ou indéfiniment). La règle la plus récente (selon `updated_at` ou `created_at`) prend la priorité en cas de conflit.

---

## Problèmes identifiés et améliorations à faire

Voir section dédiée dans ce document.
