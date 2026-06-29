# Mode opératoire — Administratrices (intendance)

> **Document vivant** — guide d'utilisation de l'application *Les Écoles* pour l'**intendance** (administratrices). À mettre à jour à chaque évolution de l'appli.
> Version 1.0 — 2026-06-29.

Une administratrice est une résidente dont le compte a le statut **admin**. Elle dispose, **en plus** de toutes les fonctions d'une habitante (voir [Mode opératoire — Résidentes & invitées](mode-operatoire-residentes.md)), d'un **panneau d'administration** accessible depuis l'onglet ⚙️ **Administration** de la barre du bas.

---

## 1. Devenir / nommer une administratrice

Le statut admin se donne depuis la **gestion des utilisatrices** (voir §3). La première administratrice est créée à l'installation du foyer (super-admin).

---

## 2. Vue d'ensemble — l'onglet Administration

L'écran **Administration** regroupe :
- la **gestion des utilisatrices** (résidentes & admins) ;
- la **gestion des invitées** ;
- les **repas spéciaux** (menus particuliers sur certaines dates) ;
- les **paramètres** du foyer (heures de verrouillage).

S'y ajoutent deux vues dédiées :
- **Présences au foyer** (qui dort là / est sortie) — accessible aussi via l'onglet 🛏️ *Présence foyer* → bouton **« Voir les présences »** ;
- **Inscriptions aux repas & comptabilité**.

> Depuis l'**onglet 🍴 Repas de la semaine**, un bloc **« Espace intendance »** (replié) regroupe l'accès aux **inscriptions/comptabilité** et au **paramétrage des repas** (menus spéciaux). C'est le point d'entrée unique pour tout ce qui touche aux repas.

---

## 3. Gérer les utilisatrices

- **Promouvoir / révoquer** une administratrice : bouton dédié sur la ligne de la personne.
- **Supprimer** un compte : action de suppression (avec confirmation). À utiliser avec précaution.
- Le compte **super-admin** ne peut pas être rétrogradé/supprimé par les autres.

---

## 4. Gérer les invitées

Depuis le tableau des invitées : consulter et gérer les comptes invités (comptes simplifiés).

---

## 5. Repas spéciaux (menus particuliers)

Les **options de repas par défaut** (oui / non / plateau / pique-nique…) peuvent être **remplacées** sur une plage de dates par des **options spéciales** (ex. « buffet », « repas de fête »).

> Accès : onglet 🍴 **Repas de la semaine** → **Espace intendance** → **Paramétrer les repas**.

1. Ouvre le gestionnaire de repas spéciaux.
2. Crée une règle : service (déjeuner / dîner), période (dates de début/fin, ou indéfini), liste des options proposées, éventuelle réservation aux admins.
3. En cas de chevauchement de règles, **la plus récente s'applique**.

> *Évolution prévue (Lot 2) : refonte complète de la composition des menus, jour par jour, par l'intendance, avec saisie en masse par calendrier.*

---

## 6. Paramètres du foyer

| Paramètre | Effet | Défaut |
|---|---|---|
| `verrouillage_repas` | Heure après laquelle les repas du jour ne sont plus modifiables | 21:00 |
| `verrouillage_foyer` | Heure de verrouillage de la présence foyer du jour | 23:00 |
| `verrouillage_weekend` | Verrouille les repas du week-end dès le vendredi | selon réglage |

> Note : avec le nouveau modèle d'absences par **séjours**, l'application du verrouillage foyer est **en cours de redéfinition** (voir *Décisions en attente* dans les spécifications).

---

## 7. Présences au foyer (vue staff)

Accessible via l'onglet 🛏️ *Présence foyer* → **« Voir les présences »** (ou directement la vue admin foyer). Elle indique **qui est au foyer ou sorti**, **par résidence**, déduit des **séjours d'absence**.

**Choisir la période** : deux champs de date en haut (« Du … au … » ; par défaut une semaine à partir d'aujourd'hui).

**Lire les cartes** : une carte par jour ; pour chaque résidence, deux compteurs — **Au foyer** (vert) et **Sorties** (rouge). La **loupe 🔍** d'une résidence ouvre le **détail** : la liste des habitantes de la résidence pour ce jour, avec leur statut (au foyer / sortie) et une recherche par nom.

**Marquer une absence ou une présence** : bouton **« Ajouter une absence »**.
1. Choisis la **résidence**, puis la **personne** (résidente ou invitée à compte).
2. Choisis **« Absente »** (crée un séjour d'absence) ou **« Présente »** (retire les absences déjà déclarées sur la période — pour corriger ou faire revenir quelqu'un).
3. Renseigne la **période** (date de début / de fin) et, pour une absence, un **contact** facultatif.
4. Valide.

> *À venir (Lot 2) : option « Marquer N/O » pour répercuter l'absence sur les repas (déjeuner/dîner) de l'intervalle.*

---

## 8. Inscriptions aux repas & comptabilité

L'écran propose deux onglets, sur une **période choisie** (par défaut une semaine à partir de la date sélectionnée — sélecteur de dates en haut) :

### Onglet « Inscriptions » — planning hebdomadaire
Pour chaque jour et chaque résidence : nombre de **midis**, **soirs**, **pique-niques** (comptés la **veille** de leur consommation), **plateaux** et **options spéciales**, plus un **total par jour**. La **loupe 🔍** ouvre le détail **personne par personne** (repas choisi + commentaire), invités compris.

### Onglet « Comptabilité »
- **Récapitulatif de la période** : total déjeuners / dîners / total **par résidence**, et un **grand total** toutes résidences.
- **Détail par résidence** : pour chaque personne, nombre de déjeuners et de dîners (les « Non » ne comptent pas), **invités inclus** pour la personne qui les a invités.

---

## 9. Événements & calendrier

Depuis le calendrier, une administratrice peut **créer, modifier et supprimer** des événements :
- titre, dates (une ou plusieurs), horaires, lieu (résidence·s) ;
- **visibilité** (toutes, ou ciblée par résidence / étage / chambre ; réservé admin) ;
- **rappel** (nombre de jours avant) ;
- demande de **confirmation de participation** (avec vue des confirmations reçues).

---

*Ce document accompagne le déploiement de l'application dans de nouveaux foyers. Le tenir à jour à chaque évolution fonctionnelle.*
