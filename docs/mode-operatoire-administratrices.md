# Mode opératoire — Administratrices (intendance)

> **Document vivant** — guide d'utilisation de l'application *Les Écoles* pour l'**intendance** (administratrices). À mettre à jour à chaque évolution de l'appli.
> Version 1.1 — 2026-07-06.

Une administratrice est une résidente dont le compte a le statut **admin**. Elle dispose, **en plus** de toutes les fonctions d'une habitante (voir [Mode opératoire — Résidentes & invitées](mode-operatoire-residentes.md)), d'outils d'intendance : le **panneau d'administration**, le **paramétrage des repas**, la **comptabilité**, la **vue des présences** et la **gestion des événements**.

---

## 1. Devenir / nommer une administratrice

Le statut admin se donne depuis la **gestion des utilisatrices** (voir §3). La première administratrice est créée à l'installation du foyer (super-admin).

---

## 2. Où trouver les fonctions d'intendance

- **Panneau d'administration** : bouton **roue crantée ⚙️** en **haut à droite** des écrans (visible uniquement pour les admins). Il ouvre la gestion des **utilisatrices**, des **invités** et des **paramètres** du foyer.
- **Espace intendance (repas)** : sur l'onglet 🍴 **Repas de la semaine**, un bloc **« Espace intendance »** est affiché **tout en haut**. Il donne accès aux **inscriptions & comptabilité**, au **paramétrage des repas**, et à la **compta historique** (données d'avant la refonte).
- **Présences au foyer (vue staff)** : via l'onglet 🧍 **Présence foyer** → bouton **« Voir les présences »**.

---

## 3. Gérer les utilisatrices

Panneau ⚙️ **Administration** → onglet **Utilisatrices** :

- **Promouvoir / révoquer** une administratrice : bouton dédié sur la ligne de la personne.
- **Supprimer** un compte : action de suppression (avec confirmation). À utiliser avec précaution.
- Le compte **super-admin** ne peut pas être rétrogradé/supprimé par les autres.

---

## 3 bis. Chambres, postes & invitations (comptes résidentes)

Panneau ⚙️ **Administration** → onglet **Chambres**. C'est ici qu'on gère les **places** et les **comptes résidentes**. Principe : **une chambre = une place = un compte**. Les résidentes **ne s'inscrivent plus elles-mêmes** — elles sont **invitées** par l'intendance.

**Le référentiel des places**
- Résidences **12 / 36** → des **chambres** (regroupées par étage). Corail → des **postes** (prestataires : Cuisine, Ménage… ; libellé libre, sans chambre).
- **Ajouter / modifier / désactiver** une place (un seul champ « Nom » ; le reste est automatique). L'ajout est rare : les chambres sont normalement déjà toutes là.
- État de chaque place : **Libre**, **Occupée · Nom Prénom**, ou **Invitation envoyée · email**.

**Inviter une résidente**
1. Sur une place **libre**, clique **« Inviter »** et saisis l'**email**.
2. La résidente reçoit un email ; elle définit son mot de passe et complète son profil (résidence/chambre **imposées**).
3. La place passe à **« Occupée »**.
- Une invitation en attente peut être **relancée** (↻) ou **annulée** (✕).

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
Les jours sont **empilés** ; pour chaque jour et chaque résidence, le nombre de **midis** et de **soirs**. **Chaque nombre est cliquable** → la **liste des personnes comptées** (avec l'option choisie). Le bouton **« Voir le détail »** ouvre le **tableau** (habitantes × jours/service ; chaque case = l'option choisie, ou 🌙 **lune orange** = absente, ou **Non** en rouge = ne mange pas).

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
