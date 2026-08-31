# Mode opératoire — Administratrices (intendance)

> **Document vivant** — guide d'utilisation de l'application *Les Écoles* pour l'**intendance** (administratrices). À mettre à jour à chaque évolution de l'appli.
> Version 1.26 — 2026-08-21.

Une administratrice est une résidente qui a **au moins un droit d'intendance sur une section**. Elle dispose, **en plus** de toutes les fonctions d'une habitante (voir le **Mode opératoire — Résidentes & invitées**), des outils d'intendance correspondant à ses droits.

---

## 1. Droits par section

Les droits se règlent **section par section** de l'appli. Sur chaque section, une personne a l'un de ces niveaux :

| Niveau | Ce qu'elle peut faire sur la section |
|---|---|
| **Masquée** | **La section n'existe pas pour elle** : l'onglet disparaît de la barre du bas, la page est inaccessible et la carte correspondante est retirée de l'accueil. Elle sort aussi des listes de l'intendance pour cette section. |
| **Habitante** | Usage normal : voir les événements et les rappels, s'inscrire à ses repas, déclarer ses absences, lire l'Administratif. **Ses propres données**, pas d'outils d'intendance. |
| **Admin · consulter** | **Consulte** les données de tout le foyer sur cette section, sans rien modifier. |
| **Admin · gérer** | Consulte **et modifie** les données de tout le foyer. |

> Les deux derniers niveaux portent le mot **Admin** pour que l'échelle se lise d'un coup d'œil : « Habitante » se situe **en dessous**, il ne donne aucun droit d'intendance.

> **Ne pas confondre « Masquée » et « Habitante ».** « Habitante » est le niveau **normal** — c'est celui que tout le monde a par défaut. « Masquée » est une **restriction** : à utiliser pour quelqu'un qui n'est pas concerné du tout par un domaine (par exemple un poste d'intendance qui ne mange pas au foyer → Repas = Masquée). Le panneau **« Droits »** rappelle sous chaque section ce que donne chaque niveau, et affiche en rouge barré les sections masquées.

**Quel onglet dépend de quelle section :**

| Onglet | Section |
|---|---|
| 📅 Calendrier | Événements |
| 🍴 Repas de la semaine | Repas |
| 🧍 Présence foyer | Absences |
| 📖 Administratif | Infos pratiques |
| 🏠 Accueil | *(aucune — toujours accessible)* |

> La section **Comptes** n'a pas de page côté habitante : elle garde donc **3 niveaux** (Habitante / Admin · consulter / Admin · gérer), sans « Masquée ».
>
> Mettre une section à **« Masquée »** ne supprime rien : si la personne avait déjà des repas ou des absences enregistrés, ils **restent visibles et comptés** dans les vues d'intendance sur les périodes concernées. On peut revenir en arrière à tout moment.

Les **5 sections** :

| Section | Écrans concernés |
|---|---|
| **Repas** | Visu des repas (compta + organisation), paramétrage & options de repas, verrouillage, édition des inscriptions. *La comptabilité déduisant les repas des absences, cette section permet de voir **les dates** des séjours d'absence ; consulter et modifier les absences relève de la section **Absences**.* |
| **Événements** | **Habitante** : voir les événements et les rappels, confirmer sa participation. **Admin · consulter** : voir en plus **qui s'est inscrit** à un événement (« Voir les inscrits »). **Admin · gérer** : créer / modifier / supprimer des événements. |
| **Absences** | Vue « Présence foyer » (staff) + marquage des absences. |
| **Comptes** | Comptes, chambres/places, invitations, paramètres généraux. **Admin · consulter** : voir qui occupe quelle chambre et avec quels droits, **sans aucune action possible** (pas d'invitation, pas de déplacement, pas de désactivation). **Admin · gérer** : inviter, relancer/annuler une invitation, déplacer une résidente, libérer une place. Régler les **droits** d'une personne et gérer la **structure physique** (chambres, étages, postes) restent réservés au **super-admin**. |
| **Infos pratiques** | Rubriques de l'onglet Administratif. |

S'ajoute un rôle **Super-admin** (global) : **tous les droits partout**, **plus** le réglage des **droits des autres** et la **suppression** de comptes.

- **Seul un super-admin** peut régler les droits des autres, depuis l'onglet **Utilisatrices** → bouton **« Droits »** (voir §3). Il **ne peut pas** changer ses propres droits (anti-blocage).
- Un **compte technique** (maintenance) existe en coulisse : **caché**, non listé, non modifiable, accès total.
- Le bouton ⚙️ **Administration** n'apparaît qu'aux personnes ayant la section **Comptes** ; les autres écrans s'atteignent depuis leur onglet (repas, présence foyer, calendrier, administratif).

---

## 2. Où trouver les fonctions d'intendance

- **Panneau d'administration** : bouton **roue crantée ⚙️** en **haut à droite** des écrans (visible pour la section **Comptes**). Il ouvre **directement** la gestion des **utilisatrices** (personnes + chambres réunies ; plus d'onglets).
- **Navigation repas (admin)** : sur l'onglet 🍴 **Repas de la semaine** et les écrans d'intendance repas, une **barre de pastilles** en haut permet de basculer entre **Repas de la semaine**, **Inscriptions & comptabilité** et **Paramétrer les repas** (la pastille de l'écran courant est mise en avant), sans repasser par l'accueil.
- **Présences au foyer (vue staff)** : via l'onglet 🧍 **Présence foyer** → bouton **« Voir les présences »**.

---

## 3. Gérer les utilisatrices

Panneau ⚙️ **Administration**. L'écran affiche **directement** la gestion des utilisatrices — **plus d'onglets** (« Chambres » et « Invités » supprimés). **Une seule liste** rassemble les personnes **et** leurs chambres. Principe : **une chambre = une place = un compte**. Les résidentes **ne s'inscrivent plus elles-mêmes** — elles sont **invitées** par l'intendance.

**La liste des utilisatrices** est classée par **résidence → étage → chambre**. Chaque ligne montre la **place**, son **occupante** (ou **Libre** / **Invitation envoyée**) et, pour une occupante, le **résumé de ses droits**. Selon l'état de la place :

- **Libre** → bouton **« Inviter »**.
- **Invitation envoyée · email** → **relancer** (↻) ou **annuler** (✕).
- **Occupée · Nom Prénom** → **« Droits »** (super-admin uniquement), **« Déplacer »** (⇄) et **« Libérer / désactiver »** (⤴).

**Régler les droits** d'une occupante : bouton **« Droits »** → cocher **Super-admin** ou choisir, **par section** (Repas, Événements, Absences, Comptes, Infos pratiques), le niveau **Masquée / Habitante / Admin · consulter / Admin · gérer**. Réservé au **super-admin**. On ne peut pas régler **ses propres** droits (anti-blocage).

**Inviter une résidente** (sur une place **libre**) :
1. Clique **« Inviter »**.
2. Deux possibilités :
   - **Nouvelle personne** : saisis son **email** → elle reçoit un email d'activation.
   - **Compte désactivé** (déjà eu un compte) : choisis-le dans la liste **« Réassigner une ancienne résidente »** → son compte est **réactivé et réassigné sans nouvel email**. **Si cette personne avait des droits admin**, un choix apparaît : **repartir de zéro** (simple résidente, recommandé) ou **garder ses anciens droits**.
3. Elle définit son mot de passe et complète son profil (résidence/chambre **imposées**) ; la place passe à **« Occupée »**.

**Départ d'une résidente** : bouton **« Libérer / désactiver »** (⤴) → le compte est **désactivé** (il ne peut plus se connecter, mais son **historique de repas/présence est conservé** pour la compta) et la **place se libère** (réattribuable).

**Comptes désactivés** : un panneau repliable en bas liste les anciens comptes (avec leurs droits en sommeil). Ils se réactivent via **« Inviter »** sur une chambre libre.

**Supprimer définitivement un compte** : dans ce même panneau, le bouton 🗑 efface le compte pour de bon. Il n'est proposé que sur un compte **déjà désactivé** — pour supprimer quelqu'un d'actif, il faut donc d'abord le **libérer / désactiver**. Le niveau **Admin · gérer** sur Comptes suffit ; seul un super-admin peut supprimer un autre super-admin.

> ⚠️ **À ne faire qu'après avoir facturé la période.** La *désactivation* conserve l'historique des repas ; la *suppression*, elle, retire la personne de la **comptabilité passée**. Une fois supprimée, on ne peut plus la retrouver ni la réactiver.

**Gérer les blocs, chambres & étages** : un second panneau repliable, **réservé au super-admin**, contient la **structure physique** du foyer, séparée de la liste des personnes.

- **Blocs du foyer** (en haut du panneau) — un « bloc », c'est une **résidence** (Résidence 12, Résidence 36) ou un **ensemble de postes** (Corail, l'intendance). On peut en **ajouter**, les **renommer**, changer leur **couleur**, les **réordonner** (↑ ↓), les **désactiver** ou les **supprimer**. À la création, on choisit ce que le bloc contient : *des chambres réparties par étage* (une résidence) ou *des postes sans étage* (une intendance).
  > **Un bloc ajouté ici obtient tout de suite son propre encadré partout** : comptabilité des repas, ciblage des événements et — s'il s'agit d'une **résidence** — organisation des services, présences au foyer, rattachement d'une option de repas et intercalaires de l'accueil. Rien d'autre n'est à faire.
  > Un bloc d'**intendance** n'apparaît pas dans les **présences au foyer** : ses membres travaillent au foyer sans y dormir, la question « au foyer ce soir ? » ne les concerne pas. Ils restent en revanche dans la **comptabilité des repas**, qu'ils prennent sur place.
  > **Suppression** : possible seulement si le bloc ne contient **aucune chambre/poste** et **aucun compte** (même parti). Sinon, le **désactiver**. Et son contenu (chambres ou postes) se **fige** dès qu'il contient une place.
- **Étages**, dans chaque bloc « résidence » : **ajouter / renommer / réordonner (↑ ↓) / supprimer**. Un étage peut exister **avant** d'avoir la moindre chambre — c'est ainsi qu'on dessine la structure d'un foyer qui démarre. Il ne se supprime que **vide**.
- **Chambres**, à l'intérieur de chaque étage (bouton **« + Chambre »** sur la ligne de l'étage), et **postes** pour un bloc d'intendance : **ajouter / modifier / désactiver / supprimer**. L'ajout est rare une fois le foyer en place. Une chambre désactivée disparaît de la liste des utilisatrices.
  > Le formulaire de chambre **choisit son étage dans la liste** : on ne le tape plus à la main, ce qui évitait qu'« Étage 3 » et « étage 3 » deviennent deux étages différents. Renommer un étage est sans risque : ses chambres et les événements ciblés dessus suivent.

**Supprimer** un compte reste possible mais **irréversible** (réservé au super-admin) : pour un simple départ, préférer la **désactivation** ci-dessus.

> Le compte **super-admin** (technique) n'occupe aucune place et n'apparaît pas dans les listes. Un encart **« Sans chambre attribuée »** (situation anormale) n'est visible que du **compte technique** (maintenance) : il permet d'**attribuer une chambre**, régler les **droits** ou **supprimer** le compte concerné.

> Les **invitées** (comptes simplifiés pour les repas) conservent l'**inscription libre** (« Inscription invitée » sur l'écran de connexion) et n'occupent pas de place. Elles ne sont plus gérées depuis un onglet dédié ; on les invite directement à un repas depuis **Repas de la semaine**. N'occupant pas de place, elles **n'apparaissent pas** dans les écrans d'intendance (voir ci-dessous).

### 3.1. Qui apparaît dans les autres écrans ?

**Cet écran est la source de tout le reste de l'appli.** Une personne apparaît dans les repas, la comptabilité, l'organisation, les détails, les présences au foyer, le détail des absences, le ciblage des événements et les listes de personnes **si et seulement si son compte est activé ici**, c'est-à-dire **actif et rattaché à une chambre ou à un poste**.

N'apparaissent donc **pas** : les **comptes désactivés** (départs), les comptes **actifs sans chambre ni poste**, le compte **technique**, et les **invitées**.

Deux précisions utiles :

- **L'historique n'est jamais perdu.** Une personne partie en cours de mois reste affichée là où elle a une donnée enregistrée sur la période consultée : ses **repas restent comptés** (donc facturables) et ses **absences déclarées** restent visibles — mais seulement les jours concernés, jamais comme « au foyer ».
- **On ne peut plus l'inscrire.** Quand tu ajoutes quelqu'un à une option de repas ou que tu enregistres une nouvelle absence, seuls les **comptes activés** te sont proposés.

> ⚠️ **Si quelqu'un a disparu d'un écran**, la cause est presque toujours ici : son compte est **désactivé**, ou **actif sans chambre ni poste**. Attribue-lui une place (bouton **« Inviter »** sur une place libre, ou **« Déplacer »**) et elle réapparaît partout.

---

### 3.2. Groupes de personnes

Un **groupe** rassemble des personnes sous un nom libre — « Staff 12 », « Intendance », « Responsables événements ». Il sert à **cibler la visibilité** d'un contenu : un événement, une option de repas ou une rubrique de l'onglet Administratif peuvent être réservés aux membres d'un groupe.

> **Un groupe ne donne aucun droit.** Mettre quelqu'un dans « Intendance » ne lui ouvre aucun écran d'administration : cela lui rend seulement visibles les contenus ciblés sur ce groupe. Les droits se règlent toujours avec le bouton **« Droits »**, section par section.

**Créer et composer un groupe** (Comptes — Édition) : panneau repliable **Groupes** en bas de l'écran Administration.
1. **« Nouveau groupe »** → saisis un nom → ✓.
2. Clique le nom du groupe pour le déplier : coche les personnes qui en font partie. L'enregistrement est immédiat. Un **champ de recherche** permet de retrouver quelqu'un par son nom, son prénom ou sa chambre sans faire défiler toute la liste — les personnes **déjà dans le groupe** restent affichées quoi que tu tapes, pour que tu puisses toujours les décocher.
3. Les crayons ✏️ et 🗑 renomment et suppriment le groupe.

Une personne peut appartenir à **plusieurs groupes**. Ses groupes s'affichent en **pastilles, juste à côté de son nom** dans la liste des utilisatrices — pratique pour vérifier d'un coup d'œil qui est où. Chaque groupe a sa **propre couleur**, attribuée automatiquement et **stable** : elle ne change pas si tu renommes le groupe, et c'est la même partout (liste, panneau Groupes, profil de l'habitante).

> ⚠️ **Un groupe ne se met pas à jour tout seul.** Contrairement au ciblage « Résidence 12 » ou « Étage 3 », qui inclut automatiquement toute nouvelle arrivante, un groupe ne contient que les personnes que tu y as mises. Quand une nouvelle intendante arrive, pense à l'ajouter — sinon elle ne verra pas les contenus réservés.

> Un groupe **encore utilisé** pour cibler un contenu ne peut pas être supprimé : l'appli te dit lequel. Retire-le d'abord de ce contenu.

### 3.3. Qui voit quoi : le ciblage

**Événements**, **options de repas** et **rubriques Administratif** utilisent tous le **même sélecteur** :

- coche des **résidences** entières et/ou des **étages** précis ;
- coche des **groupes** ;
- la liste des **personnes concernées** s'affiche dessous : décoche quelqu'un pour l'**exclure nommément**.

Les critères s'**additionnent** : une personne visée par la résidence **ou** par le groupe est concernée. **Ne rien cocher = visible par toutes.**

Ce ciblage est appliqué **côté serveur** : une rubrique qui ne concerne pas une habitante ne lui est même pas envoyée, et l'appli refuse une inscription à une option de repas qui ne lui est pas proposée.

> **Les cases « réservé aux administratrices » et « réservé au staff » n'existent plus.** Elles visaient *toute* personne ayant un droit d'intendance, fût-ce sur une seule section sans rapport. Pour réserver un contenu à l'intendance, **crée un groupe** (ex. « Intendance ») et cible-le dessus : tu choisis exactement qui le voit.
>
> ⚠️ **Un contenu sans aucun ciblage est visible par toutes.** C'est le comportement voulu pour la plupart des rubriques et des options ; ne l'oublie pas pour celles qui doivent rester internes.

---

## 4. Réglages (heures de verrouillage)

Il n'y a plus d'onglet **Paramètres** séparé : les réglages sont désormais **au plus près de leur usage**.

- **Verrouillage des repas** (heure limite du jour + jours fermés d'avance) → dans **Paramétrer les repas** (§5).
- **Verrouillage des présences** (heure limite pour qu'une habitante modifie sa présence au foyer) → en haut de la **vue Présences** (§6).

---

## 5. Paramétrer les repas

Accès : depuis la **barre de navigation repas** (pastilles présentes sur tous les écrans repas) → **Paramétrer les repas**. L'écran comporte deux parties.

### 5.1. Catalogue d'options
La liste des **options** que le foyer peut proposer (ex. « Repas classique », « Apéro dînatoire », « Pique-nique »). Pour chaque option :

- **Libellé** (ce que voit la résidente) ;
- **Lieu** : **12**, **36**, ou **« Résidence de la personne »** (le couvert est alors compté dans la résidence de l'inscrite) — c'est ce qui détermine dans quelle résidence le repas est **regroupé/facturé** ;
- **Délai (jours avant)** : `0` = clôture **le jour même** à l'heure de verrouillage ; `+1` par jour d'avance (ex. un pique-nique en `1` ferme **la veille**) ;
- **Réservée à l'intendance** : l'option n'apparaît qu'aux admins ;
- **Active / inactive** : une option inactive n'est jamais proposée (sans être supprimée).

### 5.2. Ouverture des services
C'est ici qu'on décide, **jour par jour et par service** (déjeuner / dîner), **quelles options sont proposées** aux résidentes. Un service **sans aucune option ouverte** s'affiche **« fermé »** côté résidente.

- **Dupliquer sur une plage** : reporter les options d'un jour sur plusieurs dates en une fois (sélecteur multi-dates), pour ouvrir toute une semaine rapidement.

> ⚠️ **À faire régulièrement** : sans options créées **et** de services ouverts, les résidentes voient « Service fermé » et ne peuvent pas s'inscrire.

### 5.3. Verrouillage des inscriptions
En haut du même écran, deux réglages.

- **Heure de clôture (le jour même)** : passé cette heure, les repas du jour ne sont plus modifiables par les habitantes. Réglez-la sur l'heure où votre cuisine arrête de compter. Vous, vous gardez la main.
- **Jours fermés d'avance** : les sept boutons **Lun → Dim**. Un jour allumé se verrouille **avant** sa propre journée. Une phrase sous les boutons annonce l'effet exact de vos cases — lisez-la, elle évite les surprises.

**Comment se calcule la fermeture.** Des jours allumés **qui se suivent** comptent pour **un seul bloc**, fermé dès l'heure de clôture **de la veille du premier**. Concrètement :

| Jours allumés | Effet |
|---|---|
| Samedi + dimanche | Les deux se ferment **le vendredi** à l'heure de clôture *(réglage par défaut)* |
| Mercredi seul | Le mercredi se ferme **le mardi** |
| Dimanche + lundi | Les deux se ferment **le samedi** — la semaine est circulaire |
| Aucun | Chaque jour se ferme le jour même, règle ordinaire |

> **Les sept jours ne peuvent pas être allumés** : plus rien ne serait jamais modifiable. L'enregistrement est refusé avec un message.

> À ne pas confondre avec le **délai de commande** d'une option (§5.1), qui ferme *une option* plus tôt que les autres. Les deux peuvent jouer ensemble : c'est **la fermeture la plus précoce qui l'emporte**.

Côté habitante, un jour fermé affiche le motif (« Les repas du dimanche sont verrouillés dès le vendredi 21:00 ») — inutile de l'expliquer une par une.

---

## 6. Présences au foyer (vue staff)

Via l'onglet 🧍 **Présence foyer** → **« Voir les présences »**. Elle indique **qui est au foyer ou sorti**, **par résidence**, déduit des **séjours d'absence**.

**Choisir la période** : deux champs de date en haut (par défaut une semaine à partir d'aujourd'hui).

**Lire les jours** : les jours sont **empilés**. Pour chaque jour et chaque résidence, deux compteurs — **Au foyer** (vert) et **Sorties** (rouge). **Chaque nombre est cliquable** : il ouvre la **liste des personnes** derrière ce nombre.

**Vue d'ensemble** : le bouton **« Voir le détail »** ouvre un **tableau** — en lignes les habitantes (classées **résidence → étage → chambre → nom**, invitées en fin de résidence), en colonnes les jours, chaque case indiquant **P** (au foyer) ou **A** (sortie). *Cette structure de tableau est réutilisée partout (présences, repas) pour ne pas se perdre.* Le bouton **« Exporter (CSV) »** y télécharge le tableau (comme pour les repas).

**Modifier une présence (Absences — Admin · gérer)** : dans la liste ouverte au clic sur un compteur, chaque personne peut être basculée **Au foyer ↔ Sortie** pour ce jour, et on peut **ajouter** quelqu'un — sur le même principe que l'édition des inscriptions repas.

**Heure limite de modification (le verrouillage).** Le réglage se trouve **en haut de cette vue** (par défaut **23:00**). Il encadre **les habitantes, pas vous** :

- passé cette heure, une habitante ne peut plus déclarer, modifier ni supprimer une absence **pour la nuit même**, ni revenir sur une nuit déjà passée ; les nuits suivantes restent libres ;
- ce qui se verrouille est **la nuit, pas le séjour** : une habitante peut donc toujours **prolonger** vers l'avenir une absence commencée dans le passé, mais plus la supprimer ;
- **vous passez outre à toute heure** : « Ajouter une absence » et l'édition dans la liste fonctionnent sur n'importe quelle date, verrouillée ou passée. C'est donc à vous que revient toute **régularisation** — une habitante qui vous appelle à 23:30 pour dire qu'elle ne rentre pas doit être saisie par vous.

Choisissez cette heure au moment où vous comptez réellement les lits : trop tôt, les habitantes seront bloquées pour rien ; trop tard, le décompte du soir bougera encore après votre passage.

> **Qui figure dans cette vue ?** Les **comptes activés** de chaque résidence (voir §3.1). Une personne partie n'y apparaît **que** les jours couverts par une absence qu'elle avait déclarée ; sa case est **vide (—)** les autres jours, et elle n'est jamais comptée « au foyer ».

**Marquer une absence ou une présence** : bouton **« Ajouter une absence »**.
1. Choisis la **résidence**, puis la **personne** — seuls les **comptes activés** sont proposés (§3.1).
2. Choisis **« Absente »** (crée un séjour) ou **« Présente »** (retire les absences déjà déclarées sur la période — pour corriger ou faire revenir quelqu'un).
3. Renseigne la **période**.
4. Pour une absence, laisse cochée (ou décoche) la case **« Noter Non aux repas dans l'intervalle »** — **cochée par défaut**, c'est la même que celle dont dispose l'habitante. Cochée, les repas des **jours intérieurs** du séjour sont comptés **« Non »** et la personne apparaît **🌙 absente** dans les vues repas. Décochée, l'absence **n'a aucun effet** sur les repas (utile pour quelqu'un qui dort ailleurs mais mange au foyer).
5. Valide.

> Cette case **ne modifie pas** les inscriptions enregistrées : elle les **neutralise** le temps du séjour. Si tu raccourcis ou supprimes l'absence, les choix d'origine réapparaissent tels quels.

---

## 7. Inscriptions aux repas & comptabilité

Accès : **barre de navigation repas** → **Inscriptions & compta**. Deux onglets, sur une **période choisie** (sélecteur de dates en haut).

### Onglet « Organisation » — repas à préparer
Les jours sont **empilés** ; pour chaque jour et chaque résidence, les **options ouvertes** au midi et au soir, avec leur nombre d'inscrits. **Chaque option est cliquable** → la **liste des personnes comptées**. Les **invités** ne forment plus une tuile à part : chacun est compté **dans l'option** à laquelle il est rattaché et apparaît dans cette liste, annoté **« invité par Prénom Nom »**.

> **Admin · gérer.** Dans cette liste, une admin ayant ce niveau peut corriger les inscriptions, même après l'heure de verrouillage : **changer l'option** de chaque inscrit (ou la passer à **« Non »**, ou **retirer sa réponse**), **ajouter une résidente** — seuls les **comptes activés** sont proposés (§3.1) — (déplacée automatiquement si elle était inscrite ailleurs pour ce service), et **ajouter / retirer un invité** — au choix **depuis le carnet** (champ de recherche parmi les invités déjà venus) ou **nouveau** (**le nom ou le prénom suffit**) — en indiquant la **résidente qui invite** (pour la comptabilité). Tout se reporte aussitôt sur le **détail** et la **compta**.

> **Un invité mange ce que son invitante peut choisir.** La liste « Invité par » ne propose que les résidentes à qui **cette** option est ouverte, et l'option d'un invité déjà là ne peut basculer que vers celles ouvertes à **son** invitante. Autrement dit : pas de pique-nique pour l'invité de quelqu'un qui n'y a pas droit — le serveur refuse aussi, pas seulement l'écran. En **Admin · consulter**, la liste reste en **lecture seule**.

**Le bouton « Voir le détail »** ouvre le **tableau** (habitantes × jours/service). Chaque case indique l'un de **quatre** états :

| Affichage | Signification |
|---|---|
| Libellé de l'option (vert) | Elle mange cette option. |
| **Non** (rouge) | Elle a **répondu** qu'elle ne mange pas. |
| **—** (gris) | Elle **n'a pas répondu**. Aucun repas compté, mais c'est une personne à **relancer**. |
| 🌙 (lune orange) | **Absente** — déduit de son séjour d'absence. |

> **« Non » et « — » ne sont pas la même chose.** Avant, l'appli ne faisait pas la différence : une résidente qui n'avait rien touché apparaissait comme un « Non ». Depuis le **03/08/2026**, « Non » est un **choix explicite** de l'habitante, et « — » signale qu'elle **n'a rien renseigné**. Les repas **antérieurs** à cette date continuent de s'afficher comme avant. L'**export CSV** du détail reprend ces libellés (« Non », « Sans réponse », « Absente »).

Un invité apparaît en **petit badge « +👤 Prénom »** dans la case de la personne qui l'a invité (jamais de ligne à part).

### Onglet « Comptabilité »
- **Récapitulatif de la période** : total déjeuners / dîners **par résidence**, et un **grand total**.
- **Agrégat par personne** : pour chaque personne, nombre de déjeuners et de dîners (les **« Non »**, les **sans réponse** et les jours d'**absence** ne comptent pas), **invités inclus** pour la personne qui les a invités. **Tous les comptes activés** apparaissent, même ceux inscrits à rien (0) — voir §3.1. La liste est triée **par nom puis prénom** pour faciliter la facturation.

> **Un départ en cours de période reste facturé.** Une personne **désactivée** depuis n'est plus dans les listes courantes, mais elle **réapparaît** dans la comptabilité de toute période où elle a réellement pris des repas : rien n'est perdu pour la facturation. Elle ne peut simplement plus être **ajoutée** à une option.

> **Déduction des absences** : un séjour d'absence retire automatiquement les repas des **jours intérieurs** ; le **premier** et le **dernier** jour restent au libre choix de la résidente (elle part après le dîner, revient avant le déjeuner).

---

## 8. Événements & calendrier

Cette section se lit à trois niveaux (voir §1) :

| Droit Événements | Ce que la personne voit / fait |
|---|---|
| **Habitante** | Elle voit les **événements** et les **rappels** qui la concernent, et **confirme sa participation** — comme toute résidente. |
| **Admin · consulter** | En plus : le bouton **« Voir les inscrits »** sur les événements à confirmation (**qui** a répondu présent — une personne **désactivée depuis** son inscription y reste listée). |
| **Admin · gérer** | En plus : **créer, modifier et supprimer** des événements. |

> **« Voir les inscrits » dépend de la section Événements** (≥ Admin · consulter) et non du simple fait d'être admin. Une administratrice qui n'a de droits que sur **Repas** n'y a donc pas accès : si elle en a besoin, passe-la à **Événements — Admin · consulter**.
>
> Un **événement d'intendance** ne se marque plus « réservé au staff » : cible-le sur un **groupe** (ex. « Staff 12 »).

Avec le droit **Admin · gérer**, on renseigne pour un événement :
- titre, dates (une ou plusieurs), horaires, lieu (résidence·s), couleur ;
- **visibilité** : coche des **résidences / étages** et/ou des **groupes** (§3.2) ; la liste des **résidentes concernées** — les **comptes activés** (§3.1) — s'affiche dessous, pré-cochée, et l'on peut **décocher** individuellement pour exclure quelqu'un. Voir §3.3. Le ciblage par résidence/étage est **dynamique** (les futures arrivantes correspondant au filtre sont incluses automatiquement) ; un **groupe**, lui, se tient à jour à la main ;
- **rappel** (nombre de jours avant) ;
- demande de **confirmation de participation**.

---

## 9. Espace Administratif (infos pratiques)

L'onglet 📖 **Administratif** (barre du bas) est **consultable par toutes** mais **modifiable par les admins** (bouton **« Modifier »**). On y gère des **rubriques libres** :

- **Ajouter / renommer / réordonner / supprimer** des rubriques ;
- rubrique **texte** (éditeur de mise en forme : gras, listes, titres, liens) ou rubrique **Contacts** structurés (nom, rôle, téléphone, email cliquables) ;
- une rubrique se **cible** via **« Qui voit cette rubrique ? »** (résidences, étages, groupes) : sans ciblage elle est visible par toutes ; ciblée sur un groupe « Intendance », elle reste interne (ex. le présent mode d'emploi). Le ciblage se règle **dès la création** de la rubrique, en même temps que son titre et son type — pas besoin de la créer d'abord pour décider ensuite qui la voit.

Utilise-le pour le **règlement**, les **horaires**, les **contacts**, les **modes d'emploi** et toute information générale du foyer.

---

*Ce document accompagne le déploiement de l'application dans de nouveaux foyers. Le tenir à jour à chaque évolution fonctionnelle.*
