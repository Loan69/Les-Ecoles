# Conception — Lot 2 : refonte des repas & comptabilité

> **Document de travail** — on fige le modèle **avant** de coder (ce lot touche la comptabilité : zéro bug toléré).
> Statut : 🟢 v0.3 — 2026-07-04. **Schéma figé** (tous les arbitrages tranchés). Prêt à coder.
> **🟣 À VALIDER CLIENT** = à trancher en réunion ; **❓ Question ouverte** = arbitrage restant.

---

## 1. Pourquoi ce lot

Le système actuel a trois faiblesses :
- **Deux modèles en parallèle** : options par défaut (`select_options_repas`) **+** règles spéciales à plages (`special_meal_options`) qui se chevauchent et se résolvent « la plus récente gagne » (`R-OPT-08`, la règle la plus fragile).
- **Valeurs en dur** : `plateau`, `pn_chaud`/`pn_froid`, `12`/`36` reconnues par leur texte (`R-LOCK-05/06`, `R-COMPTA-03/04`).
- **Encodage fragile** : `special:residence:label` dans `choix_repas` (casse si le label contient `:`) ; vestige `choix === "1"` qui supprime l'inscription.

---

## 2. Principe directeur (révisé)

> L'intendance ne compose **pas** de menus détaillés. Elle définit, **par (jour, service)**, la **liste des options** proposées — ex. **« Oui au 12 »**, **« Oui au 36 »**, **« Apéro dînatoire »**. 
> **Les mêmes options sont proposées à toutes les résidentes** (sauf options réservées à l'intendance). La résidente choisit **une** option (ou « Non ») ; la comptabilité agrège par option.

Conséquences directes des arbitrages :
- **Pas de dimension « résidence » sur la liste d'options** : une seule liste par (jour, service).
- **Plus de types en dur** : « plateau » et « pique-nique » ne sont plus des concepts spéciaux — juste des options si l'intendance en crée.
- **Zéro automatisation subie** : si aucune option n'est saisie pour un (jour, service), **ce service est fermé** ce jour-là (rien à saisir, tout le monde compte « Non »).

---

## 3. Modèle de données proposé

### 3.1 Catalogue d'options réutilisables — `meal_options`
| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid | — |
| `label` | text | ce que voit la résidente (ex. « Oui au 12 », « Apéro dînatoire ») |
| `residence` | text (**non null**) | rattachement **pour la compta** : « 12 », « 36 », ou « **personne** » (= résidence de l'inscrite qui choisit l'option, ex. pique-nique) |
| `delai_commande` | int (défaut 0) | nombre de **jours avant** la consommation où l'option doit être commandée (ex. pique-nique = 1) ; 0 = jour même |
| `admin_only` | bool | réservée à l'intendance |
| `is_active` | bool | encore proposable |

> Fini `type` (plateau/pique-nique) et les valeurs en dur : une option est **juste un libellé + une résidence de compta + un éventuel délai de commande**.

### 3.2 Options ouvertes par service — `meal_service_options`
La liste des options proposées un jour, pour un service (**identique pour toutes les résidentes**).

| Colonne | Type |
|---|---|
| `id` | uuid |
| `date` | date |
| `service` | enum `dejeuner` \| `diner` |
| `option_id` | uuid (fk `meal_options`) |
| `position` | int (ordre d'affichage) |

Unicité : `(date, service, option_id)`. **Aucune ligne pour un (date, service) ⇒ service fermé.**

### 3.3 Inscriptions — `presences` (refonte)
| Colonne | Type | Rôle |
|---|---|---|
| `user_id` | uuid | qui |
| `date` | date | — |
| `service` | enum | dejeuner / diner |
| `option_id` | uuid (fk `meal_options`) | le choix |
| `commentaire` | text \| null | optionnel |

**« Non »** = **absence de ligne** (par défaut, on ne mange pas). On référence l'**option par id** (fini les chaînes fragiles).

### 3.4 Couplage absences → repas (`R-FOYER-09`)
On complète `absences_sejour` avec le détail des jours-frontières : `depart_dejeuner`, `depart_diner`, `retour_dejeuner`, `retour_diner` (bool). Les jours **intérieurs** d'un séjour = « Non » aux deux services ; les jours **début/fin** suivent ces cases. Les « Non » d'absence sont **déduits** (l'absence reste la source de vérité), pas dupliqués.

---

## 4. Comptabilité & rattachement résidence

Pour une période, par **(jour, résidence, service)** : nombre d'inscriptions **par option** (le libellé parle : « Oui au 12 », « Apéro dînatoire »…), total jour, total période par résidence, grand total. Absences déduites en « Non ». Invités inclus (`R-COMPTA-06`).

**Rattachement d'une inscription à une résidence** : donné par la `residence` de l'option choisie — **« 12 » / « 36 »** (fixe) ou **« personne »** → la **résidence de l'inscrite** (résolue via `presences_v2.user_id → residentes.residence`).

---

## 5. Saisie des options par l'intendance (efficace, mais jamais automatique)

L'intendance ne saisira pas chaque jour à la main → il faut des outils de **saisie en masse**, mais **toujours déclenchés par un·e admin** (jamais de valeur par défaut appliquée toute seule) :
- **Éditer** les options d'un (jour, service) : cocher des options du catalogue.
- **Dupliquer** les options d'un jour vers d'autres jours / une **plage de dates**.
- **Modèles** réutilisables (« Semaine type ») **appliqués à la demande** sur une plage.

> ⚠️ Différence clé avec la v0.1 : **pas de « menu par défaut récurrent »**. Un jour non préparé reste fermé tant que l'intendance ne l'a pas ouvert. (Décision Loan : garder la main.)

---

## 6. Modification d'une option déjà choisie

Décision : **option B**. Si l'intendance retire une option d'un (jour, service) déjà choisie par des résidentes, les inscriptions devenues **invalides repassent à « Non »**.
Notification aux concernées : **à étudier plus tard** — probablement via un **système de notifications centralisé** (façon fil de notifs Facebook/LinkedIn), hors périmètre immédiat.

---

## 7. Règles impactées

| Règle | Sort |
|---|---|
| `R-OPT-08` (latest wins) | **supprimée** — une seule liste d'options par (jour, service) |
| `R-COMPTA-04` (rattachement plateau) | **remplacée** — rattachement via `residence` de l'option (§4) |
| `R-LOCK-05/06` (pique-nique « la veille ») | **généralisées** via `delai_commande` : une option se verrouille `delai_commande` jour(s) avant la consommation (pique-nique = 1). Plus de valeur en dur. |
| `R-COMPTA-03` (compté la veille) | **simplifiée** : compté le **jour de consommation** ; une vue « à préparer » pourra lister les options à `delai_commande > 0` du lendemain (optionnel, plus tard). |
| `R-LOCK` verrouillage horaire du jour (`verrouillage_repas`) | **conservé** (borne « jour même ») |
| `R-FOYER-09` (absence → repas) | **implémenté** (déduction, jours-frontières) |

---

## 8. Migration (one-shot, au déploiement)

1. Créer le **catalogue** `meal_options` à partir de l'existant (`select_options_repas` + libellés des `special_meal_options`), en posant la `residence` quand c'est pertinent (« Oui au 12 » → 12).
2. **Bascule à une date** : on n'ouvre les services que **à partir d'une date de départ** (l'intendance saisit) ; on ne reconstitue pas le passé (la compta passée reste lisible via l'ancien format en lecture seule si besoin).
3. Migrer `presences` vers le référencement par `option_id`.

---

## 9. Découpage de mise en œuvre (après validation)

1. **S1** : figer ce doc (§11). ← on y est
2. **S2–S3** : schéma BDD + éditeur d'options (avec duplication / plage / modèles) + migration.
3. **S3–S4** : écran de sélection résidente branché sur le nouveau modèle (service fermé si aucune option).
4. **S4–S5** : refonte compta + déduction des absences + réinit des choix invalides.
5. **S5–S6** : tests sur jeu de données + session de test client.

---

## 10. Décisions déjà tranchées (par Loan)

| Sujet | Décision |
|---|---|
| Options, pas menus | ✅ oui — l'intendance saisit des **options** simples |
| Liste par résidence ? | ✅ **non** — mêmes options pour toutes (hors admin) |
| Types plateau / pique-nique en dur | ✅ **supprimés** — de simples options si besoin |
| Jour sans option | ✅ **service fermé** (aucun défaut auto) |
| Modif d'un choix existant | ✅ **option B** (repasse à « Non ») ; notif centralisée plus tard |
| Résidence de l'option | ✅ imposée à chaque option : **12 / 36 / « personne »** (= résidence de l'inscrite, ex. pique-nique) |
| Pique-nique « la veille » | ✅ **conservé mais généralisé** via `delai_commande` (jours avant) sur l'option |

---

## 11. Schéma figé — points mineurs restants (non bloquants)

Le modèle est **prêt à coder**. Restent, pour plus tard :
- Une valeur `residence = "toutes"` si une option doit compter dans les deux résidences (v2, à la demande).
- La **vue « à préparer »** (options à `delai_commande > 0` du lendemain) dans la compta — optionnelle.
- Le **système de notifications centralisé** (choix invalides, etc.) — hors périmètre Lot 2.
