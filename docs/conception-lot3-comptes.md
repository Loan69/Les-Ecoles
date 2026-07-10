# Conception — Lot 3 : Gestion des comptes par l'intendance

> **Document de conception** — à challenger avant tout développement. Version 0.1 — 2026-07-10.
> Une fois figé, on code **phase par phase** (aucun code tant que la conception n'est pas validée).

---

## 1. Objectif

Basculer la création de comptes **résidentes** d'un modèle **self-service** (chacune s'inscrit et choisit sa résidence/chambre) vers un modèle **piloté par l'intendance** :

> Une **chambre = une place**. Le nombre de comptes résidentes est **plafonné par le nombre de chambres**. L'intendance **ouvre une place → invite → l'étudiante complète son compte → au départ, l'admin libère la place** (compte **archivé**, historique conservé) → la chambre est **réattribuée**.

Les **prestataires (corail)** sont gérées selon le même cycle, mais sur des **postes** (rôles) plutôt que des chambres.

---

## 2. Décisions déjà actées (réunion 2026-07-10)

| # | Décision | Choix |
|---|---|---|
| D1 | Capacité d'une chambre | **1 chambre = 1 place = 1 compte** |
| D2 | Comptes « invitées » (invitees) | **Inchangés** : gardent le self-signup, n'occupent pas de place |
| D3 | Départ d'une résidente | **Archivage** (compte désactivé, historique repas/présence conservé pour la compta) |
| D4 | Initialisation des chambres | **Auto depuis l'existant** (tuples résidence/étage/chambre des comptes actifs), puis complétée à la main |
| D5 | Corail (prestataires) | Gérées comme des **postes** (places de rôle, sans chambre), même cycle de vie ; **pas de plafond** |
| D6 | Mécanisme d'invitation | **Email** (invite Supabase + lien magique) — l'envoi d'emails fonctionne déjà |
| D7 | Profil à l'acceptation | Résidence / (étage / chambre **ou** poste) **imposés et verrouillés** ; l'étudiante ne saisit que **mot de passe + infos perso** |

---

## 3. Modèle de données (proposition)

### 3.1. Table `places` (chambres **et** postes)

Unifie les deux types de « place » pour partager tout le cycle de vie.

| Colonne | Type | Détail |
|---|---|---|
| `id` | uuid | PK |
| `residence` | text | `12` \| `36` \| `corail` |
| `kind` | text | `chambre` \| `poste` |
| `etage` | text \| null | renseigné pour les chambres, **null** pour les postes |
| `code` | text | code chambre (ex. `grand_palais`) **ou** libellé de poste (ex. `Cuisine`) |
| `label` | text \| null | libellé lisible affiché (sinon dérivé de `code`) |
| `is_active` | bool | une place désactivée n'est plus proposée (ex. chambre en travaux) |
| `created_at` | timestamptz | |

> **Occupation déduite, pas stockée** : une place est « occupée » s'il existe un compte **actif** avec `place_id = places.id`, « libre » sinon. Évite les incohérences (une seule source de vérité).

### 3.2. Table `residentes` — colonnes ajoutées

| Colonne | Type | Détail |
|---|---|---|
| `place_id` | uuid \| null | FK → `places.id` (null pour invitées) |
| `statut` | text | `active` \| `archivee` (défaut `active`) |
| `archived_at` | timestamptz \| null | date de libération de la place |

> Les champs texte existants `residence` / `etage` / `chambre` sont **conservés et synchronisés** depuis la place (rétrocompatibilité : tout le code actuel les lit). À terme on pourra ne garder que `place_id`.

### 3.3. Table `invitations`

Suit l'état des invitations en attente (liste, relance, expiration).

| Colonne | Type | Détail |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | destinataire |
| `place_id` | uuid | FK → `places.id` (place réservée) |
| `role` | text | `residente` (extensible) |
| `auth_user_id` | uuid \| null | id du user Supabase créé par l'invite |
| `statut` | text | `envoyee` \| `acceptee` \| `expiree` \| `annulee` |
| `invited_by` | uuid | admin émettrice |
| `expires_at` | timestamptz | ex. +14 jours |
| `created_at` | timestamptz | |

---

## 4. Parcours (flows)

### 4.1. Ouvrir une place & inviter
1. L'admin ouvre l'écran **Chambres / Postes**, choisit une place **libre** (ou crée un poste corail).
2. Elle saisit l'**email** de la future occupante → **« Inviter »**.
3. Côté serveur (service role) : `auth.admin.inviteUserByEmail(email, { data: { role, place_id }, redirectTo })` + création d'une ligne `invitations` (`statut=envoyee`, `expires_at`).
4. L'étudiante reçoit un **email** avec un lien.

> **Anti-doublon** : impossible d'inviter sur une place **déjà occupée par un compte actif** ou **avec une invitation en attente**.

### 4.2. Accepter l'invitation
1. L'étudiante clique le lien → page **« Activer mon compte »**.
2. Elle définit son **mot de passe** et complète ses **infos perso** (nom, prénom, date de naissance…).
3. La **résidence / étage / chambre (ou poste)** sont **pré-remplis et verrouillés** (issus de `place_id`).
4. À la validation : création de la ligne `residentes` (`statut=active`, `place_id`), `invitations.statut=acceptee`. La place devient « occupée ».

### 4.3. Libérer une place (départ)
1. L'admin ouvre la place occupée → **« Libérer / Archiver l'occupante »** (confirmation).
2. `residentes.statut=archivee`, `archived_at=now()`, `place_id` **conservé pour l'historique** mais la place est **considérée libre** (car plus de compte *actif* dessus).

> Le compte archivé : **ne peut plus se connecter**, **disparaît** des listes actives (présences, compta courante, sélection repas), mais ses **repas/présences passés restent** → compta des mois écoulés intacte.

### 4.4. Réattribuer
Une place libérée (ou un poste corail dont la prestataire est partie) est **réattribuable** immédiatement (retour en 4.1). C'est le cas du **remplacement d'une prestataire**.

### 4.5. Relancer / annuler une invitation
- **Relancer** : renvoie l'email (nouveau lien), repousse `expires_at`.
- **Annuler** : `invitations.statut=annulee`, la place redevient librement ré-ouvrable.
- **Expiration** : passé `expires_at` sans acceptation → `expiree` (place ré-ouvrable).

---

## 5. Cas limites & garde-fous

- **Dernière administratrice** : on ne peut pas archiver/rétrograder le **super-admin** ni la dernière admin active (protection déjà en place à étendre).
- **Chambre occupée** : invitation refusée (cf. 4.1).
- **Invitée (invitees)** : **hors périmètre** — parcours self-signup inchangé, pas de place.
- **Corail** : postes sans étage/chambre ; pas de plafond ; sinon cycle identique.
- **Compte archivé réactivé** ? Hors périmètre v1 (si une ancienne revient, on réinvite sur une place).
- **Migration** : voir §7.
- **Self-signup résidentes** : **désactivé** (l'inscription résidente passe désormais par l'invitation). Le self-signup **invitées** reste.

---

## 6. Règles (à intégrer aux specs — `R-CPT-xx`)

- **R-CPT-01** — Un compte résidente est **rattaché à exactement une place** (chambre ou poste) ; une place active porte **au plus un compte actif**.
- **R-CPT-02** — La création d'un compte résidente/corail se fait **uniquement par invitation** d'une administratrice (plus de self-signup pour ces rôles).
- **R-CPT-03** — À l'acceptation, **résidence / étage / chambre (ou poste)** sont **imposés** par l'invitation et non modifiables par l'étudiante.
- **R-CPT-04** — Le départ **archive** le compte (`statut=archivee`) : plus de connexion, retiré des vues actives, **historique conservé** pour la comptabilité.
- **R-CPT-05** — Une place est **occupée** ssi un compte **actif** y est rattaché ; sinon **libre** et réattribuable.
- **R-CPT-06** — Les **invitées** conservent le self-signup et **n'occupent aucune place**.
- **R-CPT-07** — Corail : places de type **poste** (sans étage/chambre), **sans plafond** ; même cycle de vie.

---

## 7. Migration one-shot (D4)

1. **Générer les places** à partir des comptes **actifs** :
   - Résidences 12/36 → une place `chambre` par tuple distinct (résidence, étage, chambre).
   - Corail → une place `poste` par prestataire active (code = son rôle si connu, sinon nom).
2. **Rattacher** chaque compte actif à sa place (`place_id`), `statut=active`.
3. **Compléter à la main** : chambres actuellement **vides** (sans occupante) à ajouter, libellés à corriger.

> Livré sous forme de **script SQL idempotent** à exécuter dans Supabase, comme les lots précédents.

---

## 8. Impact sur l'existant

- **signupForm** : le rôle « résidente » (et corail) retiré du self-signup ; ne reste que « invitée ». Nouvel écran **« Activer mon compte »** pour l'acceptation.
- **Listes actives** (présences `/admin/foyer`, compta `/admin/repas-v2`, sélection repas) : filtrer `statut=active`.
- **Panneau Administration** : nouvel onglet/écran **« Chambres & postes »**.
- Tout le code lisant `residence/etage/chambre` continue de fonctionner (champs synchronisés depuis la place).

---

## 9. Découpage en phases & estimation (~28–40 h)

| Phase | Contenu | Est. |
|---|---|---|
| **P0** | Modèle de données (`places`, colonnes `residentes`, `invitations`) + migration seed SQL | 5–7 h |
| **P1** | Écran admin **Chambres & Postes** (liste par résidence/étage, occupant, statut) | 6–8 h |
| **P2** | **Ouvrir une place + inviter** (API service role, email, table invitations, relance/annulation) | 7–9 h |
| **P3** | Page **« Activer mon compte »** (mot de passe + profil verrouillé) | 5–7 h |
| **P4** | **Libérer/archiver + réattribuer** + cohérence compta/présences (filtrer archivées) | 4–6 h |
| **P5** | Désactivation self-signup résidentes + docs (`R-CPT-xx`, manuels) + déploiement par blocs | 3–4 h |

---

## 10. Décisions restantes à trancher

| # | Question | Reco |
|---|---|---|
| Q1 | Expiration d'invitation : **14 jours** convient ? | 14 j |
| Q2 | Corail : les postes ont-ils un **libellé libre** (Cuisine, Ménage…) ou une **liste fixe** de rôles ? | Libellé libre |
| Q3 | Une admin peut-elle **modifier la chambre** d'une résidente active (déménagement interne) ? | Oui, action « Déplacer » |
| Q4 | Faut-il un **écran de gestion des chambres** (créer/éditer/désactiver) dans l'appli, ou seed SQL + corrections ponctuelles par moi suffisent pour l'instant ? | Écran léger (autonomie multi-foyers) |
| Q5 | Les **invitations en attente** doivent-elles être visibles/relançables dans l'écran Chambres ? | Oui |

---

*À challenger, puis figer. Ensuite : implémentation P0 → P5, testée puis déployée par blocs.*
