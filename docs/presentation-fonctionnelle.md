# Les Écoles — Présentation fonctionnelle de l'application

> **Document vivant** — mis à jour à chaque nouvelle fonctionnalité ou évolution.
> Dernière mise à jour : 6 juin 2026 · Version 1.0

---

## 1. Qu'est-ce que l'application ?

**Les Écoles** est une application web **mobile-first** (pensée d'abord pour le téléphone, mais accessible sur ordinateur) de **gestion interne d'un foyer d'étudiantes**.

Elle remplace les listes papier et les échanges informels par un outil unique où chaque habitante déclare elle-même, jour après jour :

- **si elle dort au foyer** ou à l'extérieur (gestion des présences de nuit) ;
- **si elle mange au foyer** le midi et le soir, et quel type de repas elle prend (gestion des repas).

L'équipe d'intendance (les administratrices) dispose en parallèle d'un **tableau de bord** pour connaître en temps réel le nombre de couverts à préparer, savoir qui est présent, gérer les comptes et organiser la vie du foyer (événements, repas spéciaux, etc.).

Le foyer est organisé en **deux résidences** : la **Résidence 12** et la **Résidence 36**.

---

## 2. Les utilisatrices et leurs rôles

| Rôle | Qui ? | Ce qu'elle peut faire |
|---|---|---|
| **Résidente** | Une habitante du foyer | Déclarer ses présences (nuit + repas), inviter des personnes aux repas, consulter le calendrier, confirmer sa participation aux événements, consulter son profil. |
| **Invitée** | Un compte simplifié (ex. étudiante de passage) | S'inscrire aux repas et consulter les événements qui lui sont ouverts. |
| **Administratrice** | Une résidente disposant des droits d'admin | Tout ce qu'une résidente peut faire, **plus** l'accès complet au panneau d'administration. |

> Une administratrice est techniquement une résidente à qui on a activé le droit « admin ». Il n'y a pas de compte admin séparé.

---

## 3. Inscription et connexion

### Création de compte
Une nouvelle utilisatrice s'inscrit en choisissant son profil (**résidente** ou **invitée**) puis en remplissant un formulaire :

- **Résidente** : nom, prénom, date de naissance, résidence, étage, chambre, email, mot de passe.
- **Invitée** : nom, prénom, type d'invitée (Étudiante / Autre), email, mot de passe.

L'inscription se fait en deux temps :
1. Les informations sont enregistrées en attente, et un **email de confirmation** est envoyé.
2. Une fois l'email validé, le compte est activé automatiquement à la première connexion.

### Connexion et mot de passe
- Connexion par **email + mot de passe**.
- Fonction **« mot de passe oublié »** avec réinitialisation par email.

---

## 4. Côté résidente / invitée

### 4.1. L'écran d'accueil (la journée en cours)

C'est l'écran central de l'application. Il affiche **une journée à la fois**, et l'on navigue d'un jour à l'autre par **glissement (swipe)** sur mobile ou par des **flèches** sur ordinateur. La date consultée est mémorisée et partagée avec les autres écrans.

On y trouve, de haut en bas :
- la **date du jour** ;
- un **sélecteur de résidence** (12 / 36) pour filtrer les événements affichés ;
- les **rappels** des événements à venir et les **événements** prévus ce jour-là ;
- la **présence aux repas** (déjeuner et dîner).

*(La présence au foyer a quitté l'accueil pour son propre écran, voir 4.2.)*

### 4.2. La présence au foyer (la nuit)

Un **écran dédié « Présence foyer »** permet à chaque habitante de gérer ses **absences sous forme de séjours** : « du jour de départ au jour de retour ». Par défaut, tout le monde est présent ; on déclare uniquement les périodes où l'on dort à l'extérieur.

L'écran présente :
- un **calendrier mensuel** qui met en évidence les jours d'absence ;
- la liste **« Mes absences »**, où l'on peut **ajouter, modifier ou supprimer** un séjour ;
- pour chaque séjour, un champ **facultatif « je suis chez… »** (contact pendant l'absence).

Cette information alimente la **vue d'ensemble des administratrices** (« au foyer » / « sorties » par résidence, pour une date donnée).

> *À venir (Lot 2) : pendant un séjour d'absence, les repas seront automatiquement notés « Non », avec un réglage fin des repas pour le jour de départ et le jour de retour.*

### 4.3. La présence aux repas (le jour)

Pour chaque jour, deux services : **déjeuner** et **dîner**. Pour chacun, l'habitante choisit son option dans une liste déroulante (ou « Non » si elle ne mange pas au foyer).

Les choix possibles dépendent du paramétrage : repas classique, **plateau**, **pique-nique** (chaud ou froid), ou **options spéciales** définies par l'intendance pour certaines dates.

Elle peut aussi **ajouter un commentaire** à un repas auquel elle est inscrite (ex. allergie, précision).

### 4.4. La planification de la semaine — l'onglet « Repas »

L'onglet **« Repas de la semaine »** est le **point central des repas**. Il présente **8 jours d'un coup — du lundi au lundi suivant inclus** (ce dernier lundi est partagé avec la semaine d'après, pour anticiper). L'habitante coche tous ses repas déjeuner/dîner, voit le nombre de modifications en attente, puis **enregistre le tout en une seule fois**.

On navigue de semaine en semaine et l'on peut revenir d'un clic à la semaine de référence (celle de la date sélectionnée dans l'appli). Les jours verrouillés et les menus spéciaux sont signalés visuellement.

Depuis cet écran, on trouve aussi :
- un bouton **« Inviter quelqu'un »** (ajouter un invité à un repas) ;
- pour l'intendance, un **« Espace intendance »** repliable donnant accès aux **inscriptions/comptabilité** et au **paramétrage des repas** (menus spéciaux) — désormais regroupés ici plutôt que dispersés.

### 4.5. Inviter quelqu'un à un repas

Depuis l'accueil, une résidente peut **inviter une personne** à un repas : elle choisit un invité déjà connu ou en crée un nouveau (nom, prénom), précise la **date**, le **service** (déjeuner / dîner) et la **résidence** où le repas sera pris.

L'invité est alors comptabilisé dans les couverts de la résidence concernée.

### 4.6. Le calendrier et les événements

Un écran **calendrier** mensuel présente l'ensemble des événements du foyer (anniversaires, formations, intendance, autres). Chaque événement est coloré selon sa catégorie.

Les événements pertinents apparaissent aussi directement sur l'accueil, au jour concerné, et sous forme de **rappels** les jours précédents.

### 4.7. Confirmer sa participation

Lorsqu'un événement le demande, l'habitante peut **confirmer ou non sa participation** directement depuis l'événement.

### 4.8. Son profil

Un écran **profil** récapitule les informations de l'habitante : nom, prénom, résidence, étage, chambre, date de naissance et statut (Résidente / Administratrice).

---

## 5. Côté administratrice (panneau d'administration)

Le panneau d'administration est organisé en quatre onglets : **Utilisatrices**, **Invités**, **Repas**, **Paramétrage**. S'y ajoutent deux vues opérationnelles : le **suivi des inscriptions repas** et la **vue présence foyer**.

### 5.1. Gestion des utilisatrices

- Lister toutes les résidentes.
- **Promouvoir ou révoquer** une administratrice.
- **Supprimer** un compte.

### 5.2. Gestion des invités

Consultation et gestion de la liste des personnes invitées aux repas.

### 5.3. Repas spéciaux

Les administratrices peuvent définir des **menus spéciaux** qui remplacent les options de repas par défaut sur une **plage de dates** (ou de façon **indéfinie**) :

- choix du **service** concerné (déjeuner / dîner) ;
- liste d'options personnalisées, chacune pouvant être **réservée aux admins** ou **publique**, **active** ou **inactive** ;
- chaque option spéciale est rattachée à une **résidence**.

Les règles existantes sont listées, avec mise en évidence des **conflits** (quand deux règles se chevauchent, la plus récente l'emporte et l'autre est signalée comme inactive). Les règles peuvent être **modifiées** ou **supprimées**.

### 5.4. Paramétrage

Réglage des paramètres généraux de l'application :
- **heure de verrouillage des repas** ;
- **heure de verrouillage de la présence foyer** ;
- **verrouillage anticipé du week-end** (activé / désactivé).

### 5.5. Suivi des inscriptions aux repas

Un écran présente, sur une **période choisie** (par défaut une semaine), un **planning hebdomadaire** par résidence avec, pour chaque jour et chaque résidence, le nombre de :
- repas du **midi** et du **soir** ;
- **pique-niques** (comptés sur le jour de préparation, soit la veille) ;
- **plateaux** ;
- **options spéciales** (détaillées).

Un **total par jour** et par résidence est calculé. Une **recherche détaillée** permet de voir, personne par personne, qui mange quoi et avec quel commentaire.

### 5.6. Comptabilité

Un onglet **comptabilité** récapitule sur la période :
- le **total des repas par résidence** (déjeuners, dîners, total) ;
- un **grand total** toutes résidences confondues ;
- le **détail par personne** (nombre de déjeuners, dîners et total), invités compris.

### 5.7. Vue présence foyer

Un écran présente, pour une **date choisie** et par résidence, la liste des personnes **au foyer** et **sorties**, avec une **recherche** par nom.

### 5.8. Création et gestion d'événements

Les administratrices créent et gèrent les événements du calendrier. Pour chaque événement :
- **type** (anniversaire, formation, intendance, autre), **titre**, **description** ;
- **une ou plusieurs dates** ;
- **horaire** ;
- **lieu(x)** : une ou plusieurs résidences ;
- **visibilité ciblée** : par résidence, par étage et/ou par chambre ;
- **visible par les invitées** (oui / non) ;
- **réservé au staff** (aucun / staff 12 / staff 36 / tout le staff) ;
- **demande de confirmation** de participation (oui / non) ;
- **rappel** : nombre de jours avant l'événement où afficher un rappel.

Les événements multi-dates peuvent être supprimés **occurrence par occurrence** ou **en totalité**.

---

## 6. Navigation

Une **barre de navigation** fixe en bas d'écran donne accès à :
**Calendrier · Repas de la semaine · Accueil · Profil** — et, pour les administratrices uniquement, **Administration**.

---

## 7. En résumé

| Domaine | Ce que l'appli permet |
|---|---|
| **Présence nuit** | Chaque habitante déclare si elle dort au foyer ; l'intendance a la liste en temps réel. |
| **Repas** | Déclaration déjeuner/dîner au jour le jour ou à la semaine, avec options (plateau, pique-nique, menus spéciaux) et commentaires. |
| **Invités** | Inviter des personnes extérieures à un repas, comptabilisées automatiquement. |
| **Événements** | Calendrier partagé, ciblage fin de la visibilité, rappels et confirmations de participation. |
| **Comptabilité** | Comptage automatique des couverts par jour, par résidence et par personne. |
| **Administration** | Gestion des comptes, des menus spéciaux et des paramètres de verrouillage. |
