# Les Écoles — Présentation fonctionnelle de l'application

> **Document vivant** — mis à jour à chaque nouvelle fonctionnalité ou évolution.
> Dernière mise à jour : 21 août 2026 · Version 1.9

---

## 1. Qu'est-ce que l'application ?

**Les Écoles** est une application web **mobile-first** (pensée d'abord pour le téléphone, mais accessible sur ordinateur) de **gestion interne d'un foyer d'étudiantes**.

Elle remplace les listes papier et les échanges informels par un outil unique où chaque habitante déclare elle-même, jour après jour :

- **si elle dort au foyer** ou à l'extérieur (gestion des présences de nuit) ;
- **si elle mange au foyer** le midi et le soir, et quel repas elle prend (gestion des repas).

L'équipe d'intendance (les administratrices) dispose en parallèle d'un **tableau de bord** pour connaître en temps réel le nombre de couverts à préparer, savoir qui est présent, gérer les comptes et organiser la vie du foyer (événements, options de repas, informations pratiques).

Le foyer est organisé en **blocs**, déclarés dans l'application et non figés dans le programme. Un bloc est
soit une **résidence** — un lieu physique, avec ses étages et ses chambres — soit une **équipe** rattachée au
foyer sans y loger, avec ses **postes** plutôt que des chambres. Aux Écoles, cela donne aujourd'hui la
**Résidence 12**, la **Résidence 36** et **Corail** (l'intendance), mais l'intendance peut en ajouter,
en renommer et en réordonner : tout écran qui présente « un encadré par bloc » suit cette liste.

---

## 2. Les utilisatrices et leurs rôles

| Rôle | Qui ? | Ce qu'elle peut faire |
|---|---|---|
| **Résidente** | Une habitante du foyer, invitée par l'intendance sur une chambre ou un poste | Déclarer ses présences (nuit + repas), inviter des personnes aux repas, consulter le calendrier, confirmer sa participation aux événements, lire les informations pratiques, consulter son profil. |
| **Invitée** | Un compte simplifié (ex. étudiante de passage), créé librement | S'inscrire aux repas et consulter les contenus qui lui sont ouverts. Elle n'occupe ni chambre ni poste. |
| **Administratrice** | Une résidente ayant des droits d'intendance | Tout ce qu'une résidente peut faire, **plus** des outils d'intendance selon ses **droits par section** (Repas · Événements · Absences · Comptes · Infos pratiques). Un **super-admin** a tous les droits + règle ceux des autres. |

> Une administratrice est une résidente à qui l'on a ouvert des droits **sur une ou plusieurs sections**. Il n'y a pas de compte admin séparé, et rien n'oblige à tout donner : on peut n'ouvrir que la comptabilité des repas, ou que les événements.

> Chaque section se règle sur **quatre niveaux** : **Masquée** (la section disparaît complètement — onglet, page et carte d'accueil — pour quelqu'un que le domaine ne concerne pas), **Habitante** (usage normal, ses propres données : c'est le niveau par défaut), **Admin · consulter** (voit les données de tout le foyer) et **Admin · gérer** (les modifie).

---

## 3. Inscription et connexion

### Arrivée d'une résidente — sur invitation
Une résidente **ne s'inscrit pas d'elle-même**. L'intendance ouvre une chambre (ou un poste) depuis l'écran Administration et **envoie une invitation par email**. En suivant le lien, la nouvelle arrivante **choisit son mot de passe** et complète son profil : nom, prénom, date de naissance. Son **bloc, son étage et sa chambre sont imposés** par l'invitation — elle ne peut pas les changer. L'invitation reste valable **14 jours** et peut être relancée ou annulée.

### Arrivée d'une invitée — inscription libre
Les **invitées** (comptes simplifiés) gardent l'inscription libre depuis l'écran de connexion : nom, prénom, type d'invitée, email, mot de passe, puis confirmation par email.

### Connexion et mot de passe
- Connexion par **email + mot de passe**.
- Fonction **« mot de passe oublié »** avec réinitialisation par email.
- La **session reste ouverte** d'une visite à l'autre : rouvrir l'appli (téléphone ou ordinateur) ramène **directement à l'accueil**, sans ressaisir le mot de passe. Seule la **déconnexion** ferme la session.

### Départ
Au départ d'une résidente, l'intendance **libère sa place** : le compte est **désactivé**, l'historique est conservé pour la facturation, et la chambre redevient attribuable.

---

## 4. Côté résidente / invitée

### 4.1. L'écran d'accueil (la journée en cours)

C'est l'écran central de l'application, pensé comme un **récap du jour** : une **page de consultation** (les actions se font dans les écrans dédiés — repas dans l'onglet *Repas*, absences dans *Présence foyer*). Il affiche **une journée à la fois** ; on navigue d'un jour à l'autre par des **chevrons ‹ ›** (mobile **et** ordinateur), et une **icône calendrier** à côté de la date ouvre le calendrier pour choisir une autre date. La date consultée est mémorisée et partagée avec les autres écrans.

On y trouve, de haut en bas :
- en haut à droite, l'accès **Administration** (pour l'intendance), **Profil** et **Déconnexion** ; au centre, le **logo** ;
- la **date du jour** avec les chevrons et l'icône calendrier ;
- une carte **Présence au foyer** (lecture seule : au foyer / sortie ce soir) ;
- un **sélecteur de résidence** — un onglet par **résidence**, dans sa **couleur** et son **ordre** réglés en administration — pour filtrer les événements. Une équipe (Corail) n'y figure pas : n'étant pas un lieu physique, elle n'accueille pas d'événement ;
- une carte **Événements** : rappels compacts des événements à venir + événements du jour ;
- une carte **Repas du jour** (lecture seule : déjeuner / dîner choisis), suivie de ses éventuels **invités**, seuls éléments modifiables de l'accueil.

Chaque carte disparaît pour qui a la section correspondante au niveau **Masquée**.

### 4.2. La présence au foyer (la nuit)

Un **écran dédié « Présence foyer »** permet à chaque habitante de gérer ses **absences sous forme de séjours** : « du jour de départ au jour de retour ». Par défaut, tout le monde est présent ; on déclare uniquement les périodes où l'on dort à l'extérieur.

L'écran présente :
- un **calendrier mensuel** qui met en évidence les jours d'absence ;
- la liste **« Mes absences »**, où l'on peut **ajouter, modifier ou supprimer** un séjour.

Une nuit se déclare **jusqu'à une heure limite fixée par l'intendance** (par défaut 23:00) : passé cette heure, les lits sont comptés et la nuit du jour même n'est plus modifiable — pas plus que les nuits déjà passées. Le calendrier affiche alors un cadenas sur le jour. Ce qui est verrouillé, c'est **la nuit, pas le séjour** : on peut donc toujours **prolonger** vers l'avenir une absence commencée hier, mais plus la supprimer. En cas de besoin, l'intendance peut corriger à tout moment.

Cette information alimente la **vue d'ensemble des administratrices** (« au foyer » / « sorties » par bloc, sur une période donnée).

Pendant un séjour d'absence, les repas des **jours intérieurs** sont automatiquement notés **« Non »** ; les jours de **départ** et de **retour** restent au libre choix (on part après le dîner, on revient avant le déjeuner). Ce couplage se règle par une **case à cocher** sur le séjour (cochée par défaut), disponible aussi bien pour l'habitante que pour l'intendance quand elle saisit une absence à sa place.

### 4.3. La présence aux repas (le jour)

Pour chaque jour, deux services : **déjeuner** et **dîner**. Pour chacun, l'habitante choisit son repas dans la liste des **options ouvertes ce jour-là** (ou « Non » si elle ne mange pas au foyer).

Il n'y a **pas de menu figé dans le programme** : l'intendance compose un **catalogue d'options** (« Repas classique », « Plateau », « Pique-nique froid », « Sans porc »…) et **ouvre**, jour par jour et service par service, celles qui sont proposées. Un jour dont aucune option n'est ouverte s'affiche **« Service fermé »**. Une option peut n'être proposée **qu'à certaines personnes** (voir §5.2).

Un service peut se trouver dans **trois** états, et l'appli les distingue clairement : une **option choisie**, un **« Non »** assumé, ou **« à renseigner »** tant que l'habitante n'a rien répondu. Ce troisième état est l'**état de départ** : « Non » doit être choisi explicitement. Les jours dont un service reste sans réponse portent un discret **badge orange** côté habitante (pour l'inciter à répondre), et apparaissent en gris « — » dans le détail de l'intendance, qui sait ainsi **qui relancer**. Ni « Non » ni « sans réponse » ne comptent de repas.

Deux limites de temps ferment un service :
- l'**heure de verrouillage** du jour même, réglée par l'intendance (avec une clôture anticipée du week-end dès le vendredi si elle le souhaite) ;
- le **délai de commande propre à l'option** : un pique-nique peut ainsi devoir être commandé la veille, alors que le repas classique reste ouvert jusqu'au soir.

### 4.4. La planification de la semaine — l'onglet « Repas »

L'onglet **« Repas de la semaine »** est le **point central des repas**. Il présente **8 jours d'un coup — du lundi au lundi suivant inclus** (ce dernier lundi est partagé avec la semaine d'après, pour anticiper). Chaque choix est **enregistré immédiatement**, sans bouton de validation : il s'affiche aussitôt et part en arrière-plan ; si l'enregistrement échoue (jour verrouillé, connexion coupée), l'écran **revient à son état précédent** et un message l'explique.

On navigue de semaine en semaine et l'on peut revenir d'un clic à la semaine de référence (celle de la date sélectionnée dans l'appli). Les jours verrouillés, les services fermés et les événements du jour sont signalés visuellement.

Depuis cet écran, on trouve aussi :
- un bouton **« Inviter quelqu'un »** (ajouter un invité à un repas) et la liste **« Mes invités »** ;
- pour l'intendance, une **barre de navigation repas** (pastilles) donnant accès directement aux **inscriptions / comptabilité** et au **paramétrage des repas** — la même barre est présente sur ces écrans pour revenir à la visualisation sans repasser par l'accueil.

### 4.5. Inviter quelqu'un à un repas

Depuis l'onglet **Repas de la semaine**, une résidente peut **inviter une personne** à un repas : elle choisit un invité déjà connu (par **recherche** dans son carnet) ou en crée un nouveau — **le nom ou le prénom suffit** —, précise **une date**, puis le **repas** parmi les **options ouvertes ce jour-là** (déjeuner ou dîner × option). Elle peut ensuite **modifier** ou **supprimer** l'invitation depuis « Mes invités » ou depuis l'accueil.

Les options proposées pour un invité sont **celles de l'invitante** : on ne peut pas inscrire quelqu'un à un repas auquel on n'a pas soi-même accès.

L'invité est alors comptabilisé **dans l'option choisie** : il apparaît dans le détail de cette option (vue Organisation de l'intendance) annoté « invité par … », et son repas est imputé à la résidente qui l'a invité pour la comptabilité.

### 4.6. Le calendrier et les événements

Un écran **calendrier** mensuel présente l'ensemble des événements du foyer (anniversaires, formations, intendance, autres). Chaque événement est coloré selon sa catégorie.

Les événements pertinents apparaissent aussi directement sur l'accueil, au jour concerné, et sous forme de **rappels** les jours précédents.

### 4.7. Confirmer sa participation

Lorsqu'un événement le demande, l'habitante peut **confirmer ou non sa participation** directement depuis l'événement. **Voir la liste des personnes inscrites** est en revanche une fonction d'intendance : elle demande le droit **Événements — Admin · consulter**.

### 4.8. Les informations pratiques — l'onglet « Administratif »

Un onglet **Administratif** rassemble les **informations pratiques du foyer** en rubriques libres, créées et tenues à jour par l'intendance : consignes, règlement, procédures, **modes d'emploi de l'application**, et rubriques de **contacts** (nom, rôle, téléphone, email). Chaque rubrique peut être **ciblée** sur une partie du foyer (voir §5.2).

### 4.9. Son profil

Un écran **profil** récapitule les informations de l'habitante : nom, prénom, résidence, étage, chambre, date de naissance et les **groupes** auxquels elle appartient (« Staff 12 », « Intendance »…).

---

## 5. Côté administratrice (outils d'intendance)

Il n'y a pas de « panneau d'administration » unique : chaque outil vit **au plus près de son usage**. Le bouton ⚙️ en haut à droite ouvre la gestion des **comptes** ; les autres écrans s'atteignent depuis leur onglet : **inscriptions repas** et **paramétrage des repas** (via *Repas de la semaine*), **vue présence foyer** (via *Présence foyer*), **événements** (via *Calendrier*), **rubriques d'informations** (via *Administratif*). Chaque outil n'apparaît qu'aux personnes qui ont le droit correspondant.

### 5.1. Gestion des comptes, chambres et structure du foyer

Une **liste unique** rassemble les personnes et leurs chambres, classée **bloc → étage → chambre** :

- Chaque ligne montre la **chambre**, son **occupante** (ou **Libre** / **Invitation envoyée**), ses **groupes** et le **résumé de ses droits**.
- **Inviter** une résidente sur une chambre libre (nouvelle personne par email, ou réactivation d'un **compte désactivé**). Si le compte réactivé avait des droits admin, on choisit de **repartir de zéro** ou de **garder ses anciens droits**. Une invitation en cours se **relance** ou s'**annule**.
- **Régler les droits** d'une occupante via **« Droits »** — réservé au **super-admin**. Un niveau par section, parmi **Masquée**, **Habitante**, **Admin · consulter** et **Admin · gérer** ; ou **Super-admin**, qui a tout.
- **Déplacer** une résidente vers une autre chambre, ou **Libérer / désactiver** son compte (historique conservé).
- Deux panneaux repliables : **Gérer les blocs, chambres & étages** (la structure du foyer, réservée au **super-admin**) et, en fin d'écran, **Comptes désactivés** (réactivables).
- Dans le panneau de structure : créer un **bloc** (résidence ou équipe) avec son nom, son contenu, sa couleur et son rang ; puis, dans une résidence, créer un **étage** — même vide — avant d'y ajouter des **chambres**. Un étage se renomme et se réordonne ; sa position commande le classement des personnes partout dans l'application.
- **Supprimer** définitivement un compte est possible une fois qu'il est **désactivé** (irréversible ; le super-admin peut supprimer n'importe quel compte). ⚠️ La suppression **retire les repas passés de la comptabilité**, là où la désactivation les conservait : à ne faire qu'après facturation.

> Les **invitées** (comptes simplifiés pour les repas) ne sont pas gérées depuis cet écran : on les invite directement à un repas depuis **Repas de la semaine**. Elles conservent l'inscription libre et n'occupent aucune chambre.

> **Cet écran est la source de toute l'application.** Une personne n'apparaît dans les repas, la comptabilité, les présences, le ciblage des événements et les listes de personnes que si son compte y est **activé** : **actif et rattaché à une chambre ou à un poste**. Comptes désactivés, comptes sans chambre et invitées en sont donc absents — à une exception près, l'**historique** : une personne partie reste comptée dans les périodes où elle a réellement pris des repas, pour que la facturation reste juste.

### 5.2. Groupes & visibilité des contenus

L'intendance peut créer des **groupes** de personnes portant un nom libre — « Staff 12 », « Intendance », « Responsables événements » — et y affecter des comptes depuis l'écran Administration, par **recherche** de nom. Chaque groupe reçoit sa **couleur**, la même sur tous les écrans, et les groupes d'une personne s'affichent **à côté de son nom**.

Un groupe sert à **cibler la visibilité** d'un contenu. **Événements**, **options de repas** et **rubriques de l'onglet Administratif** partagent le même sélecteur : on coche des **résidences** entières, des **étages** précis et/ou des **groupes**, puis on peut **exclure** nommément quelqu'un dans la liste des personnes concernées. Les critères s'additionnent, et **ne rien cocher laisse le contenu visible par toutes**.

> Un groupe **n'accorde aucun droit** : il ne fait que rendre visible. Les droits d'intendance restent réglés séparément, section par section.

### 5.3. Paramétrer les repas

L'écran **« Paramétrer les repas »** tient le **catalogue des options** et l'**ouverture des services**.

Le **catalogue** liste les repas possibles. Pour chacun :
- son **libellé** (« Repas classique », « Plateau », « Pique-nique froid »…) ;
- son **rattachement comptable** : le bloc où le repas est servi — donc une résidence, jamais une équipe — ou bien **« la résidence de la personne »** ;
- son **délai de commande** en jours d'avance (0 = clôture le jour même à l'heure de verrouillage, 1 = la veille, etc.) ;
- sa **visibilité** (§5.2) : proposée à toutes, ou seulement à certaines résidences / étages / groupes ;
- son état **actif / inactif**. Une option déjà utilisée ne peut pas être supprimée — elle se désactive.

L'**ouverture des services** se fait ensuite semaine par semaine : pour chaque jour et chaque service, on coche les options proposées. Un jour sans aucune option est un **service fermé** — il n'existe **aucun repas proposé par défaut**, donc tant que l'intendance n'a rien ouvert, les habitantes ne voient que des services fermés. Pour éviter la saisie répétitive, on peut **dupliquer les options d'un jour sur une plage de dates**.

L'**heure de verrouillage des repas** et la **clôture anticipée du week-end** se règlent en haut de ce même écran.

### 5.4. Suivi des inscriptions aux repas — onglet « Organisation »

Sur une **période choisie** (par défaut une semaine), les jours sont **empilés verticalement** et détaillent, pour chaque service, les **options ouvertes** — même celles à zéro inscrit — avec leur nombre d'inscrits.

- **Cliquer sur un nombre** ouvre la **liste des personnes** derrière ce nombre, invités compris (annotés « invité par … »).
- Une administratrice **Admin · gérer** peut y **corriger les inscriptions**, **même après verrouillage** : changer l'option d'une personne ou la retirer, ajouter une résidente, ajouter ou retirer un invité. Les corrections se reportent aussitôt sur le détail et la comptabilité, et sont **tracées** dans un journal (qui, quand, quoi).
- La **loupe** ouvre un **tableau de détail** — les habitantes en lignes, les jours × services en colonnes — montrant qui mange quoi, avec « Non » en rouge, « — » pour les sans-réponse et la mention **« Absente »** pour les jours couverts par un séjour d'absence. Ce tableau s'**exporte en CSV**.

### 5.5. Comptabilité des repas

L'onglet **Comptabilité** récapitule sur la période :
- le **total des repas par bloc** (déjeuners, dîners, total) ;
- un **grand total** tous blocs confondus ;
- le **détail par personne** (nombre de déjeuners, dîners et total), invités compris — le repas d'un invité étant imputé à celle qui l'a invité.

Les **absences déclarées sont déduites** automatiquement, et le tout s'**exporte en CSV** pour la facturation.

### 5.6. Vue présence foyer

Sur une **période choisie**, les jours sont **empilés verticalement** avec, pour chaque bloc, le nombre de personnes **au foyer** (vert) et **sorties** (rouge). Chaque nombre est **cliquable** et ouvre la liste des personnes concernées, avec une **recherche** par nom.

- La **loupe** ouvre le **tableau de détail** (habitantes × jours), exportable en **CSV**.
- Le bouton **« Ajouter une absence »** permet à l'intendance d'enregistrer un séjour pour quelqu'un — ou au contraire de le **marquer présent** —, avec l'option de **noter « Non » aux repas** sur l'intervalle.
- Les présences se **corrigent directement dans la liste**.
- L'**heure limite de modification de la présence au foyer** se règle en haut de cet écran (par défaut **23:00**). Passé cette heure, une habitante ne peut plus toucher à sa présence **pour la nuit même**, ni revenir sur un jour passé ; l'intendance, elle, garde la main à toute heure depuis « Ajouter une absence ».

### 5.7. Création et gestion d'événements

Les administratrices créent et gèrent les événements du calendrier. Pour chaque événement :
- **type** (anniversaire, formation, intendance, autre), **titre**, **description** ;
- **une ou plusieurs dates** ;
- **horaire** ;
- **lieu(x)** : une ou plusieurs résidences — **facultatif**. Sans lieu, l'événement s'affiche en rappel « Aujourd'hui » sur l'accueil le jour J ;
- **visibilité ciblée** : résidences, étages et/ou groupes, moins les **exclusions nominatives** (§5.2) ;
- **demande de confirmation** de participation (oui / non), dont la **liste des inscrits** est consultable ;
- **rappel** : nombre de jours avant l'événement où afficher un rappel.

Les événements multi-dates peuvent être supprimés **occurrence par occurrence** ou **en totalité**.

### 5.8. Rubriques d'informations pratiques

Depuis l'onglet **Administratif**, l'intendance **crée, renomme, réordonne et supprime** les rubriques. Deux types :
- **texte mis en forme** (titres, listes, gras, liens) ;
- **contacts structurés** (nom, rôle, téléphone, email).

La **visibilité** de la rubrique (§5.2) se règle dès sa création, en même temps que son titre et son type.

---

## 6. Navigation

Une **barre de navigation** fixe en bas d'écran donne accès à :
**Calendrier · Repas de la semaine · Accueil · Présence foyer · Administratif**.

Chaque onglet correspond à une section : il **disparaît** pour qui a cette section au niveau **Masquée**. Seul l'**Accueil** est toujours présent.

En haut à droite de chaque écran principal : **⚙️ Administration** (pour qui a le droit sur la section Comptes), **Profil** et **Déconnexion**.

---

## 7. En résumé

| Domaine | Ce que l'appli permet |
|---|---|
| **Présence nuit** | Chaque habitante déclare ses séjours d'absence ; l'intendance a la liste au foyer / sorties, jour par jour, et peut la corriger. |
| **Repas** | Déclaration déjeuner/dîner sur 8 jours, parmi un **catalogue d'options** composé par l'intendance et ouvert jour par jour ; verrouillage horaire et délai de commande par option. |
| **Invités** | Inviter des personnes extérieures à un repas, comptabilisées sur l'invitante. |
| **Événements** | Calendrier partagé, ciblage fin de la visibilité (résidences / étages / groupes), rappels et confirmations de participation. |
| **Comptabilité** | Comptage automatique des couverts par jour, par bloc et par personne, absences déduites, export CSV. |
| **Informations pratiques** | Rubriques libres et contacts, tenues par l'intendance, ciblables. |
| **Administration** | Gestion des comptes et des invitations, structure du foyer (blocs, étages, chambres), groupes, droits par section. |
