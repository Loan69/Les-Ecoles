# Les Écoles — Note de spécification (règles métier)

> **Document vivant** — toute nouvelle règle, modification ou suppression de règle doit être reportée ici.
> Dernière mise à jour : 23 juillet 2026 · Version 1.13

## Comment lire ce document

Chaque règle porte un **identifiant stable** de la forme `R-THEME-NN` (ex. `R-REPAS-03`).
Cet identifiant ne change jamais : on peut donc s'y référer dans les discussions, les évolutions et les tickets. Quand une règle est modifiée, on garde son identifiant et on met à jour son contenu (en notant la date).

**Thèmes :**
[ROLE] Rôles & accès · [INSC] Inscription & authentification · [FOYER] Présence au foyer ·
[REPAS] Présence aux repas · [OPT] Options de repas · [LOCK] Verrouillages ·
[INV] Invités aux repas · [EVT] Événements & calendrier · [COMPTA] Comptabilité & suivi ·
[RES] Résidences

---

## 1. Rôles & accès — `[ROLE]`

| ID | Règle |
|---|---|
| **R-ROLE-01** | Il existe trois rôles : **résidente**, **invitée** et **administratrice**. |
| **R-ROLE-02** | Une **administratrice** est une résidente dont l'attribut « admin » est activé. Il n'existe pas de compte administratrice indépendant. |
| **R-ROLE-03** | Seules les administratrices accèdent au panneau d'administration et aux vues opérationnelles (suivi repas, présence foyer). Une non-admin qui tente d'y accéder est redirigée vers l'accueil. |
| **R-ROLE-04** | L'entrée « Administration » de la barre de navigation n'apparaît que pour les administratrices. |
| **R-ROLE-05** | Les options de repas et les événements **réservés aux admins** ne sont visibles que par les administratrices. |

---

## 2. Inscription & authentification — `[INSC]`

| ID | Règle |
|---|---|
| **R-INSC-01** | *(MàJ Lot 3.)* Le **self-signup est réservé aux invitées**. Les **résidentes sont créées par invitation** de l'intendance (voir `[CPT]`) : plus de bouton « Résidente » à l'inscription. |
| **R-INSC-02** | *(Obsolète — self-signup résidente supprimé.)* À l'activation d'une invitation, la résidente ne saisit que **nom, prénom, date de naissance, mot de passe** ; **résidence/étage/chambre** sont **imposés** par la place (voir `R-CPT-03`). |
| **R-INSC-03** | Champs obligatoires **invitée** : nom, prénom, type d'invitée, email, mot de passe. |
| **R-INSC-04** | Les deux mots de passe saisis doivent être identiques, sinon l'inscription est refusée. |
| **R-INSC-05** | Un email déjà associé à un compte ne peut pas être réutilisé pour une nouvelle inscription. |
| **R-INSC-06** | L'inscription suit un circuit en attente : les données sont stockées temporairement, un email de confirmation est envoyé, et le compte n'est créé définitivement (en résidente ou invitée) qu'**après confirmation de l'email**, à la connexion. |
| **R-INSC-07** | À la création définitive, une résidente a toujours le statut admin **désactivé** par défaut. |
| **R-INSC-08** | La connexion se fait par **email + mot de passe**. Une procédure de **réinitialisation du mot de passe** par email est disponible. |
| **R-INSC-09** | Le type d'invitée peut être « Étudiante » ou « Autre ». |

---

## 3. Présence au foyer (nuit) — `[FOYER]`

| ID | Règle |
|---|---|
| **R-FOYER-01** | Pour chaque jour, une habitante est par défaut considérée **présente au foyer**. |
| **R-FOYER-02** | Une absence se déclare sous forme de **séjour daté** : « du jour de départ au jour de retour », **bornes incluses**. Chaque jour couvert par un séjour rend l'habitante **absente** ; en dehors, elle est présente (état par défaut). *(Remplace l'ancien modèle « jour par jour ».)* |
| **R-FOYER-03** | Les séjours d'absence se gèrent depuis l'écran dédié **« Présence foyer »** : l'habitante peut **ajouter, modifier et supprimer** ses absences (liste « Mes absences »). Un **calendrier mensuel** met en évidence ses jours d'absence. |
| **R-FOYER-04** | *(En revue)* Les séjours se déclarent **par anticipation** et restent modifiables. Le verrouillage horaire `verrouillage_foyer` (par défaut **23:00**) qui s'appliquait à l'ancienne déclaration jour-par-jour **n'est plus appliqué** à l'ajout/suppression d'un séjour ; l'opportunité d'un verrouillage de dernière minute reste **à trancher**. Voir `[LOCK]`. |
| **R-FOYER-05** | La gestion des séjours d'absence **passés** n'est pas restreinte (régularisation possible) — comportement à confirmer. |
| **R-FOYER-06** | Les séjours **futurs** sont librement modifiables (pas de verrouillage anticipé). |
| **R-FOYER-07** | La vue d'ensemble admin classe les habitantes en **« au foyer »** et **« sorties »** pour une date donnée, par résidence ; le statut est **déduit des séjours d'absence** qui couvrent cette date. |
| **R-FOYER-08** | Chaque séjour d'absence peut porter une information de contact **facultative** (« je suis chez… ») destinée au staff. |
| **R-FOYER-09** | ✅ *(Réalisé au Lot 2.)* Un séjour d'absence peut marquer les repas des **jours intérieurs** en « Non » (déduits de la compta), **selon l'option « Me noter Non aux repas »** (cochée par défaut) ; les **jours-frontières** restent au libre choix. Détail : voir `R-REPAS-10` / `R-REPAS-11`. |
| **R-FOYER-10** | La **vue staff** présente les présences sur une **période** (par défaut une semaine), **jours empilés verticalement**. Pour chaque jour et chaque résidence : nombre **au foyer** (vert) et **sorties** (rouge). **Chaque nombre est cliquable** → liste des personnes derrière ce nombre. Une **unique loupe « Voir le détail »** ouvre le **tableau de détail** (voir `R-ADM-01`). Population de référence = résidentes + invitées rattachées à la résidence. |
| **R-ADM-01** | *(transversal)* Les vues admin utilisent une **structure de tableau de détail unique et cohérente** (présences, repas, plus tard chambres) : en **lignes** les habitantes classées **résidence → étage → chambre → alphabétique** (invitées en fin de bloc résidence), en **colonnes** la période (jours, ou jours × service pour les repas). Objectif : ne pas dérouter les administratrices d'un écran à l'autre. Cliquer sur un **nombre** ouvre partout la **liste** des personnes comptées derrière ce nombre. |
| **R-FOYER-11** | Une administratrice peut **marquer une absence** au nom d'une résidente ou d'une invitée à compte, sur un intervalle. **« Marquer présente »** sur une période **retire/raccourcit/scinde** les séjours d'absence couvrant ces dates (force la présence) ; **« Marquer absente »** crée un séjour. Le marquage des repas « N/O » associé est **reporté au Lot 2** (voir `R-FOYER-09`). |

---

## 4. Présence aux repas — `[REPAS]`

| ID | Règle |
|---|---|
| **R-REPAS-01** | Chaque jour comporte deux services : **déjeuner** et **dîner**. |
| **R-REPAS-02** | Pour chaque service, l'habitante choisit **une** option, ou **« Non »** (elle ne mange pas au foyer). « Non » est l'état par défaut. |
| **R-REPAS-03** | Choisir **« Non »** sur un service supprime l'inscription correspondante (aucune trace de présence n'est conservée). |
| **R-REPAS-04** | Une inscription existante que l'on change vers une autre option est **mise à jour** (pas de doublon). |
| **R-REPAS-05** | Un **commentaire** peut être ajouté à un repas, uniquement si l'habitante est inscrite (choix différent de « Non »). |
| **R-REPAS-06** | Deux modes de saisie coexistent et portent sur les mêmes données : la **saisie au jour le jour** (accueil, enregistrement immédiat à chaque choix) et la **saisie hebdomadaire** (écran « Repas de la semaine », enregistrement groupé). |
| **R-REPAS-07** | En saisie hebdomadaire, seuls les jours **non verrouillés** sont enregistrés ; les jours verrouillés sont ignorés lors de l'enregistrement. |
| **R-REPAS-08** | En saisie hebdomadaire, le nombre de **modifications en attente** est affiché et l'enregistrement n'est possible que s'il y a au moins une modification. |
| **R-REPAS-09** | La date sélectionnée est **partagée** entre l'accueil et l'écran hebdomadaire (mémorisée localement). |
| **R-REPAS-10** | **Couplage absence → repas (optionnel).** Chaque séjour d'absence porte une option **« Me noter Non aux repas »** (case **cochée par défaut**). Si activée, les repas sont automatiquement comptés **« Non »** (déjeuner et dîner) et non modifiables (« Absente — Non »), **uniquement pour les jours intérieurs**. Si **décochée**, l'absence **n'affecte pas** les repas (la résidente reste libre de s'inscrire). |
| **R-REPAS-11** | **Jours-frontières (R-ABS-BORD).** Le **premier** et le **dernier** jour d'un séjour, la résidente **choisit librement** ses repas (aucun « Non » forcé) : elle part typiquement **après le dîner** le jour de départ et revient **avant le déjeuner** le jour de retour, donc elle peut manger ces jours-là. Un séjour d'un **seul jour** reste entièrement absent (pas de jour intérieur). |

---

## 5. Options de repas — `[OPT]`

| ID | Règle |
|---|---|
| **R-OPT-01** | Les options proposées dépendent du **service** (déjeuner / dîner) et de la **date** consultée. |
| **R-OPT-02** | Par défaut, les options viennent du **catalogue par défaut** propre à chaque service (ex. repas classique, plateau, pique-nique chaud, pique-nique froid). |
| **R-OPT-03** | Une option peut être marquée **réservée aux admins** : elle n'apparaît alors que pour les administratrices. |
| **R-OPT-04** | Une option peut être **active** ou **inactive** : une option inactive n'est jamais proposée. |
| **R-OPT-05** | Une administratrice peut définir des **règles de menu spécial** qui s'appliquent sur une **plage de dates** (date de début → date de fin) ou de manière **indéfinie**. |
| **R-OPT-06** | Si une date est sans date de fin et non indéfinie, la **date de fin par défaut est égale à la date de début** (règle valable un seul jour). |
| **R-OPT-07** | Pour un jour et un service donnés : **si au moins une règle spéciale s'applique, elle remplace entièrement le catalogue par défaut** (les options par défaut ne sont plus proposées ce jour-là). Sinon, le catalogue par défaut s'applique. |
| **R-OPT-08** | En cas de **chevauchement de plusieurs règles spéciales** pour le même service, c'est la **plus récemment créée ou modifiée** qui s'applique ; les autres sont considérées comme inactives et signalées comme telles dans l'admin. |
| **R-OPT-09** | Chaque option spéciale peut être **réservée aux admins** / **publique**, et **active** / **inactive**, comme les options par défaut. |
| **R-OPT-10** | Chaque option spéciale est rattachée à une **résidence** (12 ou 36), ce qui détermine la résidence à laquelle le couvert est comptabilisé. |
| **R-OPT-11** | Lors de l'enregistrement d'une présence, on conserve la référence de l'option spéciale choisie afin de la retrouver même si le catalogue évolue ensuite. |

---

## 6. Verrouillages — `[LOCK]`

> Le verrouillage des repas est calculé par une logique centrale unique, à l'heure de **Paris**. Trois paramètres pilotent ces règles : `verrouillage_repas` (heure), `verrouillage_weekend` (oui/non), `verrouillage_foyer` (heure).

### 6.1. Verrouillage des repas

| ID | Règle |
|---|---|
| **R-LOCK-01** | Les repas d'un **jour passé** sont **entièrement verrouillés**. |
| **R-LOCK-02** | **Clôture le jour même.** Les repas du **jour en cours** sont **entièrement verrouillés** une fois passée l'**heure de verrouillage repas** (`verrouillage_repas`, réglable par l'intendance, par défaut **21:00**). |
| **R-LOCK-03** | Les repas d'un **jour futur** sont **librement modifiables** jusqu'au jour même (à l'heure de verrouillage), sous réserve du délai de commande par option (R-LOCK-05) et de la règle week-end (R-LOCK-07). |

### 6.2. Délai de commande par option

| ID | Règle |
|---|---|
| **R-LOCK-05** | Chaque option porte un **délai de commande** (`delai_commande`, en jours) qui **avance** sa clôture : `délai 0` = clôture **le jour même** (à l'heure de verrouillage) ; `délai 1` = clôture **la veille** ; `délai 2` = l'avant-veille ; etc. |
| **R-LOCK-06** | Ce délai permet aux options nécessitant plus d'anticipation (ex. **pique-nique**) d'être fermées plus tôt que les repas classiques, sans changer la règle générale (qui reste « le jour même »). |

### 6.3. Verrouillage anticipé du week-end

| ID | Règle |
|---|---|
| **R-LOCK-07** | Si le paramètre `verrouillage_weekend` est activé, les repas du **samedi et du dimanche** sont **verrouillés dès le vendredi à l'heure de verrouillage** (puis tout le samedi et le dimanche). Avant cet instant, ils restent modifiables. |
| **R-LOCK-08** | Si `verrouillage_weekend` est désactivé, le week-end suit les règles générales (R-LOCK-01 à R-LOCK-04). |

### 6.4. Verrouillage de la présence foyer

| ID | Règle |
|---|---|
| **R-LOCK-09** | La présence foyer du **jour en cours** est verrouillée après l'**heure de verrouillage foyer** (`verrouillage_foyer`, par défaut **23:00**). |
| **R-LOCK-10** | La présence foyer d'un **jour passé** est verrouillée ; celle d'un **jour futur** ne l'est pas. |
| **R-LOCK-11** | Le verrouillage foyer est **indépendant** du verrouillage des repas (heures et règles distinctes). |

---

## 7. Invités aux repas — `[INV]`

| ID | Règle |
|---|---|
| **R-INV-01** | *(MàJ 2026-07-23.)* Une résidente peut inviter une personne extérieure à **un** repas en précisant : nom, prénom, **une date**, puis le **repas** parmi les **services et options ouverts ce jour-là** (déjeuner/dîner × option). L'invité est donc rattaché à une **option précise** (plus de multi-date, plus de choix de résidence libre : le lieu découle de l'option). |
| **R-INV-02** | L'invitation peut se faire en **réutilisant un invité déjà enregistré** ou en **créant un nouvel invité**. Un même invité (nom + prénom) n'est pas dupliqué dans le répertoire. |
| **R-INV-03** | Chaque invitation est rattachée à la **résidente qui invite**. |
| **R-INV-04** | *(MàJ 2026-07-23.)* Un invité est **comptabilisé dans l'option** à laquelle il est rattaché, dans le **lieu** de cette option (résidence de l'option 12/36 ; pour une option « personne », résidence de l'inviteur). Il apparaît (a) dans le **détail d'une tuile d'option** de la vue Organisation, annoté **« invité par Prénom Nom »**, et (b) dans le **tableau « Voir le détail »** sous forme d'un **badge compact « +👤 Prénom »** dans la **cellule de l'inviteur** au jour/service concerné (jamais de ligne dédiée). Côté **comptabilité**, son repas est **imputé à l'inviteur** (pas de ligne séparée). |
| **R-INV-05** | L'inviteur peut **modifier** son invitation (invité, date, repas/option) ou la **supprimer** depuis la rubrique « Mes invités », accessible aussi bien sur **« Repas de la semaine »** que sur l'**Accueil** (seule action non-lecture-seule de l'Accueil) ; tout se met à jour en conséquence. La rubrique affiche pour chaque invité le **service et l'option** choisis. |
| **R-INV-06** | Une ancienne invitation sans option rattachée est encore **comptée en comptabilité** (à l'inviteur) mais **n'apparaît dans aucune tuile d'option** de la vue Organisation. |

---

## 8. Événements & calendrier — `[EVT]`

| ID | Règle |
|---|---|
| **R-EVT-01** | Seules les administratrices créent, modifient et suppriment des événements. |
| **R-EVT-02** | Un événement requiert au minimum : un **type**, un **titre** et **au moins une date**. Le **lieu (résidence) est facultatif** (voir R-EVT-08). |
| **R-EVT-03** | Un événement peut porter sur **plusieurs dates** (multi-occurrences). |
| **R-EVT-04** | Le **type** détermine la **couleur** d'affichage : anniversaire, formation, intendance, autre. |
| **R-EVT-05** | La **visibilité** d'un événement se cible par **résidence** (entière) et/ou **étage** (précis). À la sélection, l'intendance voit la **liste des résidentes concernées** et peut **décocher** certaines pour les **exclure nommément**. Le ciblage est **dynamique** : une résidente qui rejoint la résidence/étage plus tard est incluse automatiquement (sauf si exclue). Une habitante voit l'événement si elle est dans le périmètre **et** non exclue. *(L'ancien niveau « chambre » reste pris en charge pour les événements existants.)* |
| **R-EVT-06** | Un événement peut être rendu **visible par les invitées**. Par défaut, les invitées ne voient que les événements explicitement ouverts. |
| **R-EVT-07** | Un événement peut être **réservé au staff** : aucun, staff de la Résidence 12 uniquement, staff de la Résidence 36 uniquement, ou tout le staff. Un événement réservé au staff n'est visible que des administratrices concernées. |
| **R-EVT-08** | Sur l'accueil, un événement **avec lieu** n'est affiché (carte Événements de la résidence) que s'il concerne la **résidence sélectionnée** et que l'habitante remplit les critères de visibilité. Un événement **sans lieu** (ou lieu hors 12/36) s'affiche en **rappel « Aujourd'hui »** en haut de l'accueil le jour J. |
| **R-EVT-09** | Un événement peut demander une **confirmation de participation** ; l'habitante confirme via un **bouton à bascule** (« Je participe ✓ » / « Je participe ? »), et les administratrices peuvent consulter les confirmations. |
| **R-EVT-10** | Un événement peut définir un **rappel** : un nombre de jours avant l'événement à partir duquel un rappel s'affiche sur l'accueil, avec le décompte des jours restants. |
| **R-EVT-11** | La suppression d'un événement multi-dates peut se faire **sur une seule occurrence** (une date) ou **sur l'ensemble** de l'événement. |

---

## 9. Comptabilité & suivi des repas — `[COMPTA]`

| ID | Règle |
|---|---|
| **R-COMPTA-01** | Le suivi se fait sur une **période choisie** (par défaut une semaine à partir de la date sélectionnée). |
| **R-COMPTA-02** | Le planning hebdomadaire compte, par jour et par résidence : repas du **midi**, du **soir**, **pique-niques**, **plateaux** et **options spéciales** (détaillées). |
| **R-COMPTA-03** | Un **pique-nique est comptabilisé sur le jour de sa préparation, c'est-à-dire la veille du jour où il est consommé** (colonne « P.N. du lendemain »). |
| **R-COMPTA-04** | La résidence à laquelle un repas est rattaché est déterminée ainsi : option explicitement liée à une résidence (12 / 36) → cette résidence ; **plateau** → résidence de la personne ; option spéciale → résidence définie dans la règle. |
| **R-COMPTA-05** | Le **total par jour** d'une résidence additionne déjeuners, dîners, plateaux, pique-niques et options spéciales. |
| **R-COMPTA-06** | La **comptabilité par personne** compte le nombre de déjeuners et de dîners auxquels la personne est inscrite (les « Non » ne comptent pas), **invités inclus** pour la personne qui les a invités. |
| **R-COMPTA-07** | La comptabilité fournit un **total par résidence** (déjeuners, dîners, total) et un **grand total** toutes résidences. |
| **R-COMPTA-08** | *(MàJ 2026-07-23.)* La vue détaillée de **comptabilité** liste, pour une résidence et une date, **personne par personne** le repas choisi et le commentaire éventuel ; les **invités n'y figurent pas** en ligne séparée (ils sont imputés à l'inviteur, cf. `R-INV-04`). Le détail avec invités annotés « invité par … » relève de la vue **Organisation** (`R-INV-04`), pas de la comptabilité. |

---

## 10. Résidences — `[RES]`

| ID | Règle |
|---|---|
| **R-RES-01** | Le foyer compte deux résidences actives : **Résidence 12** et **Résidence 36**. |
| **R-RES-02** | *(MàJ Lot 3.)* **Corail** désigne désormais les **prestataires** (cuisine, ménage, intendance) qui travaillent au foyer sans y dormir : gérées via des **postes** (voir `[CPT]`), pas des chambres. |
| **R-RES-03** | Chaque résidente est rattachée à une résidence, un étage et une chambre, qui servent au ciblage des événements et à la comptabilité. |

---

## 11. Gestion des comptes & chambres — `[CPT]`

| ID | Règle |
|---|---|
| **R-CPT-01** | Un compte résidente est **rattaché à exactement une place** (chambre ou poste) ; une place active porte **au plus un compte actif** (contrainte base de données). |
| **R-CPT-02** | La création d'un compte résidente/corail se fait **uniquement par invitation** d'une administratrice (plus de self-signup pour ces rôles ; les **invitées** gardent l'inscription libre). |
| **R-CPT-03** | À l'acceptation de l'invitation, **résidence / étage / chambre (ou poste)** sont **imposés** par l'invitation et non modifiables par l'étudiante. |
| **R-CPT-04** | Le départ **archive** le compte (`statut = archivee`) : plus de connexion, retiré des vues actives, **historique conservé** pour la comptabilité. La place se libère. |
| **R-CPT-05** | Une place est **occupée** si et seulement si un compte **actif** y est rattaché ; sinon **libre** et réattribuable. |
| **R-CPT-06** | Les **invitées** conservent le self-signup et **n'occupent aucune place**. |
| **R-CPT-07** | **Corail** : places de type **poste** (sans étage/chambre), **sans plafond**, **libellé libre** ; même cycle de vie que les chambres. |
| **R-CPT-08** | Le **super-admin** est un **compte technique à accès total** : **sans place**, **non compté**, **exclu** des listes résidentes (présences, repas, compta, sélection), **non archivable/rétrogradable** par les autres. |
| **R-CPT-09** | Une administratrice peut **déplacer** une résidente **active** vers une place libre (déménagement interne). |
| **R-CPT-10** | Une invitation a un état (**envoyée / acceptée / expirée / annulée**), peut être **relancée** et expire (≈ 14 jours). Le lien d'activation est vérifié **côté serveur** (`/auth/confirm`). |

---

## Décisions en attente de validation client

Liste vivante des points à trancher avec le client. À mettre à jour (déplacer en règle ferme une fois validé).

| Réf. | Question ouverte | Statut |
|---|---|---|
| `R-FOYER-04` | **Verrouillage horaire foyer** : faut-il rétablir un verrou de dernière minute (impossible de déclarer/annuler une absence pour la nuit même après une heure donnée, pour fiabiliser le décompte du soir) ? Le modèle « séjours » l'a abandonné. | ⏳ À confirmer avec le client (Loan, réunion à venir) |
| `R-FOYER-05` | **Absences sur dates passées** : autorise-t-on la création/modification d'un séjour dans le passé (régularisation) ou faut-il le bloquer ? | ⏳ À confirmer avec le client |

---

## Annexe — Paramètres administrables

| Paramètre | Rôle | Valeur par défaut |
|---|---|---|
| `verrouillage_repas` | Heure après laquelle les repas du jour ne sont plus modifiables | 21:00 |
| `verrouillage_foyer` | Heure après laquelle la présence foyer du jour n'est plus modifiable | 23:00 |
| `verrouillage_weekend` | Active le verrouillage anticipé des repas du week-end dès le vendredi | (selon réglage) |

---

## Journal des modifications

| Date | Version | Modification |
|---|---|---|
| 2026-07-23 | 1.13 | **[INV]** Retour client sur les invités repas : l'invitation vise **une date + un repas (service × option ouverte)** au lieu d'un multi-date, l'invité est **rattaché à une option** et **comptabilisé dedans** dans la vue Organisation (annoté « invité par … » ; plus de tuile « Invités » séparée) ; en **comptabilité**, son repas est imputé à l'inviteur (jamais de ligne séparée). Ajout de la **modification** d'une invitation. L'**accueil** et **« Mes invités »** affichent le **service + l'option** de chaque invité, et permettent tous deux de **modifier / supprimer** une invitation (seule action non-lecture-seule de l'accueil). Le tableau **« Voir le détail »** montre l'invité en **badge compact « +👤 Prénom »** dans la cellule de l'inviteur. MàJ `R-INV-01/04/05`, ajout `R-INV-06`, MàJ `R-COMPTA-08`. |
| 2026-07-20 | 1.12 | **[FOYER][EVT]** Retours client : option **« Me noter Non aux repas »** sur une absence (cochée par défaut ; le couplage absence→repas devient optionnel) — MàJ `R-REPAS-10`, `R-FOYER-09`. Événements : **lieu facultatif** ; un événement **sans lieu** s'affiche en **rappel « Aujourd'hui »** sur l'accueil — MàJ `R-EVT-02/08`. Confirmation de participation via **bouton à bascule** lisible — MàJ `R-EVT-09`. |
| 2026-07-17 | 1.11 | **[CPT]** Lot 3 — gestion des comptes par l'intendance : **chambre/poste = une place** (table `places`), **invitation par email** des résidentes (self-signup résidente supprimé, invitées conservées), **activation** (`/auth/confirm` + `/activation`), **archivage** au départ (historique conservé), **déplacement** interne, **super-admin** hors modèle. Écran ⚙️ Administration → **Chambres**. Ajout section `[CPT]` (`R-CPT-01..10`), MàJ `R-INSC-01/02`, `R-RES-02`. |
| 2026-06-06 | 1.0 | Création du document : recensement des règles existantes. |
| 2026-06-29 | 1.1 | **[FOYER]** Refonte de la présence foyer (Lot 1, Étape 1) : passage du modèle « jour par jour » à des **séjours d'absence datés** (écran dédié, calendrier mensuel, liste éditable, contact facultatif). MàJ `R-FOYER-02/03/07`, `R-FOYER-04/05` mises en revue (verrouillage horaire non appliqué), ajout `R-FOYER-08` (contact) et `R-FOYER-09` (couplage repas reporté au Lot 2). |
| 2026-06-29 | 1.2 | **[FOYER]** Refonte de la **vue staff** `/admin/foyer` (croquis client) : vue par **période** (cartes/jour, compteurs au foyer/sorties par résidence, détail au clic) + **marquage admin** d'absence/présence sur intervalle. Ajout `R-FOYER-10` et `R-FOYER-11`. Marquage repas N/O toujours reporté au Lot 2. |
| 2026-07-10 | 1.10 | **[LOCK]** Verrouillage repas conservé **« le jour même »** (clôture à `verrouillage_repas`, heure réglable par l'intendance) — un blocage plus anticipé se règle **par option** via le délai de commande (`delai_commande` : 0 = jour même, 1 = veille, etc.). MàJ `R-LOCK-02/03/05/06`. *(Annule l'essai « clôture la veille » de la 1.9.)* |
| 2026-07-06 | 1.9 | **[REPAS]** **Couplage absence → repas réalisé** : jours intérieurs auto « Non », **jours-frontières au libre choix** (part après le dîner / revient avant le déjeuner) — ajout `R-REPAS-10/11` (`R-ABS-BORD`), MàJ `R-FOYER-09`. Compta triée par **nom puis prénom**. Légende du tableau repas : **lune orange** pour « absente » (raccord avec les cellules). *(La 1.9 incluait aussi un passage du verrouillage « à la veille », revu en 1.10.)* |
| 2026-07-05 | 1.8 | **[ADM]** Nouvel espace **« Administratif »** (accès en haut à droite, consultable par toutes) : rubriques **libres** (ajout/renommage/réordonnancement) éditables par les admins — texte **mis en forme** (éditeur tiptap, stocké en JSON) et rubriques **Contacts structurés** (nom/rôle/tél/email). Table `admin_sections`. Contenu à saisir dans l'appli. |
| 2026-07-05 | 1.7 | **[EVT]** Visibilité des événements par **noms** : après avoir coché résidence/étage, l'intendance voit la **liste des résidentes** et peut **cocher/décocher** individuellement (exclusions nommées). Ciblage **dynamique** (futures arrivantes incluses auto). Niveau « chambre » retiré de l'UI (conservé pour l'existant). MàJ `R-EVT-05`. Rétrocompatible. |
| 2026-07-04 | 1.6 | **[FOYER][REPAS]** Retours client sur les vues admin : **jours empilés verticalement**, **nombres cliquables** → liste des personnes derrière chaque nombre, **une seule loupe** → **tableau de détail** (habitantes × jours). Introduction d'une **structure de tableau unique et réutilisable** (`R-ADM-01`) : classement résidence → étage → chambre → alphabétique (invitées en fin), appliquée aux **présences** ET aux **repas** (colonnes jours × service). MàJ `R-FOYER-10`, ajout `R-ADM-01`. |
| 2026-07-04 | 1.5 | **[home]** Retours client sur l'accueil : mise en page en 3 cartes (Présence / Événements / Repas), **intercalaires résidence colorés** (12 bleu clair, 36 rose), **rappels compacts**, navigation par **chevrons** (swipe retiré) + **icône calendrier** vers `/calendrier`. **Navigation** : écran *Profil* retiré de la barre du bas → **accès Profil en haut à droite** (près de la déconnexion) sur les écrans principaux ; icône de l'onglet *Présence foyer* passée du lit au **bonhomme**. Réorganisation UI, sans changement de règle. |
| 2026-06-29 | 1.4 | **[home]** Lot 1 Étape 3 — l'**accueil devient une page de consultation** : carte « Ma journée » en lecture seule (présence foyer du soir + repas du jour), logo réduit, mise en page compacte. Les actions repas/foyer vivent dans leurs écrans dédiés. Réorganisation UI, sans changement de règle. |
| 2026-06-29 | 1.3 | **[REPAS]** Lot 1 Étape 2 — l'onglet **« Repas de la semaine » devient le hub repas** : vue passée à **8 jours (lundi→lundi inclus)**, intégration du bouton **« Inviter quelqu'un »**, **« Espace intendance »** replié (accès inscriptions/compta + paramétrage des repas). Le **paramétrage des repas** est sorti de `/admin/utilisatrices` vers `/admin/parametrage-repas` (source unique). Réorganisation de navigation, sans changement de règle métier. Correction d'un clignotement au chargement de l'écran. |
