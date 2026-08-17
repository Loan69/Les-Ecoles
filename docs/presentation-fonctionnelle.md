# Les Écoles — Présentation fonctionnelle de l'application

> **Document vivant** — mis à jour à chaque nouvelle fonctionnalité ou évolution.
> Dernière mise à jour : 17 août 2026 · Version 1.7

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
| **Administratrice** | Une résidente ayant des droits d'intendance | Tout ce qu'une résidente peut faire, **plus** des outils d'intendance selon ses **droits par section** (Repas · Événements · Absences · Comptes · Infos pratiques), chacun en **Lecture** ou **Édition**. Un **super-admin** a tous les droits + règle ceux des autres. |

> Une administratrice est techniquement une résidente à qui on a activé le droit « admin ». Il n'y a pas de compte admin séparé.

> Chaque section se règle sur **quatre niveaux** : **Aucun** (la section disparaît complètement — onglet, page et carte d'accueil — pour quelqu'un que le domaine ne concerne pas), **Utilisateur** (usage normal de résidente : c'est le niveau par défaut), **Lecture** et **Édition** (outils d'intendance).

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

C'est l'écran central de l'application, pensé comme un **récap du jour** : une **page de consultation** (les actions se font dans les écrans dédiés — repas dans l'onglet *Repas*, absences dans *Présence foyer*). Il affiche **une journée à la fois** ; on navigue d'un jour à l'autre par des **chevrons ‹ ›** (mobile **et** ordinateur), et un **icône calendrier** à côté de la date ouvre le calendrier pour choisir une autre date. La date consultée est mémorisée et partagée avec les autres écrans.

On y trouve, de haut en bas :
- en haut à droite, l'accès **Profil** et **Déconnexion** ; au centre, le **logo** ;
- la **date du jour** avec les chevrons et l'icône calendrier ;
- une carte **Présence au foyer** (lecture seule : au foyer / sortie ce soir) ;
- un **sélecteur de résidence** (12 / 36) — onglets de **couleur propre** (12 bleu, 36 rose) — pour filtrer les événements ;
- une carte **Événements** : rappels compacts des événements à venir + événements du jour ;
- une carte **Repas du jour** (lecture seule : déjeuner / dîner choisis).

### 4.2. La présence au foyer (la nuit)

Un **écran dédié « Présence foyer »** permet à chaque habitante de gérer ses **absences sous forme de séjours** : « du jour de départ au jour de retour ». Par défaut, tout le monde est présent ; on déclare uniquement les périodes où l'on dort à l'extérieur.

L'écran présente :
- un **calendrier mensuel** qui met en évidence les jours d'absence ;
- la liste **« Mes absences »**, où l'on peut **ajouter, modifier ou supprimer** un séjour ;

Cette information alimente la **vue d'ensemble des administratrices** (« au foyer » / « sorties » par résidence, pour une date donnée).

Pendant un séjour d'absence, les repas des **jours intérieurs** sont automatiquement notés **« Non »** ; les jours de **départ** et de **retour** restent au libre choix (on part après le dîner, on revient avant le déjeuner). Ce couplage se règle par une **case à cocher** sur le séjour (cochée par défaut), disponible aussi bien pour l'habitante que pour l'intendance quand elle saisit une absence à sa place.

### 4.3. La présence aux repas (le jour)

Pour chaque jour, deux services : **déjeuner** et **dîner**. Pour chacun, l'habitante choisit son option dans une liste déroulante (ou « Non » si elle ne mange pas au foyer).

Un service peut se trouver dans **trois** états, et l'appli les distingue clairement : une **option choisie**, un **« Non »** assumé, ou **« à renseigner »** tant que l'habitante n'a rien répondu. Ce troisième état est l'**état de départ** : « Non » doit être choisi explicitement. Les jours dont un service reste sans réponse portent un discret **badge orange** côté habitante (pour l'inciter à répondre), et apparaissent en gris « — » dans le détail de l'intendance, qui sait ainsi **qui relancer**. Ni « Non » ni « sans réponse » ne comptent de repas.

Les choix possibles dépendent du paramétrage : repas classique, **plateau**, **pique-nique** (chaud ou froid), ou **options spéciales** définies par l'intendance pour certaines dates.

Elle peut aussi **ajouter un commentaire** à un repas auquel elle est inscrite (ex. allergie, précision).

### 4.4. La planification de la semaine — l'onglet « Repas »

L'onglet **« Repas de la semaine »** est le **point central des repas**. Il présente **8 jours d'un coup — du lundi au lundi suivant inclus** (ce dernier lundi est partagé avec la semaine d'après, pour anticiper). L'habitante coche tous ses repas déjeuner/dîner, voit le nombre de modifications en attente, puis **enregistre le tout en une seule fois**.

On navigue de semaine en semaine et l'on peut revenir d'un clic à la semaine de référence (celle de la date sélectionnée dans l'appli). Les jours verrouillés et les menus spéciaux sont signalés visuellement.

Depuis cet écran, on trouve aussi :
- un bouton **« Inviter quelqu'un »** (ajouter un invité à un repas) ;
- pour l'intendance, une **barre de navigation repas** (pastilles) donnant accès directement aux **inscriptions/comptabilité** et au **paramétrage des repas** (menus spéciaux) — la même barre est présente sur ces écrans pour revenir à la visualisation sans repasser par l'accueil.

### 4.5. Inviter quelqu'un à un repas

Depuis l'onglet **Repas de la semaine**, une résidente peut **inviter une personne** à un repas : elle choisit un invité déjà connu ou en crée un nouveau (nom, prénom), précise **une date**, puis le **repas** parmi les **options ouvertes ce jour-là** (déjeuner ou dîner × option). Elle peut ensuite **modifier** ou **supprimer** l'invitation depuis « Mes invités ».

L'invité est alors comptabilisé **dans l'option choisie** : il apparaît dans le détail de cette option (vue Organisation de l'intendance) annoté « invité par … », et son repas est imputé à la résidente qui l'a invité pour la comptabilité.

### 4.6. Le calendrier et les événements

Un écran **calendrier** mensuel présente l'ensemble des événements du foyer (anniversaires, formations, intendance, autres). Chaque événement est coloré selon sa catégorie.

Les événements pertinents apparaissent aussi directement sur l'accueil, au jour concerné, et sous forme de **rappels** les jours précédents.

### 4.7. Confirmer sa participation

Lorsqu'un événement le demande, l'habitante peut **confirmer ou non sa participation** directement depuis l'événement. **Voir la liste des personnes inscrites** est en revanche une fonction d'intendance : elle demande le droit **Événements — Lecture**.

### 4.8. Son profil

Un écran **profil** récapitule les informations de l'habitante : nom, prénom, résidence, étage, chambre, date de naissance et statut (Résidente / Administratrice).

---

## 5. Côté administratrice (panneau d'administration)

Le panneau d'administration (⚙️, section **Comptes**) affiche **directement** la gestion des **Utilisatrices** (personnes **et** chambres réunies) — **plus d'onglets**. Les autres écrans d'intendance s'atteignent depuis leur onglet : **suivi des inscriptions repas** et **paramétrage repas** (via Repas de la semaine), **vue présence foyer** (via Présence foyer), **événements** (via Calendrier).

### 5.1. Gestion des utilisatrices

Une **liste unique** rassemble les personnes et leurs chambres, classée **résidence → étage → chambre** :

- Chaque ligne montre la **chambre**, son **occupante** (ou **Libre** / **Invitation envoyée**) et le **résumé de ses droits**.
- **Inviter** une résidente sur une chambre libre (nouvelle personne par email, ou réactivation d'un **compte désactivé**). Si le compte réactivé avait des droits admin, on choisit de **repartir de zéro** ou de **garder ses anciens droits**.
- **Régler les droits** d'une occupante (par section : Aucun / Lecture / Édition, ou Super-admin) via **« Droits »** — réservé au **super-admin**.
- **Déplacer** une résidente vers une autre chambre, ou **Libérer / désactiver** son compte (historique conservé).
- Deux panneaux repliables : **Comptes désactivés** (réactivables) et **Gérer les chambres & étages** (structure physique du foyer).
- **Supprimer** définitivement un compte reste possible (irréversible, réservé au **super-admin**).

> Les **invitées** (comptes simplifiés pour les repas) ne sont plus gérées depuis un onglet dédié : on les invite directement à un repas depuis **Repas de la semaine**. Elles conservent l'inscription libre et n'occupent aucune chambre.

> **Cet écran est la source de toute l'application.** Une personne n'apparaît dans les repas, la comptabilité, les présences, le ciblage des événements et les listes de personnes que si son compte y est **activé** : **actif et rattaché à une chambre ou à un poste**. Comptes désactivés, comptes sans chambre et invitées en sont donc absents — à une exception près, l'**historique** : une personne partie reste comptée dans les périodes où elle a réellement pris des repas, pour que la facturation reste juste.

### 5.2 bis. Groupes & visibilité des contenus

L'intendance peut créer des **groupes** de personnes portant un nom libre — « Staff 12 », « Intendance », « Responsables événements » — et y affecter des comptes depuis l'écran Administration.

Un groupe sert à **cibler la visibilité** d'un contenu. **Événements**, **options de repas** et **rubriques de l'onglet Administratif** partagent le même sélecteur : on coche des **résidences** entières, des **étages** précis et/ou des **groupes**, puis on peut **exclure** nommément quelqu'un dans la liste des personnes concernées. Les critères s'additionnent, et ne rien cocher laisse le contenu visible par toutes.

> Un groupe **n'accorde aucun droit** : il ne fait que rendre visible. Les droits d'intendance restent réglés séparément, section par section.

### 5.3. Repas spéciaux

Les administratrices peuvent définir des **menus spéciaux** qui remplacent les options de repas par défaut sur une **plage de dates** (ou de façon **indéfinie**) :

- choix du **service** concerné (déjeuner / dîner) ;
- liste d'options personnalisées, chacune pouvant être **ciblée** (résidences, étages, groupes) ou proposée à toutes, **active** ou **inactive** ;
- chaque option spéciale est rattachée à une **résidence**.

Les règles existantes sont listées, avec mise en évidence des **conflits** (quand deux règles se chevauchent, la plus récente l'emporte et l'autre est signalée comme inactive). Les règles peuvent être **modifiées** ou **supprimées**.

### 5.4. Réglages (heures de verrouillage)

Il n'y a plus d'onglet « Paramétrage » séparé ; les réglages sont au plus près de leur usage :
- **heure de verrouillage des repas** + **week-end anticipé** → dans *Paramétrer les repas* ;
- **heure de verrouillage de la présence foyer** → en haut de la *vue présence foyer*.

### 5.5. Suivi des inscriptions aux repas

Un écran présente, sur une **période choisie** (par défaut une semaine), un **planning hebdomadaire** par résidence avec, pour chaque jour et chaque résidence, le nombre de :
- repas du **midi** et du **soir** ;
- **pique-niques** (comptés sur le jour de préparation, soit la veille) ;
- **plateaux** ;
- **options spéciales** (détaillées).

Un **total par jour** et par résidence est calculé. Une **recherche détaillée** permet de voir, personne par personne, qui mange quoi et avec quel commentaire.

Au clic sur une option, la **liste des inscrits** s'ouvre. Une administratrice **édition (niveau ≥ 3)** peut y **corriger les inscriptions** (même après verrouillage) : changer l'option d'une personne ou la retirer, ajouter une résidente, ajouter ou retirer un invité. Les corrections se reportent aussitôt sur le détail et la comptabilité.

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
- **visibilité ciblée** : par résidence (Corail inclus), par étage et/ou par chambre — la liste des personnes est celle des comptes actifs ;
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
