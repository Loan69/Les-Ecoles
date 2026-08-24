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

## SMTP : pourquoi il est obligatoire, et ce qui se partage

Supabase interdit de modifier les gabarits tant qu'aucun SMTP n'est configuré. Son
service d'envoi intégré est destiné aux essais : gabarits figés, et une poignée
d'emails par heure seulement. Un foyer réel a donc besoin de son propre SMTP.

**Un même compte SMTP peut servir plusieurs foyers.** Les identifiants (hôte, port,
utilisateur, mot de passe) sont réutilisables tels quels d'un projet Supabase à
l'autre. Ce qui se partage alors :

| Partagé | Conséquence |
|---|---|
| Le quota d'envoi | Brevo offre 300 emails/jour — pour **tous** les foyers réunis |
| La réputation d'expéditeur | Des rebonds chez un foyer pèsent sur la délivrabilité des autres |
| L'adresse d'expédition | À moins d'en valider une par foyer |

**À différencier obligatoirement : le `Sender name`.** C'est le nom que voit
l'invitée dans sa boîte. Laissé identique, une résidente de Guerlédan recevrait un
email signé « Foyer des Écoles » — au mieux déroutant, au pire pris pour une
tentative d'hameçonnage, donc ignoré.

Dans *Project Settings → Authentication → SMTP Settings*, par foyer :

- `Sender name` : **le nom du foyer** ;
- `Sender email` : la même adresse validée, ou une adresse propre au foyer si elle
  est validée chez le fournisseur ;
- hôte, port, utilisateur, mot de passe : identiques.

C'est le seul endroit où deux foyers partagent une infrastructure. Ce n'est pas un
défaut de cloisonnement — aucune donnée d'un foyer ne transite par l'autre — mais
c'est un point de contention à surveiller quand le nombre de foyers grandira.
