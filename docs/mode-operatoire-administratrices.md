# Mode opératoire — Administratrices (intendance)

> **Document vivant** — guide d'utilisation de l'application *Les Écoles* pour l'**intendance** (administratrices). À mettre à jour à chaque évolution de l'appli.
> Version 1.5 — 2026-07-24.

Une administratrice est une résidente dont le **niveau de droits** est ≥ 2. Elle dispose, **en plus** de toutes les fonctions d'une habitante (voir le **Mode opératoire — Résidentes & invitées**), d'outils d'intendance : le **panneau d'administration**, le **paramétrage des repas**, la **comptabilité**, la **vue des présences** et la **gestion des événements**.

---

## 1. Niveaux de droits

Chaque résidente a un **niveau** qui détermine ce qu'elle peut faire :

| Niveau | Rôle | Ce qu'elle peut faire |
|---|---|---|
| **1** | Résidente | Aucun accès admin (usage normal de l'appli). |
| **2** | Admin — lecture | **Consulte** les écrans d'intendance, mais **ne peut rien modifier**. |
| **3** | Admin — édition | Consulte **et modifie** (paramétrage repas, présences, événements, comptes…). |
| **4** | Super-admin | Tout le niveau 3, **plus** le réglage du **niveau des autres** utilisatrices. |

- Le niveau est **global** : il vaut pour toutes les pages d'administration.
- **Seul un super-admin (niveau 4)** peut changer le niveau des autres, depuis l'onglet **Utilisatrices** (voir §3). Il **ne peut pas** changer son propre niveau (sécurité anti-blocage).
- Les droits sont **contrôlés côté serveur** : un niveau 2 ne peut rien enregistrer, même en essayant de contourner l'écran.
- Un **compte technique** (maintenance) existe en coulisse : il est **caché**, n'apparaît dans aucune liste et n'est pas modifiable.

---

## 2. Où trouver les fonctions d'intendance

- **Panneau d'administration** : bouton **roue crantée ⚙️** en **haut à droite** des écrans (visible uniquement pour les admins). Il ouvre la gestion des **utilisatrices**, des **invités** et des **paramètres** du foyer.
- **Espace intendance (repas)** : sur l'onglet 🍴 **Repas de la semaine**, un bloc **« Espace intendance »** est affiché **tout en haut**. Il donne accès aux **inscriptions & comptabilité** et au **paramétrage des repas**.
- **Présences au foyer (vue staff)** : via l'onglet 🧍 **Présence foyer** → bouton **« Voir les présences »**.

---

## 3. Gérer les utilisatrices

Panneau ⚙️ **Administration** → onglet **Utilisatrices** :

- **Régler le niveau** d'une résidente : colonne **Niveau**, menu déroulant (Résidente · Admin lecture · Admin édition · Super-admin). Réservé au **super-admin** ; pour les autres admins, le niveau s'affiche en simple badge non modifiable. On ne peut pas régler **son propre** niveau.
- **Supprimer** un compte : action **irréversible**, réservée au **super-admin (niveau 4)** — trop dangereuse pour l'édition courante. (Pour libérer une place sans perdre l'historique, préférer l'**archivage** dans l'onglet Chambres.)
- Le compte **technique** (caché) n'apparaît pas dans la liste et ne peut être ni modifié ni supprimé.

---

## 3 bis. Chambres, postes & invitations (comptes résidentes)

Panneau ⚙️ **Administration** → onglet **Chambres**. C'est ici qu'on gère les **places** et les **comptes résidentes**. Principe : **une chambre = une place = un compte**. Les résidentes **ne s'inscrivent plus elles-mêmes** — elles sont **invitées** par l'intendance.

**Le référentiel des places**
- Résidences **12 / 36** → des **chambres** (regroupées par étage). Corail → des **postes** (prestataires : Cuisine, Ménage… ; libellé libre, sans chambre).
- **Ajouter / modifier / désactiver** une place (un seul champ « Nom » ; le reste est automatique). L'ajout est rare : les chambres sont normalement déjà toutes là.
- État de chaque place : **Libre**, **Occupée · Nom Prénom**, ou **Invitation envoyée · email**.

**Inviter une résidente**
1. Sur une place **libre**, clique **« Inviter »**.
2. Deux possibilités :
   - **Nouvelle personne** : saisis son **email** → elle reçoit un email d'activation.
   - **Ancienne résidente** (déjà eu un compte) : choisis-la dans la liste **« Réassigner une ancienne résidente »** → son compte est **réactivé et réassigné sans nouvel email**.
3. Elle définit son mot de passe et complète son profil (résidence/chambre **imposées**) ; la place passe à **« Occupée »**.
- Une invitation en attente peut être **relancée** (↻) ou **annulée** (✕).

> Inviter un email qui a **déjà** un compte le **réactive et le réassigne** automatiquement (utile pour replacer une personne archivée).

**Départ d'une résidente** : bouton **« Libérer / archiver »** (⤴) sur sa place → le compte est **archivé** (il ne peut plus se connecter, mais son **historique de repas/présence est conservé** pour la compta) et la **place se libère** (réattribuable).

**Déménagement interne** : bouton **« Déplacer »** (⇄) → choisir une place libre de destination.

> Le compte **super-admin** (technique) n'occupe aucune place et n'apparaît pas dans les listes.

---

## 4. Gérer les invités

Panneau ⚙️ **Administration** → onglet **Invités** : consulter et gérer les comptes invités (comptes simplifiés). Les **invitées** conservent l'**inscription libre** (« Inscription invitée » sur l'écran de connexion) — elles n'occupent pas de place.

---

## 5. Paramètres du foyer

Panneau ⚙️ **Administration** → onglet **Paramètres** :

| Paramètre | Effet | Défaut |
|---|---|---|
| `verrouillage_repas` | Heure après laquelle les repas **du jour** ne sont plus modifiables (réglable ; voir §6) | 21:00 |
| `verrouillage_weekend` | Verrouille les repas du week-end dès le vendredi | selon réglage |
| `verrouillage_foyer` | *(Hérité)* Heure de verrouillage de la présence foyer | 23:00 |

> Avec le modèle d'absences par **séjours**, le verrouillage foyer n'est **pas appliqué** : les résidentes peuvent ajouter/modifier/supprimer une absence à tout moment. L'opportunité d'un verrou de dernière minute reste à trancher.

---

## 6. Paramétrer les repas

Accès : onglet 🍴 **Repas de la semaine** → **Espace intendance** → **Paramétrer les repas**. L'écran comporte deux parties.

### 6.1. Catalogue d'options
La liste des **options** que le foyer peut proposer (ex. « Repas classique », « Apéro dînatoire », « Pique-nique »). Pour chaque option :

- **Libellé** (ce que voit la résidente) ;
- **Résidence de rattachement** : **12**, **36**, ou **« Résidence de la personne »** (le couvert est alors compté dans la résidence de l'inscrite) — c'est ce qui détermine à quelle résidence le repas est **facturé** ;
- **Délai (jours avant)** : `0` = clôture **le jour même** à l'heure de verrouillage ; `+1` par jour d'avance (ex. un pique-nique en `1` ferme **la veille**) ;
- **Réservée à l'intendance** : l'option n'apparaît qu'aux admins ;
- **Active / inactive** : une option inactive n'est jamais proposée (sans être supprimée).

### 6.2. Ouverture des services
C'est ici qu'on décide, **jour par jour et par service** (déjeuner / dîner), **quelles options sont proposées** aux résidentes. Un service **sans aucune option ouverte** s'affiche **« fermé »** côté résidente.

- **Dupliquer sur une plage** : reporter les options d'un jour sur plusieurs dates en une fois (sélecteur multi-dates), pour ouvrir toute une semaine rapidement.

> ⚠️ **À faire régulièrement** : sans options créées **et** de services ouverts, les résidentes voient « Service fermé » et ne peuvent pas s'inscrire.

---

## 7. Présences au foyer (vue staff)

Via l'onglet 🧍 **Présence foyer** → **« Voir les présences »**. Elle indique **qui est au foyer ou sorti**, **par résidence**, déduit des **séjours d'absence**.

**Choisir la période** : deux champs de date en haut (par défaut une semaine à partir d'aujourd'hui).

**Lire les jours** : les jours sont **empilés**. Pour chaque jour et chaque résidence, deux compteurs — **Au foyer** (vert) et **Sorties** (rouge). **Chaque nombre est cliquable** : il ouvre la **liste des personnes** derrière ce nombre.

**Vue d'ensemble** : le bouton **« Voir le détail »** ouvre un **tableau** — en lignes les habitantes (classées **résidence → étage → chambre → nom**, invitées en fin de résidence), en colonnes les jours, chaque case indiquant **P** (au foyer) ou **A** (sortie). *Cette structure de tableau est réutilisée partout (présences, repas) pour ne pas se perdre.*

**Marquer une absence ou une présence** : bouton **« Ajouter une absence »**.
1. Choisis la **résidence**, puis la **personne** (résidente ou invitée à compte).
2. Choisis **« Absente »** (crée un séjour) ou **« Présente »** (retire les absences déjà déclarées sur la période — pour corriger ou faire revenir quelqu'un).
3. Renseigne la **période** et, pour une absence, un **contact** facultatif.
4. Valide.

---

## 8. Inscriptions aux repas & comptabilité

Accès : **Espace intendance** → **Voir les inscriptions & la compta**. Deux onglets, sur une **période choisie** (sélecteur de dates en haut).

### Onglet « Organisation » — repas à préparer
Les jours sont **empilés** ; pour chaque jour et chaque résidence, les **options ouvertes** au midi et au soir, avec leur nombre d'inscrits. **Chaque option est cliquable** → la **liste des personnes comptées**. Les **invités** ne forment plus une tuile à part : chacun est compté **dans l'option** à laquelle il est rattaché et apparaît dans cette liste, annoté **« invité par Prénom Nom »**.

> **Édition (niveau ≥ 3).** Dans cette liste, une admin **édition** peut corriger les inscriptions, même après l'heure de verrouillage : **changer l'option** de chaque inscrit (ou la passer à **« Non »**), **ajouter une résidente** (déplacée automatiquement si elle était inscrite ailleurs pour ce service), et **ajouter / retirer un invité** — au choix **depuis le carnet** (invité déjà connu) ou **nouveau** — en indiquant la **résidente qui invite** (pour la comptabilité). Tout se reporte aussitôt sur le **détail** et la **compta**. En **niveau 2**, la liste reste en **lecture seule**. Le bouton **« Voir le détail »** ouvre le **tableau** (habitantes × jours/service ; chaque case = l'option choisie, ou 🌙 **lune orange** = absente, ou **Non** en rouge = ne mange pas). Un invité y apparaît en **petit badge « +👤 Prénom »** dans la case de la personne qui l'a invité (jamais de ligne à part).

### Onglet « Comptabilité »
- **Récapitulatif de la période** : total déjeuners / dîners **par résidence**, et un **grand total**.
- **Agrégat par personne** : pour chaque personne, nombre de déjeuners et de dîners (les « Non » et les jours d'absence ne comptent pas), **invités inclus** pour la personne qui les a invités. **Toutes les résidentes** apparaissent, même celles inscrites à rien (0). La liste est triée **par nom puis prénom** pour faciliter la facturation.

> **Déduction des absences** : un séjour d'absence retire automatiquement les repas des **jours intérieurs** ; le **premier** et le **dernier** jour restent au libre choix de la résidente (elle part après le dîner, revient avant le déjeuner).

---

## 9. Événements & calendrier

Depuis le calendrier, une administratrice peut **créer, modifier et supprimer** des événements :
- titre, dates (une ou plusieurs), horaires, lieu (résidence·s), couleur ;
- **visibilité par noms** : après avoir ciblé une ou des **résidences / étages**, la liste des **résidentes concernées** s'affiche, pré-cochée ; on peut **décocher** individuellement pour exclure quelqu'un. Le ciblage est **dynamique** (les futures arrivantes correspondant au filtre sont incluses automatiquement). Une case **réservé admin** limite la visibilité à l'intendance ;
- **rappel** (nombre de jours avant) ;
- demande de **confirmation de participation** (avec vue des confirmations reçues).

---

## 10. Espace Administratif (infos pratiques)

L'onglet 📖 **Administratif** (barre du bas) est **consultable par toutes** mais **modifiable par les admins** (bouton **« Modifier »**). On y gère des **rubriques libres** :

- **Ajouter / renommer / réordonner / supprimer** des rubriques ;
- rubrique **texte** (éditeur de mise en forme : gras, listes, titres, liens) ou rubrique **Contacts** structurés (nom, rôle, téléphone, email cliquables) ;
- une rubrique peut être **réservée aux administratrices** (🔒) : elle n'est alors **pas visible** par les résidentes (ex. le présent mode d'emploi).

Utilise-le pour le **règlement**, les **horaires**, les **contacts**, les **modes d'emploi** et toute information générale du foyer.

---

*Ce document accompagne le déploiement de l'application dans de nouveaux foyers. Le tenir à jour à chaque évolution fonctionnelle.*
