# Les Écoles — Note de spécification (règles métier)

> **Document vivant** — toute nouvelle règle, modification ou suppression de règle doit être reportée ici.
> Dernière mise à jour : 4 août 2026 · Version 1.27

## Comment lire ce document

Chaque règle porte un **identifiant stable** de la forme `R-THEME-NN` (ex. `R-REPAS-03`).
Cet identifiant ne change jamais : on peut donc s'y référer dans les discussions, les évolutions et les tickets. Quand une règle est modifiée, on garde son identifiant et on met à jour son contenu (en notant la date).

**Thèmes :**
[ROLE] Rôles & accès · [NIV] Niveaux de droits · [INSC] Inscription & authentification · [FOYER] Présence au foyer ·
[REPAS] Présence aux repas · [OPT] Options de repas · [LOCK] Verrouillages ·
[INV] Invités aux repas · [EVT] Événements & calendrier · [COMPTA] Comptabilité & suivi ·
[RES] Résidences

---

## 1. Rôles & accès — `[ROLE]`

| ID | Règle |
|---|---|
| **R-ROLE-01** | Il existe trois rôles : **résidente**, **invitée** et **administratrice**. |
| **R-ROLE-02** | *(MàJ 2026-07-25.)* Une **administratrice** est une résidente ayant **au moins la lecture sur une section** (voir `[NIV]`). Il n'existe pas de compte administratrice indépendant. L'attribut « admin » (`is_admin`) est conservé comme **miroir** de « a un accès admin quelconque » (compatibilité). |
| **R-ROLE-03** | *(MàJ 2026-07-25.)* L'accès à chaque écran d'intendance dépend de la **section correspondante** (voir `R-NIV-02`) : une non-habilitée est redirigée vers l'accueil (ou ne voit pas l'entrée). |
| **R-ROLE-04** | L'entrée ⚙️ « Administration » de la barre de navigation n'apparaît que pour la section **Comptes** (lecture minimum). Les autres écrans admin s'atteignent depuis leur onglet (repas, présence foyer, calendrier, administratif). |
| **R-ROLE-05** | *(MàJ 2026-08-01.)* Les options de repas **réservées aux admins** ne sont visibles que par les administratrices. Les **événements réservés au staff** suivent désormais la **section Événements** (≥ Lecture), et non plus le simple fait d'être admin — voir `R-EVT-07` et `R-NIV-10`. |

### Niveaux de droits — `[NIV]`

| ID | Règle |
|---|---|
| **R-NIV-01** | *(MàJ 2026-08-03.)* Les droits sont attribués **par section** de l'appli : **Repas · Événements · Absences · Comptes · Infos pratiques**. Sur chaque section, une résidente a un niveau **0 Aucun · 1 Utilisateur · 2 Lecture · 3 Édition** (voir `R-NIV-11`). S'ajoute un rôle global **Super-admin** (tous droits partout **+** seul à attribuer les droits + gérer/supprimer les comptes). Les **invitées** sont hors hiérarchie (aucun droit admin). |
| **R-NIV-02** | *(MàJ 2026-08-04.)* Les niveaux sont **par section** (plus de niveau global unique). Correspondance des sections → écrans : **Repas** (visu repas, paramétrage/options, verrouillage repas, édition des inscriptions) · **Événements** (calendrier admin) · **Absences** (vue Présence foyer + marquage) · **Comptes** (comptes, chambres/places, invitations, paramètres généraux) · **Infos pratiques** (rubriques Administratif). Le bouton ⚙️ Administration correspond à la section **Comptes**. **Précision :** la section **Repas** donne accès aux **périodes d'absence** des habitantes — non pour les consulter ou les modifier, mais parce qu'elles sont une **donnée d'entrée du calcul des repas** (déduction des jours intérieurs, `R-FOYER-09` / `R-REPAS-10`). Sans cela, une administratrice n'ayant que la section Repas verrait une comptabilité **sans aucune déduction d'absence**, donc surévaluée. Cet accès se limite aux dates du séjour ; la **vue Présence foyer** et le **marquage** des absences restent réservés à la section **Absences**. |
| **R-NIV-03** | *(MàJ 2026-07-25.)* Application des droits : **côté serveur** pour les actions passant par une API (Repas, Absences, Comptes, Infos) — lecture exige niveau ≥ 2 de la section, écriture niveau ≥ 3. Pour les écritures **directes** (Événements, paramètres généraux, règles de repas), le contrôle est **UI + RLS** (masquage selon la section) ; leur passage en API sécurisée est une évolution possible. |
| **R-NIV-04** | **Seul le super-admin** peut modifier les droits des autres, via le bouton **« Droits »** de l'écran Utilisatrices. Il **ne peut pas** changer ses propres droits (anti-blocage). |
| **R-NIV-12** | *(Nouveau 2026-08-04.)* **Comptes — Lecture = consultation stricte.** Au niveau **Lecture** de la section Comptes, l'écran Utilisatrices montre qui occupe quelle chambre et avec quels droits, mais **aucune action n'y est proposée** : ni **Inviter**, ni **Relancer** / **Annuler** une invitation, ni **Déplacer** une résidente, ni **Libérer / désactiver** un compte, ni le bloc **« Gérer les chambres & étages »**. Ces actions n'apparaissent qu'au niveau **Édition** ; le bouton **« Droits »** reste, lui, réservé au **super-admin** (`R-NIV-04`) et la section de maintenance « Sans chambre attribuée » au **compte technique** (`R-NIV-05`). Les serveurs refusaient déjà ces actions à un niveau Lecture (`R-NIV-03`) : la règle aligne l'affichage sur ce que le niveau autorise réellement. |
| **R-NIV-05** | Le **compte technique** (`is_technique`) est **caché** : jamais listé, non archivable/supprimable/modifiable ; accès total à vocation de maintenance, hors hiérarchie. |
| **R-NIV-06** | *(MàJ 2026-07-25.)* Migration depuis l'ancien niveau global : le niveau est **recopié sur les 5 sections** (les admins gardent leurs droits partout) ; les anciens **niveau 4** deviennent **super-admin**. |
| **R-NIV-07** | *(MàJ 2026-08-04.)* **Suppression définitive d'un compte.** Elle est ouverte à l'**édition Comptes** (niveau ≥ 3), mais **uniquement sur un compte désactivé** : un compte encore actif doit d'abord être **libéré / désactivé**, ce qui impose un passage en deux temps avant l'irréversible. Le **super-admin** (et le compte technique) peut supprimer n'importe quel compte ; lui seul peut supprimer un **autre super-admin**. Le **compte technique** n'est jamais supprimable, et personne ne peut supprimer le sien. ⚠️ **Conséquence comptable** : contrairement à la désactivation — qui conserve l'historique (`R-CPT-04`) — la suppression **retire les repas passés de la comptabilité**, la personne disparaissant des listes. À n'utiliser qu'une fois la période **facturée**. |
| **R-NIV-08** | *(2026-07-24.)* Depuis la vue **Organisation** des repas, au clic sur une option, un admin **Repas ≥ Édition** peut **éditer les inscriptions** de cette option : **changer l'option** d'un inscrit (parmi les options ouvertes ce jour/service, ou « Non »), **ajouter une résidente** (déplacée si elle était inscrite ailleurs pour ce service), et **ajouter / retirer un invité** (invité du **carnet** ou **nouveau**, en précisant la résidente qui invite, pour l'imputation compta). L'admin **passe outre le verrouillage**. Les changements se répercutent sur la **vue détaillée** et la **comptabilité** (mêmes données). Un niveau 2 garde la popup en **lecture seule**. |
| **R-NIV-09** | *(Nouveau 2026-07-24 ; révisé.)* **Traçabilité** des corrections d'intendance via un **journal d'audit append-only** (`meal_audit_log`) : chaque modification d'inscription par un admin (changer l'option, retirer, ajouter/retirer un invité) y enregistre **qui** (`actor_user_id` + nom snapshot), **quand** (`created_at`), **quoi** (action, personne/invité concerné, jour/service) et **l'option avant → après** (libellés snapshot). Le journal **conserve l'historique complet**, y compris après une mise à « Non » (suppression de ligne). Il n'enregistre **pas** les choix **self-service** des résidentes. Table **sensible** (RLS active, sans policy → accès service role uniquement). |
| **R-NIV-10** | *(Nouveau 2026-08-01 ; MàJ 2026-08-03.)* **Le niveau « Utilisateur » ne retire jamais la vue de résidente.** Sur chaque section, le niveau **1 Utilisateur** (anciennement nommé « Aucun ») laisse l'habitante utiliser l'appli normalement (voir les événements et les rappels, s'inscrire à ses repas, déclarer ses absences, lire les rubriques Administratif) ; il ne retire que les fonctions d'**intendance**. Pour la section **Événements** : **1 Utilisateur** = voir les événements et les rappels, confirmer sa participation · **2 Lecture** = voir en plus **qui s'est inscrit** et les événements **réservés au staff** · **3 Édition** = créer / modifier / supprimer. Le panneau « Droits » affiche cette explication sous chaque section. |
| **R-NIV-11** | *(Nouveau 2026-08-03.)* **Niveau 0 « Aucun » — la section n'existe pas.** Au niveau 0, la section est **entièrement retirée** de l'appli pour cette personne : **onglet masqué** dans la barre du bas, **page inaccessible** (une URL saisie à la main redirige vers l'accueil), **carte correspondante retirée de l'accueil** (Présence, Événements + rappels, Repas du jour), et **API refusée** côté serveur (403) — le masquage n'est pas seulement visuel. La personne **sort également des listes d'intendance** de cette section (vues repas & comptabilité pour `repas`, vues de présence pour `absences`) afin de ne pas y laisser une ligne « Sans réponse » permanente ; en revanche, ses **inscriptions ou absences déjà enregistrées restent visibles et comptées** sur les périodes concernées — modifier un droit ne réécrit jamais l'historique. Correspondance onglet → section : Calendrier → Événements · Repas de la semaine → Repas · Présence foyer → Absences · Administratif → Infos pratiques ; l'**accueil** n'est rattaché à aucune section et reste toujours accessible. La section **Comptes** n'a pas de page côté résidente : le niveau 0 **n'y est pas proposé** (contrainte en base). Techniquement, le niveau 0 a été **ajouté sans renuméroter** les niveaux existants — aucun droit déjà attribué n'a changé de sens. |

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
| **R-FOYER-08** | *(Supprimée 2026-08-01.)* Le champ de contact facultatif (« je suis chez… ») est **retiré** des deux fenêtres d'absence (habitante et intendance) : il n'était **jamais réaffiché** côté staff, donc sans usage réel. La colonne reste en base pour ne pas perdre les valeurs déjà saisies, mais elle n'est **plus ni saisie ni affichée**. |
| **R-FOYER-09** | ✅ *(Réalisé au Lot 2.)* Un séjour d'absence peut marquer les repas des **jours intérieurs** en « Non » (déduits de la compta), **selon l'option « Me noter Non aux repas »** (cochée par défaut) ; les **jours-frontières** restent au libre choix. Détail : voir `R-REPAS-10` / `R-REPAS-11`. |
| **R-FOYER-10** | La **vue staff** présente les présences sur une **période** (par défaut une semaine), **jours empilés verticalement**. Pour chaque jour et chaque résidence : nombre **au foyer** (vert) et **sorties** (rouge). **Chaque nombre est cliquable** → liste des personnes derrière ce nombre. Une **unique loupe « Voir le détail »** ouvre le **tableau de détail** (voir `R-ADM-01`). Population de référence = résidentes + invitées rattachées à la résidence. |
| **R-ADM-01** | *(transversal)* Les vues admin utilisent une **structure de tableau de détail unique et cohérente** (présences, repas, plus tard chambres) : en **lignes** les habitantes classées **résidence → étage → chambre → alphabétique** (invitées en fin de bloc résidence), en **colonnes** la période (jours, ou jours × service pour les repas). Objectif : ne pas dérouter les administratrices d'un écran à l'autre. Cliquer sur un **nombre** ouvre partout la **liste** des personnes comptées derrière ce nombre. |
| **R-FOYER-11** | *(MàJ 2026-08-01.)* Une administratrice peut **marquer une absence** au nom d'une résidente ou d'une invitée à compte, sur un intervalle. **« Marquer présente »** sur une période **retire/raccourcit/scinde** les séjours d'absence couvrant ces dates (force la présence) ; **« Marquer absente »** crée un séjour. Le formulaire d'absence propose la case **« Noter Non aux repas dans l'intervalle »** (**cochée par défaut**), identique à celle dont dispose l'habitante : elle pilote le couplage absence → repas décrit en `R-REPAS-10` (déduction à l'affichage et en compta, **sans modifier les inscriptions enregistrées** — raccourcir ou supprimer le séjour restitue les choix d'origine). Lorsqu'un séjour est **scindé** par un « Marquer présente », la partie recréée conserve ce réglage. |
| **R-FOYER-12** | *(Nouveau 2026-07-27.)* Dans la vue staff, un admin **Absences ≥ Édition** peut **éditer les présences depuis la liste** ouverte au clic sur un compteur : basculer chaque personne **Au foyer ↔ Sortie** pour ce jour (crée/retire un séjour d'un jour) et **ajouter** une personne — même principe que l'édition des inscriptions repas (`R-NIV-08`). Le **tableau de détail** est **exportable en CSV**. L'**heure limite de modification** (`verrouillage_foyer`) se règle en haut de cette vue (plus d'onglet Paramètres). |

---

## 4. Présence aux repas — `[REPAS]`

| ID | Règle |
|---|---|
| **R-REPAS-01** | Chaque jour comporte deux services : **déjeuner** et **dîner**. |
| **R-REPAS-02** | *(MàJ 2026-08-01.)* Pour chaque service, l'habitante choisit **une** option ou **« Non »** (elle ne mange pas au foyer). L'état par défaut n'est plus « Non » mais **« À renseigner »** : tant qu'elle n'a pas répondu, aucun choix n'est enregistré. Voir `R-REPAS-12`. |
| **R-REPAS-03** | *(MàJ 2026-08-01.)* Choisir **« Non »** enregistre une réponse explicite « ne mange pas » (et n'inscrit à aucune option). Revenir à **« À renseigner »** efface la réponse. Dans les deux cas la personne ne compte aucun repas. |
| **R-REPAS-04** | Une inscription existante que l'on change vers une autre option est **mise à jour** (pas de doublon). |
| **R-REPAS-05** | Un **commentaire** peut être ajouté à un repas, uniquement si l'habitante est inscrite (choix différent de « Non »). |
| **R-REPAS-06** | Deux modes de saisie coexistent et portent sur les mêmes données : la **saisie au jour le jour** (accueil, enregistrement immédiat à chaque choix) et la **saisie hebdomadaire** (écran « Repas de la semaine », enregistrement groupé). |
| **R-REPAS-07** | En saisie hebdomadaire, seuls les jours **non verrouillés** sont enregistrés ; les jours verrouillés sont ignorés lors de l'enregistrement. |
| **R-REPAS-08** | En saisie hebdomadaire, le nombre de **modifications en attente** est affiché et l'enregistrement n'est possible que s'il y a au moins une modification. |
| **R-REPAS-09** | La date sélectionnée est **partagée** entre l'accueil et l'écran hebdomadaire (mémorisée localement). |
| **R-REPAS-10** | **Couplage absence → repas (optionnel).** Chaque séjour d'absence porte une option **« Me noter Non aux repas »** (case **cochée par défaut**). Si activée, les repas sont automatiquement comptés **« Non »** (déjeuner et dîner) et non modifiables (« Absente — Non »), **uniquement pour les jours intérieurs**. Si **décochée**, l'absence **n'affecte pas** les repas (la résidente reste libre de s'inscrire). |
| **R-REPAS-11** | **Jours-frontières (R-ABS-BORD).** Le **premier** et le **dernier** jour d'un séjour, la résidente **choisit librement** ses repas (aucun « Non » forcé) : elle part typiquement **après le dîner** le jour de départ et revient **avant le déjeuner** le jour de retour, donc elle peut manger ces jours-là. Un séjour d'un **seul jour** reste entièrement absent (pas de jour intérieur). |
| **R-REPAS-12** | *(Nouveau 2026-08-01.)* **Trois états d'inscription.** Un service peut être dans l'un de **trois** états, distingués partout (écrans, détail d'intendance, exports) : **une option choisie** · **« Non »** (elle a répondu qu'elle ne mange pas) · **« Sans réponse »** (elle n'a rien renseigné). Seul le premier compte un repas ; « Non » et « Sans réponse » n'en comptent aucun. **Reprise de l'historique :** les repas **antérieurs au 03/08/2026** (date de mise en service) restent lus comme avant, c'est-à-dire **« Non »** en l'absence de réponse enregistrée — l'état « Sans réponse » ne s'applique qu'à partir de cette date. |
| **R-REPAS-13** | *(Nouveau 2026-08-01 ; MàJ 2026-08-03.)* **Relance visuelle.** Sur l'écran « Repas de la semaine », un jour comportant au moins un service **ouvert, non verrouillé et sans réponse** porte un **badge orange « À renseigner »** dans son en-tête. Le sélecteur lui-même n'est **pas** coloré et ne porte **aucune mention** complémentaire (signal volontairement discret). Une fois le jour **verrouillé** — ou l'habitante **absente** — le badge disparaît. Une habitante peut à tout moment **revenir à « À renseigner »** tant que le jour n'est pas verrouillé. |

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
| **R-EVT-06** | *(MàJ 2026-07-27.)* La visibilité d'un événement se gère **uniquement par ciblage** résidence / étage / personnes (Corail et tout compte actif inclus, listés depuis les comptes gérés). La case « visible par les invitées » est **supprimée** : les comptes **invitées** (sans résidence) ne voient plus les événements. |
| **R-EVT-07** | *(MàJ 2026-08-01.)* Un événement peut être **réservé au staff** : aucun, staff de la Résidence 12 uniquement, staff de la Résidence 36 uniquement, ou tout le staff. Il n'est visible que des personnes ayant **Événements ≥ Lecture** (et de la résidence concernée le cas échéant) — auparavant, toute personne admin d'une **section quelconque** le voyait. |
| **R-EVT-12** | *(2026-07-27.)* Les **résidences et étages** proposés au ciblage d'un événement sont **dérivés du référentiel réel des places** (table `places`, places actives), et non d'une liste statique séparée. Les résidences **12 / 36** exposent leurs **étages** ; **Corail** apparaît comme une **section sans étage** (postes). Conséquence : toute **place/étage ajouté** via « Gérer les chambres & étages » (voir `[CPT]`) apparaît **automatiquement** dans le ciblage, garantissant la cohérence entre la structure des résidences et la visibilité. |
| **R-EVT-08** | Sur l'accueil, un événement **avec lieu** n'est affiché (carte Événements de la résidence) que s'il concerne la **résidence sélectionnée** et que l'habitante remplit les critères de visibilité. Un événement **sans lieu** (ou lieu hors 12/36) s'affiche en **rappel « Aujourd'hui »** en haut de l'accueil le jour J. |
| **R-EVT-09** | *(MàJ 2026-08-01.)* Un événement peut demander une **confirmation de participation** ; **toute** habitante qui voit l'événement confirme via un **bouton à bascule** (« Je participe ✓ » / « Je participe ? »). La **liste des inscrits** (« Voir les inscrits ») n'est accessible qu'à partir de **Événements ≥ Lecture** — auparavant, toute personne admin d'une **section quelconque** y avait accès. |
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
| **R-COMPTA-06** | *(MàJ 2026-08-01.)* La **comptabilité par personne** compte le nombre de déjeuners et de dîners auxquels la personne est **inscrite à une option**, **invités inclus** pour la personne qui les a invités. Ni **« Non »** ni **« Sans réponse »** (`R-REPAS-12`) ne comptent de repas : l'absence de réponse n'entraîne **aucune facturation par défaut**. |
| **R-COMPTA-07** | La comptabilité fournit un **total par résidence** (déjeuners, dîners, total) et un **grand total** toutes résidences. |
| **R-COMPTA-08** | *(MàJ 2026-08-01.)* La vue détaillée de **comptabilité** liste, pour une résidence et une date, **personne par personne** le repas choisi et le commentaire éventuel ; les **invités n'y figurent pas** en ligne séparée (ils sont imputés à l'inviteur, cf. `R-INV-04`). Chaque cellule distingue **quatre** états : l'**option choisie** (vert), **« Non »** (rouge), **« — »** = sans réponse (gris, `R-REPAS-12`) et **🌙** = absente déduite (orange). L'**export CSV** reprend ces libellés (« Non », « Sans réponse », « Absente »). Le détail avec invités annotés « invité par … » relève de la vue **Organisation** (`R-INV-04`), pas de la comptabilité. |

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
| **R-CPT-04** | Le départ **désactive** le compte (`statut = archivee`, libellé UI « désactivé ») : plus de connexion, retiré des vues actives, **historique conservé** pour la comptabilité. La place se libère. |
| **R-CPT-11** | *(2026-07-27.)* **Écran unifié sans onglets** : l'écran ⚙️ Administration affiche **directement** la gestion des **Utilisatrices** (plus d'onglets « Chambres » ni « Invités »). Les personnes **et** les chambres sont dans une **liste unique** classée **résidence → étage → chambre**, chaque ligne affichant l'occupante (ou Libre / Invitation) **et le résumé de ses droits**. La gestion de la **structure physique** (créer/modifier/désactiver/supprimer chambres & étages) est reléguée à un **panneau repliable** distinct ; les **comptes désactivés** sont listés dans un autre panneau repliable. |
| **R-CPT-13** | *(2026-07-27.)* L'encart **« Sans chambre attribuée »** (comptes résidente actifs rattachés à aucune place active — situation anormale) est un **outil de maintenance** visible du **seul compte technique** (`is_technique`), non exposé aux administratrices. Il offre par ligne : **attribuer une chambre** libre, régler les **droits**, ou **supprimer** le compte. |
| **R-CPT-12** | *(2026-07-27.)* À la **réassignation** d'un compte désactivé qui possédait des **droits admin**, l'administratrice choisit explicitement de **repartir de zéro** (droits réinitialisés à simple résidente, option par défaut) ou de **garder ses anciens droits**. Sans ce choix (compte sans droits particuliers), la réassignation n'altère pas les droits. Objectif : éviter la **restauration silencieuse** de droits admin. |
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
| 2026-08-04 | 1.27 | **[NIV][CPT]** Demande client : la **suppression définitive d'un compte** n'est plus réservée au super-admin. Une administratrice ayant l'**édition Comptes** peut désormais supprimer un compte, **à condition qu'il soit désactivé** — la suppression se fait donc en deux temps (« Libérer / désactiver », puis 🗑 dans la liste **Comptes désactivés**). Le super-admin garde la suppression de n'importe quel compte, et reste seul à pouvoir supprimer un autre super-admin ; le compte technique demeure insupprimable. ⚠️ Rappel porté dans l'écran et dans la confirmation : la suppression **retire les repas passés de la comptabilité**, alors que la désactivation les conservait — à faire après facturation. MàJ `R-NIV-07`. Aucun SQL. |
| 2026-08-04 | 1.26 | **[NIV][CPT]** Retour client : sur la section **Comptes**, le niveau **Lecture** affichait quand même les boutons d'action de l'écran Utilisatrices (**Inviter**, **Relancer** / **Annuler** une invitation, **Déplacer**, **Libérer / désactiver**). Les serveurs les refusaient déjà — aucun compte n'a donc pu être modifié — mais l'écran laissait croire le contraire et renvoyait « Accès non autorisé » au clic. Ces actions sont désormais **réservées au niveau Édition**. Ajout `R-NIV-12`. Aucun SQL. |
| 2026-08-04 | 1.25 | **[NIV][COMPTA]** **Correction : comptabilité repas faussée pour une administratrice n'ayant que la section Repas.** L'écran « Inscriptions & comptabilité » lit les périodes d'absence pour en **déduire** les repas des jours intérieurs (`R-FOYER-09` / `R-REPAS-10`) ; cette lecture était gardée par la section **Absences**. Une administratrice habilitée sur **Repas seulement** se voyait donc refuser la donnée (message « Accès non autorisé »), et l'écran affichait une comptabilité **sans aucune déduction d'absence** — des totaux **surévalués** dès qu'une habitante avait un séjour déductible sur la période, sans autre signalement que ce message. Les périodes d'absence sont désormais servies **avec** les inscriptions, sous le droit **Repas**, et **réduites aux seules dates** nécessaires au calcul : la vue Présence foyer et le marquage des absences restent réservés à la section **Absences**. MàJ `R-NIV-02`. Aucun SQL. |
| 2026-08-04 | 1.24 | **[TECHNIQUE — aucune règle métier modifiée]** Nettoyage de la double génération du module repas. L'**ancien modèle de repas** (celui d'avant la bascule du 05/07/2026 : inscriptions `presences`, options par défaut et surcharges par plage de dates) était devenu **inaccessible depuis l'appli** mais subsistait dans le code et en base ; il est **entièrement supprimé**, avec son historique — dont le client a confirmé ne plus avoir besoin. Le modèle en service, qui portait partout le suffixe provisoire « v2 », **reprend les noms définitifs** : la table `presences_v2` devient `presences`, et les écrans/API `…-v2` perdent leur suffixe (la comptabilité repas passe de `/admin/repas-v2` à `/admin/repas`). **Aucun changement visible à l'usage**, à une exception près : un **favori enregistré sur une ancienne adresse `…-v2` ne fonctionne plus** — y accéder par la barre de navigation repas. SQL `supabase/suppression-v1-renommage-presences.sql`. |
| 2026-08-03 | 1.23 | **[NIV][ROLE]** Retour client : ajout d'un **4ᵉ niveau de droits, « Aucun » (0)**, qui **retire complètement une section** à une personne — onglet masqué, page interdite (redirection), carte retirée de l'accueil, API refusée, et sortie des listes d'intendance de la section (l'historique déjà enregistré restant visible). L'ancien « Aucun » est **renommé « Utilisateur »** : simple changement de libellé, **aucun droit existant n'est modifié** (le niveau 0 a été ajouté sans renuméroter). La section **Comptes**, qui n'a pas de page côté résidente, garde 3 niveaux. Ajout `R-NIV-11`, MàJ `R-NIV-01/10`. SQL `supabase/roles-niveau-aucun.sql` (contrainte uniquement, aucune donnée touchée). |
| 2026-08-03 | 1.22 | **[REPAS]** Retours de test. **Date de bascule ramenée au 03/08/2026** (elle était au 10/08, dans le futur : les trois états restaient donc invisibles et tout ce qui n'avait pas de réponse s'affichait « Non », aussi bien dans le détail d'intendance que sur la carte « Ma journée ») — MàJ `R-REPAS-12`. **Signal visuel allégé** : le sélecteur n'est plus coloré et la mention « Réponse attendue » est retirée ; seul le **badge orange « À renseigner »** en en-tête de jour est conservé — MàJ `R-REPAS-13`. |
| 2026-08-01 | 1.21 | **[NIV][EVT][ROLE][FOYER]** Retours client. **Droits Événements rendus effectifs** : « Voir les inscrits » (confirmations) et les événements **réservés au staff** dépendaient du seul attribut « admin » (donc de **n'importe quelle** section) ; ils dépendent désormais de **Événements ≥ Lecture** — ajout `R-NIV-10`, MàJ `R-EVT-07/09`, `R-ROLE-05`. Le niveau **Aucun** est explicité : il ne retire jamais la vue de résidente (voir les événements et les rappels, confirmer sa participation) ; le panneau **« Droits »** affiche désormais sous chaque section ce que donne chaque niveau. **Champ de contact « je suis chez… » supprimé** des deux fenêtres d'absence (jamais réaffiché côté intendance, donc sans usage) ; la colonne reste en base pour l'historique — `R-FOYER-08` marquée supprimée. |
| 2026-08-01 | 1.20 | **[REPAS][FOYER]** Retours client : **distinction « Non » / « Sans réponse »** dans le détail des inscriptions. Côté habitante, « Non » n'est plus l'état par défaut : le sélecteur s'ouvre sur **« À renseigner »** et « Non » devient un choix explicite ; les jours comportant un service non renseigné portent un **badge orange « À renseigner »**, et l'on peut **revenir à « À renseigner »** tant que le jour n'est pas verrouillé — ajout `R-REPAS-12/13`, MàJ `R-REPAS-02/03`, `R-COMPTA-06/08`. Côté intendance, le tableau de détail et l'export CSV affichent **« Non »** (rouge) vs **« — » / « Sans réponse »** (gris), et la popup d'édition permet de poser « Non » ou de **retirer la réponse**. **Reprise de l'historique : aucune** — avant le **03/08/2026**, l'absence de réponse continue d'être lue « Non ». La popup admin **« Marquer une présence / absence »** reçoit la case **« Noter Non aux repas dans l'intervalle »** (cochée par défaut), déjà disponible côté habitante — MàJ `R-FOYER-11`, `R-REPAS-10`. SQL `supabase/presences-non-explicite.sql`. |
| 2026-07-27 | 1.19 | **[CPT][EVT][REPAS]** Retours client : **fusion** des onglets **Chambres** et **Utilisatrices** en une **liste unique** (personnes + chambres, classée résidence → étage → chambre, colonne Droits en ligne) avec panneaux repliables « Comptes désactivés » et « Gérer les chambres & étages » — ajout `R-CPT-11`, MàJ `R-CPT-04`. **Choix des droits à la réassignation** d'un compte désactivé (repartir de zéro / garder) — ajout `R-CPT-12`. Encart maintenance **« Sans chambre attribuée »** réservé au compte technique, avec actions attribuer/droits/supprimer — ajout `R-CPT-13`. **Suppression des onglets** de l'écran Administration (onglet **Invités** retiré ; Utilisatrices affiché directement). Ciblage des événements **dérivé du référentiel réel des places** (`places`), **Corail inclus** comme section sans étage — ajout `R-EVT-12`. **Navigation repas** : barre de pastilles unique (visualisation, inscriptions & compta, paramétrage) sur tous les écrans repas, sans repasser par l'accueil. Dans les détails repas/présences, le **libellé de chambre** est résolu depuis `places` via `place_id` (au lieu du code brut legacy de `residentes.chambre`). |
| 2026-07-27 | 1.18 | **[FOYER][EVT][OPT]** Retours client : onglet **Paramètres** supprimé (verrouillage présence déplacé en haut de la vue Présences) ; **édition inline des présences** dans la liste (bascule Au foyer/Sortie + ajout) et **export CSV** du détail présences — ajout `R-FOYER-12`. Case **« visible par les invitées »** supprimée des événements (visibilité par ciblage uniquement ; invitées ne voient plus les événements) — MàJ `R-EVT-06`. Libellé option repas « Rattachée à la résidence » → **« Lieu »**. |
| 2026-07-25 | 1.17 | **[NIV][ROLE]** Passage des droits **par section** de l'appli (**Repas · Événements · Absences · Comptes · Infos pratiques**) : chaque section a un niveau **1 Aucun / 2 Lecture / 3 Édition**, plus un rôle global **Super-admin** (tous droits + attribution des droits + gestion/suppression des comptes). Enforcement serveur `requireSectionView/Edit(section)` pour les actions via API ; écritures directes (événements, paramètres, règles repas) restent en **UI + RLS**. Écran Utilisatrices : panneau **« Droits »** par personne. Migration : ancien niveau global recopié sur les 5 sections, niveau 4 → super-admin. Refonte `[NIV]` (`R-NIV-01..06`), MàJ `R-ROLE-02/03/04`. SQL `supabase/roles-sections.sql`. |
| 2026-07-24 | 1.14 | **[NIV][ROLE]** Introduction d'une **hiérarchie de droits à 4 niveaux** sur les résidentes (1 résidente · 2 admin lecture · 3 admin édition · 4 super-admin), **globale** (pas par page) et **appliquée côté serveur** (`requireAdminView`/`requireAdminEdit`/`requireSuperAdmin`). Seul le **niveau 4** règle les niveaux des autres (écran Utilisatrices), jamais le sien. `is_super_admin` renommé **`is_technique`** (compte caché, hors hiérarchie) ; `is_admin` devient un **miroir** de « niveau ≥ 2 » (trigger). Migration : admins → niveau 3, autres → niveau 1. La **suppression définitive d'un compte** est réservée au **niveau 4** (l'archivage reste au niveau 3). Ajout section `[NIV]` (`R-NIV-01..07`), MàJ `R-ROLE-02/03/04`. |
| 2026-07-24 | 1.15 | **[NIV][REPAS]** Édition des inscriptions repas par l'intendance : depuis la popup d'une option (vue Organisation), un **niveau ≥ 3** peut changer l'option d'un inscrit (ou « Non »), ajouter une résidente, et ajouter/retirer un invité (avec résidente invitante pour la compta), **en passant outre le verrouillage** ; report automatique sur le détail et la compta. Niveau 2 = lecture seule. Ajout `R-NIV-08`. Endpoints `/api/admin/presences-v2` (POST) et `/api/admin/invite-repas`. |
| 2026-07-24 | 1.16 | **[NIV]** Traçabilité des corrections d'intendance via un **journal d'audit append-only** `meal_audit_log` (qui / quand / quoi / option avant→après, snapshots), garde l'historique même après suppression (« Non ») ; hors choix self-service. Ajout `R-NIV-09`. SQL `supabase/meal-audit-log.sql`. *(Remplace l'approche « colonnes sur la ligne » un temps envisagée.)* |
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
