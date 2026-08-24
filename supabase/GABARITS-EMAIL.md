# Gabarits d'email — à installer dans CHAQUE projet Supabase

Les emails d'authentification sont un réglage **du projet Supabase**, pas du dépôt.
Un foyer neuf part donc sur les gabarits **par défaut** de Supabase, et c'est un piège :

> Le gabarit par défaut utilise `{{ .ConfirmationURL }}`, qui pointe vers
> `/auth/v1/verify` **chez Supabase**. Supabase vérifie le jeton lui-même, le
> consomme, puis redirige vers l'application avec un code que celle-ci ne sait pas
> traiter. Résultat : l'invitée voit « Lien invalide ou expiré » alors que son lien
> était valide — et le jeton est désormais brûlé.

L'application attend l'autre forme, qui lui laisse la vérification :

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/activation
```

C'est ce que fait `email-invitation.html`, et c'est ce que traite
`src/app/auth/confirm/route.ts`.

## À faire, par foyer

**Authentication → Emails → Invite user** : coller le contenu de
`email-invitation.html`.

Vérifier au passage **Authentication → URL Configuration** :
- *Site URL* = l'adresse du foyer (elle alimente `{{ .SiteURL }}`) ;
- *Redirect URLs* = la même, suivie de `/**`.

Le gabarit dit « Votre foyer » : chaque foyer peut y mettre son nom, les gabarits
étant propres à son projet. Aucune variable Supabase ne donne accès à nos réglages
`app_settings`, le nom ne peut donc pas être injecté automatiquement.

## Symptômes et causes

| Ce que voit l'invitée | Cause probable |
|---|---|
| « Lien invalide ou expiré », compte marqué confirmé | gabarit par défaut : Supabase a consommé le jeton |
| « Lien invalide ou expiré », compte non confirmé | *Site URL* pointe vers le mauvais foyer, ou lien réellement périmé (14 jours) |
| Le lien ouvre le mauvais foyer | `host` du registre `FOYERS` ne correspond pas au domaine |

Les échecs sont journalisés par `auth/confirm` avec l'hôte, le type et le motif.
