# Mode opératoire — Administratrices (intendance)

> **Document vivant** — guide d'utilisation de l'application *Les Écoles* pour l'**intendance** (administratrices). À mettre à jour à chaque évolution de l'appli.
> Version 1.11 — 2026-08-03.

Une administratrice est une résidente qui a **au moins un droit d'intendance sur une section**. Elle dispose, **en plus** de toutes les fonctions d'une habitante (voir le **Mode opératoire — Résidentes & invitées**), des outils d'intendance correspondant à ses droits.

---

## 1. Droits par section

Les droits se règlent **section par section** de l'appli. Sur chaque section, une personne a l'un de ces niveaux :

| Niveau | Ce qu'elle peut faire sur la section |
|---|---|
| **Aucun** | **La section n'existe pas pour elle** : l'onglet disparaît de la barre du bas, la page est inaccessible et la carte correspondante est retirée de l'accueil. Elle sort aussi des listes de l'intendance pour cette section. |
| **Utilisateur** | Usage normal de résidente : voir les événements et les rappels, s'inscrire à ses repas, déclarer ses absences, lire l'Administratif. Pas d'outils d'intendance. |
| **Lecture** | **Consulte** l'écran d'intendance, sans rien modifier. |
| **Édition** | Consulte **et modifie**. |

> **Ne pas confondre « Aucun » et « Utilisateur ».** « Utilisateur » est le niveau **normal** de toute habitante — c'est celui que tout le monde a par défaut. « Aucun » est une **restriction** : à utiliser pour quelqu'un qui n'est pas concerné du tout par un domaine (par exemple un poste Corail qui ne mange pas au foyer → Repas = Aucun). Le panneau **« Droits »** rappelle sous chaque section ce que donne chaque niveau, et affiche en rouge barré les sections masquées.

**Quel onglet dépend de quelle section :**

| Onglet | Section |
|---|---|
| 📅 Calendrier | Événements |
| 🍴 Repas de la semaine | Repas |
| 🧍 Présence foyer | Absences |
| 📖 Administratif | Infos pratiques |
| 🏠 Accueil | *(aucune — toujours accessible)* |

> La section **Comptes** n'a pas de page côté résidente : elle garde donc **3 niveaux** (Utilisateur / Lecture / Édition), sans « Aucun ».
>
> Mettre une section à **« Aucun »** ne supprime rien : si la personne avait déjà des repas ou des absences enregistrés, ils **restent visibles et comptés** dans les vues d'intendance sur les périodes concernées. On peut revenir en arrière à tout moment.

Les **5 sections** :

| Section | Écrans concernés |
|---|---|
| **Repas** | Visu des repas (compta + organisation), paramétrage & options de repas, verrouillage, édition des inscriptions. |
| **Événements** | **Aucun** : voir les événements et les rappels, confirmer sa participation. **Lecture** : voir en plus **qui s'est inscrit** à un événement (« Voir les inscrits ») et les événements **réservés au staff**. **Édition** : créer / modifier / supprimer des événements. |
| **Absences** | Vue « Présence foyer » (staff) + marquage des absences. |
| **Comptes** | Comptes, chambres/places, invitations, paramètres généraux. |
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

**Régler les droits** d'une occupante : bouton **« Droits »** → cocher **Super-admin** ou choisir, **par section** (Repas, Événements, Absences, Comptes, Infos pratiques), le niveau **Aucun / Lecture / Édition**. Réservé au **super-admin**. On ne peut pas régler **ses propres** droits (anti-blocage).

**Inviter une résidente** (sur une place **libre**) :
1. Clique **« Inviter »**.
2. Deux possibilités :
   - **Nouvelle personne** : saisis son **email** → elle reçoit un email d'activation.
   - **Compte désactivé** (déjà eu un compte) : choisis-le dans la liste **« Réassigner une ancienne résidente »** → son compte est **réactivé et réassigné sans nouvel email**. **Si cette personne avait des droits admin**, un choix apparaît : **repartir de zéro** (simple résidente, recommandé) ou **garder ses anciens droits**.
3. Elle définit son mot de passe et complète son profil (résidence/chambre **imposées**) ; la place passe à **« Occupée »**.

**Départ d'une résidente** : bouton **« Libérer / désactiver »** (⤴) → le compte est **désactivé** (il ne peut plus se connecter, mais son **historique de repas/présence est conservé** pour la compta) et la **place se libère** (réattribuable).

**Comptes désactivés** : un panneau repliable en bas liste les anciens comptes (avec leurs droits en sommeil). Ils se réactivent via **« Inviter »** sur une chambre libre.

**Gérer les chambres & étages** : un second panneau repliable (super-admin/section Comptes en édition) permet d'**ajouter / modifier / désactiver / supprimer** les chambres et postes — la **structure physique** du foyer, séparée de la liste des personnes. L'ajout est rare : les chambres sont normalement déjà toutes là. Résidences **12 / 36** → des **chambres** (par étage) ; Corail → des **postes** (Cuisine, Ménage… ; sans chambre).

**Supprimer** un compte reste possible mais **irréversible** (réservé au super-admin) : pour un simple départ, préférer la **désactivation** ci-dessus.

> Le compte **super-admin** (technique) n'occupe aucune place et n'apparaît pas dans les listes. Un encart **« Sans chambre attribuée »** (situation anormale) n'est visible que du **compte technique** (maintenance) : il permet d'**attribuer une chambre**, régler les **droits** ou **supprimer** le compte concerné.

> Les **invitées** (comptes simplifiés pour les repas) conservent l'**inscription libre** (« Inscription invitée » sur l'écran de connexion) et n'occupent pas de place. Elles ne sont plus gérées depuis un onglet dédié ; on les invite directement à un repas depuis **Repas de la semaine**.

---

## 4. Réglages (heures de verrouillage)

Il n'y a plus d'onglet **Paramètres** séparé : les réglages sont désormais **au plus près de leur usage**.

- **Verrouillage des repas** (heure limite du jour + option week-end) → dans **Paramétrer les repas** (§5).
- **Verrouillage des présences** (heure limite pour modifier sa présence au foyer) → en haut de la **vue Présences** (§6).

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

---

## 6. Présences au foyer (vue staff)

Via l'onglet 🧍 **Présence foyer** → **« Voir les présences »**. Elle indique **qui est au foyer ou sorti**, **par résidence**, déduit des **séjours d'absence**.

**Choisir la période** : deux champs de date en haut (par défaut une semaine à partir d'aujourd'hui).

**Lire les jours** : les jours sont **empilés**. Pour chaque jour et chaque résidence, deux compteurs — **Au foyer** (vert) et **Sorties** (rouge). **Chaque nombre est cliquable** : il ouvre la **liste des personnes** derrière ce nombre.

**Vue d'ensemble** : le bouton **« Voir le détail »** ouvre un **tableau** — en lignes les habitantes (classées **résidence → étage → chambre → nom**, invitées en fin de résidence), en colonnes les jours, chaque case indiquant **P** (au foyer) ou **A** (sortie). *Cette structure de tableau est réutilisée partout (présences, repas) pour ne pas se perdre.* Le bouton **« Exporter (CSV) »** y télécharge le tableau (comme pour les repas).

**Modifier une présence (Absences — Édition)** : dans la liste ouverte au clic sur un compteur, chaque personne peut être basculée **Au foyer ↔ Sortie** pour ce jour, et on peut **ajouter** quelqu'un — sur le même principe que l'édition des inscriptions repas. Le réglage de l'**heure limite** pour modifier une présence se trouve **en haut de cette vue**.

**Marquer une absence ou une présence** : bouton **« Ajouter une absence »**.
1. Choisis la **résidence**, puis la **personne** (résidente ou invitée à compte).
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

> **Édition (niveau ≥ 3).** Dans cette liste, une admin **édition** peut corriger les inscriptions, même après l'heure de verrouillage : **changer l'option** de chaque inscrit (ou la passer à **« Non »**, ou **retirer sa réponse**), **ajouter une résidente** (déplacée automatiquement si elle était inscrite ailleurs pour ce service), et **ajouter / retirer un invité** — au choix **depuis le carnet** (invité déjà connu) ou **nouveau** — en indiquant la **résidente qui invite** (pour la comptabilité). Tout se reporte aussitôt sur le **détail** et la **compta**. En **niveau 2**, la liste reste en **lecture seule**.

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
- **Agrégat par personne** : pour chaque personne, nombre de déjeuners et de dîners (les **« Non »**, les **sans réponse** et les jours d'**absence** ne comptent pas), **invités inclus** pour la personne qui les a invités. **Toutes les résidentes** apparaissent, même celles inscrites à rien (0). La liste est triée **par nom puis prénom** pour faciliter la facturation.

> **Déduction des absences** : un séjour d'absence retire automatiquement les repas des **jours intérieurs** ; le **premier** et le **dernier** jour restent au libre choix de la résidente (elle part après le dîner, revient avant le déjeuner).

---

## 8. Événements & calendrier

Cette section se lit à trois niveaux (voir §1) :

| Droit Événements | Ce que la personne voit / fait |
|---|---|
| **Aucun** | Elle voit les **événements** et les **rappels** qui la concernent, et **confirme sa participation** — comme toute résidente. |
| **Lecture** | En plus : le bouton **« Voir les inscrits »** sur les événements à confirmation (**qui** a répondu présent), et les événements **réservés au staff**. |
| **Édition** | En plus : **créer, modifier et supprimer** des événements. |

> **Depuis le 01/08/2026**, « Voir les inscrits » et les événements **réservés au staff** dépendent de la section **Événements** et non plus du simple fait d'être admin. Une administratrice qui n'a de droits que sur **Repas** (par exemple) n'y a donc plus accès : si elle en a besoin, passe-la à **Événements — Lecture**.

Avec le droit **Édition**, on renseigne pour un événement :
- titre, dates (une ou plusieurs), horaires, lieu (résidence·s), couleur ;
- **visibilité par noms** : après avoir ciblé une ou des **résidences / étages**, la liste des **résidentes concernées** s'affiche, pré-cochée ; on peut **décocher** individuellement pour exclure quelqu'un. Le ciblage est **dynamique** (les futures arrivantes correspondant au filtre sont incluses automatiquement). Une case **réservé au staff** limite la visibilité aux personnes ayant Événements ≥ Lecture ;
- **rappel** (nombre de jours avant) ;
- demande de **confirmation de participation**.

---

## 9. Espace Administratif (infos pratiques)

L'onglet 📖 **Administratif** (barre du bas) est **consultable par toutes** mais **modifiable par les admins** (bouton **« Modifier »**). On y gère des **rubriques libres** :

- **Ajouter / renommer / réordonner / supprimer** des rubriques ;
- rubrique **texte** (éditeur de mise en forme : gras, listes, titres, liens) ou rubrique **Contacts** structurés (nom, rôle, téléphone, email cliquables) ;
- une rubrique peut être **réservée aux administratrices** (🔒) : elle n'est alors **pas visible** par les résidentes (ex. le présent mode d'emploi).

Utilise-le pour le **règlement**, les **horaires**, les **contacts**, les **modes d'emploi** et toute information générale du foyer.

---

*Ce document accompagne le déploiement de l'application dans de nouveaux foyers. Le tenir à jour à chaque évolution fonctionnelle.*
