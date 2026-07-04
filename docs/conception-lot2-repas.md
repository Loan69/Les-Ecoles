# Conception — Lot 2 : refonte des repas & comptabilité

> **Document de travail à challenger** (pas une spec figée). Objectif : verrouiller le modèle **avant** d'écrire du code, car ce lot touche la **comptabilité** (zéro bug toléré).
> Statut : 🟡 proposition · Version 0.1 — 2026-06-29.
> Les points notés **🟣 À VALIDER CLIENT** doivent être tranchés en réunion ; les **❓ Questions ouvertes** sont des arbitrages techniques/produit.

---

## 1. Pourquoi ce lot

Le système actuel a trois faiblesses structurelles :
- **Deux modèles en parallèle** : options par défaut (`select_options_repas`) **+** règles spéciales à plages de dates (`special_meal_options`) qui se chevauchent et se résolvent « la plus récente gagne » (`R-OPT-08`, la règle la plus fragile).
- **Valeurs en dur** : le pique-nique est reconnu par les chaînes `pn_chaud`/`pn_froid`, le plateau par `plateau`. Tout repose sur du texte (`R-LOCK-05/06`, `R-COMPTA-03`).
- **Encodage fragile** : `special:residence:label` dans `choix_repas` casse si un label contient `:` ; et un vestige `choix === "1"` supprime l'inscription (risque sur l'option d'`id` 1).

**Objectif** : un modèle **unique, explicite et fiable**, où l'intendance compose les menus jour par jour facilement, et où la compta découle proprement des données.

---

## 2. Principe directeur

> **Un menu = la liste des choix proposés pour un (jour, service, résidence).**
> L'intendance compose les menus ; la résidente choisit **dans** le menu ; la compta agrège les choix. Plus de « défauts vs spéciaux » : **un seul concept de menu**.

🟣 **À VALIDER CLIENT** — « plus de défauts » ne veut pas dire « tout retaper chaque jour ». On prévoit **modèles + duplication + application sur une plage** pour que ce soit utilisable (voir §5). À confirmer que c'est bien l'attente.

---

## 3. Modèle de données proposé

### 3.1 Catalogue d'options réutilisables — `meal_options`
Une option = un choix possible, réutilisable d'un menu à l'autre.

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid | — |
| `label` | text | ex. « Repas classique », « Plateau », « Pique-nique chaud », « Apéro dînatoire » |
| `type` | enum | **`normal` · `plateau` · `pique_nique`** (le type pilote la logique métier) |
| `is_active` | bool | option encore proposable |
| `admin_only` | bool | réservée à l'intendance |

> Le type **remplace les valeurs en dur**. Fini `pn_chaud` reconnu par son texte : une option « Pique-nique froid » a `type = pique_nique`, point.
> **« Non »** (ne mange pas) n'est **pas** une option du catalogue : c'est l'**absence d'inscription** (voir §3.3).

### 3.2 Le menu du jour — `menus` + `menu_options`
`menus` : un menu par **(date, service, résidence)**.

| Colonne | Type |
|---|---|
| `id` | uuid |
| `date` | date |
| `service` | enum `dejeuner` \| `diner` |
| `residence` | text (`12` / `36`) |
| `updated_at` | timestamptz |

Contrainte d'unicité : `(date, service, residence)`.

`menu_options` : les options proposées dans ce menu (relation N-N).

| Colonne | Type |
|---|---|
| `menu_id` | uuid (fk `menus`) |
| `option_id` | uuid (fk `meal_options`) |
| `position` | int (ordre d'affichage) |

> Avantage : **plus de chevauchement, plus de “latest wins”**. Pour un jour/service/résidence donné, il y a **un** menu, déterministe.

### 3.3 Les inscriptions — `presences` (refonte)
On référence l'**option par son id** (stable), plus de chaîne `choix_repas`.

| Colonne | Type | Rôle |
|---|---|---|
| `user_id` | uuid | qui |
| `date` | date | — |
| `service` | enum | dejeuner / diner |
| `option_id` | uuid (fk `meal_options`) | le choix |
| `commentaire` | text | optionnel |

**Convention « Non »** : ❓ **Question ouverte** — soit *absence de ligne* = « Non » (simple, mais on perd la trace d'un « Non » explicite), soit une ligne avec `option_id = null` = « Non assumé ». Je penche pour **absence de ligne = Non** (comportement actuel), plus léger.

### 3.4 Couplage absences → repas (réalise `R-FOYER-09`)
On complète `absences_sejour` avec le **détail des jours-frontières** :

| Colonne ajoutée | Type | Défaut |
|---|---|---|
| `depart_dejeuner` | bool | true |
| `depart_diner` | bool | false |
| `retour_dejeuner` | bool | false |
| `retour_diner` | bool | true |

Règle : pendant un séjour `[début..fin]`, **les jours intérieurs `[début+1 .. fin-1]` = « Non » aux deux services** ; les jours **début** et **fin** suivent les cases ci-dessus.

❓ **Question ouverte (archi)** : ces « Non » d'absence, on les **déduit** (la compta lit `absences_sejour`) ou on les **matérialise** dans `presences` ? On avait acté **déduire** (absence = source de vérité, pas de doublon, pas d'écrasement du choix d'origine). Je confirme cette voie ; conséquence : la **compta** et l'**écran d'inscription** doivent intégrer la déduction (un jour d'absence s'affiche « Non — absente », verrouillé).

---

## 4. Règles métier qui changent

| Règle | Avant | Après |
|---|---|---|
| `R-OPT-08` (latest wins) | conflits de règles spéciales | **supprimée** — un seul menu par jour/service/résidence |
| `R-LOCK-05/06` (pique-nique) | détecté par `pn_*` | détecté par `type = pique_nique` |
| `R-COMPTA-03` (P.N. la veille) | idem | inchangé sur le fond, basé sur le **type** |
| `R-COMPTA-04` (rattachement résidence) | plateau → résidence de la personne | inchangé, basé sur le **type** |
| `R-FOYER-09` (absence → repas) | reporté | **implémenté** (déduction, jours-frontières) |

🟣 **À VALIDER CLIENT** : avec un menu par résidence, **plateau** garde-t-il le sens « rattaché à la résidence de la personne » (`R-COMPTA-04`) ou devient-il une option du menu de la résidence ?

---

## 5. Composition des menus (l'ergonomie, sinon inutilisable)

L'écran d'intendance doit offrir :
- **Éditer un menu** (date, service, résidence) : cocher les options du catalogue.
- **Dupliquer** un menu vers d'autres jours / une plage de dates / l'autre résidence.
- **Modèles** (`menu_templates`) : un jeu d'options nommé (« Semaine type », « Dimanche »), applicable sur une plage.
- **Saisie en masse** : appliquer un modèle sur `[date début → date fin]` × résidences en une fois.

🟣 **À VALIDER CLIENT** — **menu par défaut / récurrent** : que se passe-t-il pour un jour **sans menu défini** ? Trois options :
1. **Pas de menu = pas d'inscription possible** (l'intendance doit tout définir — risqué).
2. **Menu récurrent par défaut** (ex. « Semaine type ») appliqué automatiquement tant qu'aucun menu spécifique n'existe — *recommandé* (contrôle + zéro saisie quotidienne).
3. Un menu « classique » minimal en dur.

> C'est **la** décision la plus structurante du lot. Ma reco : **option 2**.

---

## 6. Modification d'un menu déjà choisi (réinitialisation)

Quand l'intendance retire/modifie une option d'un menu sur lequel des résidentes se sont déjà inscrites :

🟣 **À VALIDER CLIENT** — politique parmi :
- **A.** Menu **verrouillé** dès qu'il y a des inscriptions (pas de modif).
- **B.** Modif autorisée → les choix devenus **invalides repassent à « Non »** + notification aux concernées — *recommandé* (souple, traçable).
- **C.** On conserve les choix historiques même si l'option disparaît (risque d'incohérence compta).

---

## 7. Comptabilité (refonte)

Pour une période, par **(jour, résidence, service)** : agrégats par **type d'option** (normal / plateau / pique-nique) + détail des options nommées, **total jour**, **total période par résidence**, **grand total**. Règles conservées : pique-nique compté **la veille** (`R-COMPTA-03`), plateau rattaché à la résidence de la personne (`R-COMPTA-04`), invités inclus (`R-COMPTA-06`), absences déduites en « Non ».

Au passage : suppression du vestige `choix === "1"` et de l'encodage `special:residence:label`.

---

## 8. Migration (one-shot)

À faire le jour du déploiement :
1. Créer le **catalogue** `meal_options` à partir des `select_options_repas` + options des `special_meal_options` (dédoublonnées), en leur affectant un **type**.
2. Générer les **menus** : ❓ soit on part « page blanche » à partir d'une date de bascule (l'intendance compose), soit on reconstitue les menus passés depuis l'historique (lourd). Reco : **bascule à une date** (pas de réécriture du passé), la compta passée reste lisible via l'ancien format en lecture seule si besoin.
3. Migrer `presences` vers le référencement par `option_id`.

---

## 9. Découpage de mise en œuvre (après validation)

1. **S1** : figer ce doc (modèle, types, règles §5/§6). ← on est ici
2. **S2–S3** : schéma BDD + catalogue + éditeur de menus + duplication/modèles + migration.
3. **S3–S4** : écran de sélection résidente branché sur le nouveau modèle.
4. **S4–S5** : refonte compta + déduction des absences + réinit des choix invalides.
5. **S5–S6** : tests sur jeu de données + session de test client.

---

## 10. Récap des décisions à trancher

| # | Décision | Type | Reco |
|---|---|---|---|
| 1 | Modèle « un menu par jour/service/résidence » | 🟣 client | oui |
| 2 | Menu par défaut récurrent pour les jours non définis (§5) | 🟣 client | option 2 |
| 3 | Politique de modif d'un menu déjà choisi (§6) | 🟣 client | option B |
| 4 | Sens de « plateau » avec menus par résidence (§4) | 🟣 client | rattaché à la personne |
| 5 | Absences : déduire vs matérialiser (§3.4) | ❓ archi | déduire |
| 6 | « Non » : absence de ligne vs ligne explicite (§3.3) | ❓ archi | absence de ligne |
| 7 | Migration : bascule à une date vs reconstituer le passé (§8) | ❓ archi | bascule |
