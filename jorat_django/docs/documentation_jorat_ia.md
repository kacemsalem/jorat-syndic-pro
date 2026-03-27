# JORAT — Syndic Pro : Documentation IA Intelligente
## Guide destiné à un assistant IA pour répondre, guider et comprendre

> **Version** : 2.0 — Mars 2026
> **Usage** : RAG / Prompt IA — lecture directe par assistant
> **Technologie** : Django REST Framework + React 19
> **Base URL API** : `/api/`

---

# PARTIE 1 — GUIDE D'UTILISATION PAR ACTION

> Pour chaque action utilisateur : étapes, écran, API, résultat attendu.

---

## MODULE CONFIGURATION

---

### ACTION : Configurer la résidence

**Étapes utilisateur :**
1. Aller à : Menu → Résidence (sidebar) ou Tableau de bord → Résidence
2. Modifier les champs : nom, adresse, ville, code postal, email, logo, description
3. Cliquer sur **Enregistrer**

**Résultat attendu :** Les informations sont mises à jour et affichées sur le tableau de bord.

**Forms utilisés :**
- Form 02 — Résidence (`/residences`)

**API utilisées :**
- `GET /api/residences/` — Lire les infos actuelles
- `PATCH /api/residences/{id}/` — Sauvegarder les modifications

**Logique métier :**
- Une seule résidence par compte admin
- Le champ `statut_residence` est géré automatiquement (ACTIF/INACTIF)
- Le logo est uploadé comme fichier image

---

### ACTION : Créer un groupe de lots (bâtiment)

**Étapes utilisateur :**
1. Aller à : Sidebar → Configuration → Lots → onglet Groupes
2. Cliquer sur **+ Nouveau groupe**
3. Remplir : Nom du groupe (ex : "Bâtiment A"), description
4. Cliquer sur **Enregistrer**

**Résultat attendu :** Le groupe est créé et disponible lors de la création de lots.

**Forms utilisés :**
- Form 03 — Groupes de lots (`/groupes`)

**API utilisées :**
- `GET /api/groupes/` — Liste des groupes
- `POST /api/groupes/` — Créer un groupe
- `PATCH /api/groupes/{id}/` — Modifier
- `DELETE /api/groupes/{id}/` — Supprimer

**Logique métier :**
- Les groupes organisent uniquement l'affichage des lots
- L'ordre d'affichage est alphabétique par groupe, puis numérique par numéro de lot

---

### ACTION : Créer un lot

**Étapes utilisateur :**
1. Aller à : Sidebar → Configuration → Lots → bouton **+ Nouveau lot**
   *ou* Tableau de bord → Lots
2. Remplir : numéro de lot, groupe (obligatoire), surface (m²), quote-part (tantièmes)
3. Associer un propriétaire (optionnel)
4. Cliquer sur **Enregistrer**

**Résultat attendu :** Le lot apparaît dans le kanban, trié par groupe puis numéro.

**Forms utilisés :**
- Form 04 — Kanban Lots (`/kanban`)
- Form 05 — Détail Lot (`/lots/new` ou `/lots/:id`)

**API utilisées :**
- `POST /api/lots/` — Créer
- `GET /api/groupes/` — Liste des groupes pour le sélecteur
- `GET /api/personnes/` — Liste des propriétaires disponibles

**Logique métier :**
- Le lot doit obligatoirement être rattaché à un groupe existant
- La quote-part (tantièmes) détermine la répartition automatique des charges
- Le champ `statut_lot` est géré automatiquement (A_JOUR par défaut)

---

### ACTION : Associer un propriétaire à un lot

**Étapes utilisateur :**
1. Aller à : Kanban → cliquer sur le lot concerné
2. Dans le champ "Propriétaire", sélectionner ou créer une personne
3. Cliquer sur **Enregistrer**

**Résultat attendu :** Le nom du propriétaire apparaît sur la carte du lot dans le kanban.

**Forms utilisés :**
- Form 05 — Détail Lot
- Form 06 — Personnes (`/personnes`)

**API utilisées :**
- `PATCH /api/lots/{id}/` — Modifier le lot
- `GET /api/personnes/` — Chercher un propriétaire existant
- `POST /api/personnes/` — Créer un nouveau propriétaire

**Logique métier :**
- Une personne peut être propriétaire de plusieurs lots
- Le champ CIN (carte d'identité) est obligatoire pour créer une personne

---

### ACTION : Créer un appel de charge

**Étapes utilisateur :**
1. Aller à : Sidebar → Configuration → Appel de charge
   *ou* Tableau de bord → Appel de charge
2. Cliquer sur **+ Nouvel appel**
3. Remplir : exercice (année), description, date d'émission
4. Saisir le montant total ou par lot dans le détail
5. Cliquer sur **Enregistrer**

**Résultat attendu :** L'appel est créé avec une ligne par lot. Les montants sont répartis selon les tantièmes. Ces montants apparaissent comme "dû" dans le suivi paiements.

**Forms utilisés :**
- Form 07 — Appel de Charge (`/appels-charge?filtre=CHARGE`)

**API utilisées :**
- `POST /api/appels-charge/` — Créer l'appel (type_charge=CHARGE)
- `GET /api/details-appel/?appel={id}` — Voir les détails par lot
- `PATCH /api/details-appel/{id}/` — Modifier le montant d'un lot

**Logique métier :**
- La création d'un appel génère automatiquement une ligne par lot (DetailAppelCharge)
- Le montant est réparti proportionnellement à la quote-part de chaque lot
- Un appel de charge est pour les charges courantes (entretien, eau, gardien...)

---

### ACTION : Créer un appel de fond

**Étapes utilisateur :**
1. Aller à : Sidebar → Configuration → Appel de fond
   *ou* Tableau de bord → Appel de fond
2. Même procédure que l'appel de charge

**Résultat attendu :** Identique à l'appel de charge, mais pour les fonds spéciaux (travaux, réserves).

**Forms utilisés :**
- Form 08 — Appel de Fond (`/appels-charge?filtre=FOND`)

**API utilisées :**
- `POST /api/appels-charge/` — Créer (type_charge=FOND)
- Mêmes APIs que Form 07

**Logique métier :**
- Même mécanique que l'appel de charge
- Les paiements reçus sont affectés séparément (CHARGE vs FOND)
- Pour les travaux importants ou la constitution d'un fonds de réserve

---

## MODULE FINANCES

---

### ACTION : Enregistrer un paiement

**Étapes utilisateur :**
1. Aller à : Sidebar → Finances → Paiements
2. Cliquer sur **+ Nouveau paiement**
3. Remplir :
   - Lot (sélectionner dans la liste)
   - Montant
   - Date de paiement
   - Mode (Espèces / Virement / Chèque)
   - Mois de référence
   - Référence (optionnel)
4. Cliquer sur **Enregistrer**

**Résultat attendu :** Le paiement est enregistré. Un mouvement DÉBIT est créé automatiquement en caisse. Le statut du lot est mis à jour (À jour / Partiel / En retard).

**Forms utilisés :**
- Form 09 — Paiements (`/paiements`)

**API utilisées :**
- `POST /api/paiements/` — Créer le paiement
- `GET /api/lots/` — Liste des lots pour le sélecteur

**Logique métier :**
- Le paiement est affecté automatiquement aux échéances impayées les plus anciennes
- Si le montant dépasse les dettes actuelles, le surplus est reporté sur les périodes suivantes (carry-over)
- Chaque paiement crée automatiquement un mouvement de caisse de type DÉBIT (entrée d'argent)

---

### ACTION : Enregistrer une dépense

**Étapes utilisateur :**
1. Aller à : Sidebar → Finances → Dépenses
2. Cliquer sur **+ Nouvelle dépense**
3. Remplir :
   - Libellé
   - Famille de dépense
   - Fournisseur (optionnel)
   - Compte comptable
   - Montant
   - Date et mois d'imputation
   - Référence facture (optionnel)
4. Cliquer sur **Enregistrer**

**Résultat attendu :** La dépense est enregistrée. Un mouvement CRÉDIT (sortie) est créé automatiquement en caisse.

**Forms utilisés :**
- Form 10 — Dépenses (`/depenses`)

**API utilisées :**
- `POST /api/depenses/` — Créer
- `GET /api/familles-depense/` — Familles disponibles
- `GET /api/fournisseurs/` — Fournisseurs
- `GET /api/comptes-comptables/` — Comptes
- `GET /api/modeles-depense/` — Modèles (pré-remplissage)

**Logique métier :**
- Chaque dépense crée automatiquement un mouvement CRÉDIT en caisse (sortie d'argent)
- Les familles de dépense peuvent être créées directement depuis le formulaire
- Un modèle de dépense pré-remplit les champs pour les dépenses récurrentes

---

### ACTION : Enregistrer une recette diverse

**Étapes utilisateur :**
1. Aller à : Sidebar → Finances → Recettes
2. Cliquer sur **+ Nouvelle recette**
3. Remplir : libellé, montant, date, compte comptable, référence
4. Cliquer sur **Enregistrer**

**Résultat attendu :** La recette est enregistrée. Un mouvement DÉBIT (entrée) est créé en caisse.

**Forms utilisés :**
- Form 12 — Recettes (`/recettes`)

**API utilisées :**
- `POST /api/recettes/` — Créer
- `GET /api/comptes-comptables/` — Comptes

**Logique métier :**
- Pour les entrées d'argent qui ne sont pas des paiements de copropriétaires (location salle, pénalités, subventions...)
- Crée automatiquement un mouvement DÉBIT en caisse

---

### ACTION : Consulter la caisse

**Étapes utilisateur :**
1. Aller à : Sidebar → Finances → Caisse

**Résultat attendu :** Affiche le solde actuel, total entrées, total sorties et la liste de tous les mouvements.

**Filtres disponibles :**
- Année, Mois
- Type (Paiement / Dépense / Recette / Ajustement / Archive)
- Sens (Entrées+Sorties / Entrées / Sorties)

**Forms utilisés :**
- Form 11 — Caisse (`/caisse`)

**API utilisées :**
- `GET /api/caisse-mouvements/` — Tous les mouvements (avec filtres)

**Logique métier :**
- Le solde = total DÉBIT − total CRÉDIT (tous types confondus)
- Les mouvements `ARCHIVE_ADJUSTMENT` sont inclus dans le solde (solde reporté après archivage)
- Un mouvement DÉBIT = entrée d'argent (paiement, recette)
- Un mouvement CRÉDIT = sortie d'argent (dépense)

---

## MODULE SUIVI & RAPPORTS

---

### ACTION : Voir la situation financière de tous les lots

**Étapes utilisateur :**
1. Aller à : Tableau de bord → Suivi paiements
   *ou* Sidebar → Rapport financier → section Synthèse

**Résultat attendu :** Tableau avec pour chaque lot : propriétaire, total dû, total payé, reste à payer, statut.

**Forms utilisés :**
- Form 15 — Synthèse Paiements (`/synthese`)

**API utilisées :**
- `GET /api/rapport-financier/` → champ `situation_lots`

**Logique métier :**
- `total_du` = somme de tous les DetailAppelCharge du lot
- `total_paye` = somme de toutes les AffectationPaiement du lot
- `reste` = total_du − total_paye
- Si reste > 0 → lot en retard / impayé

---

### ACTION : Voir la situation d'un lot spécifique

**Étapes utilisateur :**
1. Aller à : Sidebar → Synthèse ou Kanban
2. Cliquer sur le lot concerné

**Résultat attendu :** Fiche détaillée : infos lot, historique paiements, appels affectés, solde.

**Forms utilisés :**
- Form 19 — Fiche Lot (`/fiche-lot?lot_id={id}`)

**API utilisées :**
- `GET /api/lots/{id}/` — Infos lot
- `GET /api/paiements/?lot={id}` — Historique paiements
- `GET /api/details-appel/?lot={id}` — Appels affectés

---

### ACTION : Analyser la couverture des paiements mois par mois

**Étapes utilisateur :**
1. Aller à : Tableau de bord → Analyse Paiements — Timeline
2. Sélectionner : [Appel de charge] ou [Appel de fond]
3. Sélectionner l'année
4. Filtrer : Tous / Impayés / Soldés

**Résultat attendu :** Timeline 12 mois par lot avec segments colorés selon l'état de couverture.

**Forms utilisés :**
- Form 16 — Analyse Timeline (`/situation-paiements`)

**API utilisées :**
- `GET /api/situation-paiements/?year=2026&type_charge=CHARGE`
  - Réponse : `{ "years": [...], "lots": [...] }`

**Logique métier :**
- Chaque mois est coloré selon : payé / partiel / impayé
- Le carry-over : si un paiement dépasse le dû d'un mois, le surplus couvre les mois suivants
- Les années disponibles sont calculées depuis les exercices réels (pas de liste fixe)

---

### ACTION : Consulter le rapport financier global

**Étapes utilisateur :**
1. Aller à : Tableau de bord → Rapport financier
   *ou* Sidebar → Rapport financier

**Résultat attendu :** KPIs (solde caisse, encaissé, dépensé, taux recouvrement) + mouvements récents + situation lots.

**Forms utilisés :**
- Form 17 — Rapport Financier (`/rapport-financier`)

**API utilisées :**
- `GET /api/rapport-financier/` — Toutes les données
- `GET /api/rapport-financier/export/excel/` — Export Excel
- `GET /api/rapport-financier/export/pdf/` — Export PDF

---

## MODULE GOUVERNANCE

---

### ACTION : Créer une assemblée générale

**Étapes utilisateur :**
1. Aller à : Sidebar → Gouvernance → Assemblées
   *ou* Tableau de bord → Assemblée Générale
2. Cliquer sur **+ Nouvelle AG**
3. Remplir : date, type (Ordinaire/Extraordinaire), statut, ordre du jour
4. Cliquer sur **Enregistrer**

**Résultat attendu :** L'AG est créée. Elle peut accueillir des résolutions, un bureau et une passation.

**Forms utilisés :**
- Form 20 — Assemblées Générales (`/gouvernance/assemblees`)

**API utilisées :**
- `POST /api/assemblees/` — Créer
- `GET /api/assemblees/` — Lister

**Logique métier :**
- Une AG peut être liée à des résolutions, un bureau syndical et une passation de consigne
- La suppression d'une AG supprime en cascade ses résolutions et passations associées

---

### ACTION : Créer une résolution AG

**Étapes utilisateur :**
1. Aller à : Tableau de bord → Résolutions *ou* Sidebar → Résolutions
2. Cliquer sur **+ Résolution AG**
3. Remplir : numéro, titre, description, AG associée (obligatoire), résultat (Proposée/Adoptée/Rejetée/Ajournée), voix pour/contre
4. Cliquer sur **Enregistrer**

**Résultat attendu :** La résolution apparaît dans le Kanban Résolutions avec le badge 🏛 AG.

**Forms utilisés :**
- Form 22 — Kanban Résolutions (`/gouvernance/kanban-resolutions`)
- Form 23 — Résolutions AG (`/gouvernance/resolutions`)

**API utilisées :**
- `POST /api/resolutions/` — Créer
- `GET /api/assemblees/` — Liste des AG disponibles

---

### ACTION : Lancer un vote en ligne

**Étapes utilisateur :**
1. Aller à : Tableau de bord → Résolutions *ou* Sidebar → Résolutions
2. Cliquer sur **+ Vote en ligne**
3. Remplir : intitulé, description, type de vote (Majorité simple/Absolue/Double/Unanimité), date début, date clôture
4. Cliquer sur **Enregistrer**
5. Envoyer des notifications aux résidents via le bouton 📨

**Résultat attendu :** Le vote est créé avec statut automatique (En préparation / En cours / Clôturé). Les résidents peuvent voter depuis leur portail.

**Forms utilisés :**
- Form 22 — Kanban Résolutions
- Form 24 — Vote en ligne (`/gouvernance/resolutions-vote`)

**API utilisées :**
- `POST /api/resolutions-vote/` — Créer la résolution vote
- `POST /api/resolutions-vote/{id}/envoyer-notifs/` — Envoyer notifications
- `GET /api/resolutions-vote/{id}/resultats/` — Consulter les résultats

**Logique métier :**
- Le statut est calculé automatiquement depuis les dates (pas de saisie manuelle)
- Avant date début → En préparation
- Entre début et clôture → En cours
- Après clôture → Clôturé
- Les résultats (OUI/NON/Neutre) sont affichés sur les cartes du kanban

---

### ACTION : Voir les résultats d'un vote en ligne

**Étapes utilisateur :**
1. Aller à : Tableau de bord → Résolutions
2. Les résolutions clôturées affichent directement les compteurs OUI / NON / Neutre

**Résultat attendu :** Affichage du nombre de votes OUI, NON, Neutre sur chaque carte.

**API utilisées :**
- `GET /api/resolutions-vote/` — Inclut `nb_oui`, `nb_non`, `nb_neutre`

---

### ACTION : Réaliser une passation de consigne

**Étapes utilisateur :**
1. Aller à : Tableau de bord → Passation *ou* Sidebar (accès direct)
2. Remplir :
   - Nom syndic sortant / entrant
   - Nom trésorier sortant / entrant
   - Solde banque (manuel)
   - Notes
   - Réserves et observations (libellé uniquement)
3. Cliquer sur **Enregistrer**

**Résultat attendu :** La passation est créée. Le solde caisse est calculé automatiquement. La situation de chaque lot (dû/payé/reste) est générée.

**Forms utilisés :**
- Form 27 — Passation de Consignes (`/passation-consignes`)

**API utilisées :**
- `POST /api/passations/` — Créer (calcule automatiquement le solde caisse)
- `GET /api/passations/{id}/situation/` — Situation lots à la date de passation
- `POST /api/passations/{id}/refresh-caisse/` — Recalculer le solde caisse

**Logique métier :**
- La date est fixée à l'instant de la création, non modifiable après
- Le solde caisse est calculé automatiquement par le backend (tous les mouvements y compris ARCHIVE_ADJUSTMENT)
- Le solde caisse ne peut pas être modifié manuellement

---

## MODULE ADMINISTRATION

---

### ACTION : Archiver une période comptable

**Étapes utilisateur :**
1. Aller à : Sidebar → Paramétrage → Archivage
2. Choisir la période (date début → date fin)
3. Cliquer sur **Archiver**

**Résultat attendu :** Les données sont archivées. Un mouvement `ARCHIVE_ADJUSTMENT` est créé en caisse avec le solde de clôture. L'application continue à fonctionner normalement.

**Forms utilisés :**
- Form 40 — Archivage (`/archivage`)

**API utilisées :**
- `POST /api/archives/create/` — Créer une archive
- `GET /api/archives/` — Liste des archives
- `POST /api/archives/{id}/restore/` — Restaurer

**Logique métier :**
- Après archivage, le solde historique est représenté par l'ARCHIVE_ADJUSTMENT
- Toutes les vues (caisse, passation, rapport) continuent à fonctionner car ARCHIVE_ADJUSTMENT est traité comme un mouvement normal

---

### ACTION : Configurer l'assistant IA

**Étapes utilisateur :**
1. Aller à : Sidebar → Paramétrage → IA
2. Remplir :
   - URL de l'API LLM (ex : `https://api.groq.com/openai/v1/chat/completions`)
   - Clé API (masquée après sauvegarde)
   - Modèle (ex : `llama-3.3-70b-versatile`)
   - Instructions système (comportement de l'IA)
3. Optionnel : uploader des documents PDF (règlement de copropriété, lois...)
4. Cliquer sur **⚡ Charger la doc de l'application** pour indexer la documentation interne
5. Cliquer sur **Enregistrer**

**Résultat attendu :** L'IA est configurée et opérationnelle dans `/ia/chat`.

**Forms utilisés :**
- Form 45 — Paramétrage IA (`/parametrage/ia`)

**API utilisées :**
- `PUT /api/ai/config/` — Sauvegarder la configuration
- `POST /api/ai/documents/` — Uploader un document PDF
- `POST /api/ai/load-app-docs/` — Charger la documentation de l'application

**Logique métier :**
- La clé API est masquée après sauvegarde (sécurité)
- Si la clé est laissée vide lors d'une modification → l'ancienne clé est conservée
- Compatible avec tout service OpenAI-compatible : Groq, OpenAI, Mistral, Ollama, DeepSeek

---

---

# PARTIE 2 — OÙ TROUVER LES DONNÉES (VISION IA)

> Tableau de correspondance : Question utilisateur → Données → API → Réponse

---

## FINANCES

### "Quel est le solde de la caisse ?"
- **API** : `GET /api/caisse-mouvements/`
- **Calcul** : Somme des DÉBIT − Somme des CRÉDIT (tous types confondus, y compris ARCHIVE_ADJUSTMENT)
- **Réponse attendue** : "Le solde actuel de la caisse est de X MAD."
- **Note** : Le rapport financier expose directement le solde via `GET /api/rapport-financier/` → champ `solde_caisse`

---

### "Quel est le taux de recouvrement ?"
- **API** : `GET /api/rapport-financier/`
- **Champ** : `taux_recouvrement`
- **Calcul** : (total_paye / total_du) × 100
- **Réponse attendue** : "Le taux de recouvrement est de X%."

---

### "Combien a-t-on dépensé ?"
- **API** : `GET /api/rapport-financier/` → champ `total_depenses`
- *ou* `GET /api/depenses/` pour le détail
- **Réponse attendue** : "Les dépenses totales s'élèvent à X MAD."

---

### "Combien a-t-on encaissé ?"
- **API** : `GET /api/rapport-financier/` → champ `total_encaisse`
- **Réponse attendue** : "Le total encaissé (paiements + recettes) est de X MAD."

---

## LOTS ET PAIEMENTS

### "Quelle est la situation du lot [numéro] ?"
- **API** : `GET /api/rapport-financier/` → champ `situation_lots` → filtrer par numéro de lot
- **Champs** : `total_du`, `total_paye`, `reste`
- **Réponse attendue** : "Le lot [numéro] doit X MAD, a payé Y MAD, il reste Z MAD à régler."

---

### "Quels lots ont des impayés ?"
- **API** : `GET /api/rapport-financier/` → `situation_lots` → filtrer où `reste > 0`
- **Réponse attendue** : Liste des lots avec leur montant restant dû.

---

### "Qui n'a pas payé ses charges ?"
- **Même API** que ci-dessus
- **Réponse attendue** : "Les lots suivants ont des impayés : [lot, propriétaire, reste]"

---

### "Quels sont les paiements du lot [numéro] ?"
- **API** : `GET /api/paiements/?lot={id}`
- **Champs** : `montant`, `date_paiement`, `mode_paiement`, `mois`
- **Réponse attendue** : Historique des paiements du lot.

---

### "Le lot [numéro] est-il à jour ?"
- **API** : `GET /api/rapport-financier/` → `situation_lots` → trouver le lot → vérifier `reste == 0`
- **Réponse attendue** : "Oui, le lot [numéro] est à jour." ou "Non, il reste X MAD à payer."

---

### "Quel est le montant total dû pour les appels de charge ?"
- **API** : `GET /api/rapport-financier/` → champ `total_du`
- **Réponse attendue** : "Le montant total dû (appels de charge + fond) est de X MAD."

---

### "Comment se déroulent les paiements mois par mois ?"
- **API** : `GET /api/situation-paiements/?year=2026&type_charge=CHARGE`
- **Réponse** : Structure `{ "lots": [...] }` avec état de couverture par mois
- **Réponse attendue** : Description de la couverture mois par mois par lot.

---

## CAISSE ET MOUVEMENTS

### "Pourquoi la caisse est négative ?"
- **API** : `GET /api/caisse-mouvements/` + `GET /api/rapport-financier/`
- **Analyse** : Les dépenses (CRÉDIT) dépassent les encaissements (DÉBIT)
- **Réponse attendue** : "La caisse est négative car les dépenses (X MAD) dépassent les encaissements (Y MAD)."

---

### "Quels sont les derniers mouvements de caisse ?"
- **API** : `GET /api/caisse-mouvements/` (triés par date décroissante)
- **Réponse attendue** : Liste des N derniers mouvements avec type, sens, montant, date.

---

### "Quelles sont les dépenses de ce mois ?"
- **API** : `GET /api/depenses/?mois=MARS` (ou paramètre équivalent)
- **Réponse attendue** : Liste des dépenses du mois avec libellé, montant, fournisseur.

---

## GOUVERNANCE

### "Combien de résolutions ont été adoptées ?"
- **API** : `GET /api/resolutions/` → filtrer `resultat = "Adoptée"`
- *et* `GET /api/resolutions-vote/` → filtrer cloturées avec majorité OUI
- **Réponse attendue** : "X résolutions AG ont été adoptées. Y votes en ligne ont été clôturés."

---

### "Quel est le résultat du vote sur [titre] ?"
- **API** : `GET /api/resolutions-vote/` → trouver par intitulé → champs `nb_oui`, `nb_non`, `nb_neutre`
- **Réponse attendue** : "Le vote [titre] : X OUI, Y NON, Z Neutre."

---

### "Quand a eu lieu la dernière AG ?"
- **API** : `GET /api/assemblees/` → trier par date décroissante → premier résultat
- **Réponse attendue** : "La dernière assemblée générale a eu lieu le [date] — [type] — [statut]."

---

### "Quel est le solde de la passation ?"
- **API** : `GET /api/passations/` → dernière passation → champ `solde_caisse`
- **Réponse attendue** : "Le solde caisse lors de la dernière passation était de X MAD."

---

## NAVIGATION (GUIDE VERS L'ÉCRAN)

### "Comment aller à [fonctionnalité] ?"

| Fonctionnalité demandée | Route | Accès rapide |
|------------------------|-------|--------------|
| Tableau de bord | `/accueil` | Menu → Tableau de bord |
| Paiements | `/paiements` | Sidebar → Finances → Paiements |
| Dépenses | `/depenses` | Sidebar → Finances → Dépenses |
| Caisse | `/caisse` | Sidebar → Finances → Caisse |
| Rapport financier | `/rapport-financier` | Tableau de bord → Rapport financier |
| Suivi paiements | `/synthese` | Tableau de bord → Suivi paiements |
| Timeline paiements | `/situation-paiements` | Tableau de bord → Analyse Paiements |
| Lots (kanban) | `/kanban` | Sidebar → Configuration → Lots |
| Appel de charge | `/appels-charge?filtre=CHARGE` | Sidebar → Configuration → Appel de charge |
| Appel de fond | `/appels-charge?filtre=FOND` | Sidebar → Configuration → Appel de fond |
| Assemblées | `/gouvernance/assemblees` | Sidebar → Gouvernance → Assemblées |
| Résolutions | `/gouvernance/kanban-resolutions` | Sidebar → Gouvernance → Résolutions |
| Vote en ligne | `/gouvernance/resolutions-vote` | Sidebar → Gouvernance → Résolutions/vote |
| Passation | `/passation-consignes` | Tableau de bord → Passation |
| Configuration IA | `/parametrage/ia` | Sidebar → Paramétrage → IA |
| Chat IA | `/ia/chat` | Sidebar → IA → Chat |
| Archivage | `/archivage` | Sidebar → Paramétrage → Archivage |
| Utilisateurs | `/gestion-utilisateurs` | Sidebar → Paramétrage → Utilisateurs |

---

---

# PARTIE 3 — COMPRÉHENSION DE L'APPLICATION (LOGIQUE GLOBALE)

---

## FLUX PRINCIPAL DE L'APPLICATION

```
CONFIGURATION
    │
    ├─ Créer la résidence
    ├─ Créer les groupes de lots
    ├─ Créer les lots (avec quote-parts)
    └─ Associer les propriétaires
         │
         ▼
APPELS DE CHARGES / FONDS
    │
    ├─ Créer un appel de charge (exercice annuel)
    └─ Génération automatique d'une ligne par lot (DetailAppelCharge)
         │
         ▼
PAIEMENTS DES COPROPRIÉTAIRES
    │
    ├─ Enregistrer les paiements reçus
    ├─ Affectation automatique aux dettes les plus anciennes
    └─ Création automatique d'un mouvement DÉBIT en caisse
         │
         ▼
DÉPENSES ET RECETTES
    │
    ├─ Enregistrer les dépenses (→ mouvement CRÉDIT en caisse)
    └─ Enregistrer les recettes diverses (→ mouvement DÉBIT en caisse)
         │
         ▼
SUIVI ET RAPPORTS
    │
    ├─ Rapport financier (KPIs, situation lots)
    ├─ Timeline paiements (couverture mois par mois)
    └─ Synthèse (tableau lot / dû / payé / reste)
         │
         ▼
GOUVERNANCE
    │
    ├─ AG + Résolutions AG
    ├─ Votes en ligne
    └─ Passation de consignes (solde caisse automatique)
         │
         ▼
ARCHIVAGE (fin de période)
    │
    └─ Création ARCHIVE_ADJUSTMENT → données actives allégées
```

---

## RÈGLES MÉTIER ESSENTIELLES

### Règle 1 — Caisse
> Le solde de caisse = somme de tous les mouvements DÉBIT − somme de tous les mouvements CRÉDIT, **y compris** les ARCHIVE_ADJUSTMENT.

**Types de mouvements DÉBIT (entrées) :**
- `PAIEMENT` : paiement d'un copropriétaire
- `RECETTE` : recette diverse
- `SOLDE_INITIAL` : solde de départ saisi manuellement
- `ARCHIVE_ADJUSTMENT` (si solde de clôture positif)

**Types de mouvements CRÉDIT (sorties) :**
- `DEPENSE` : dépense enregistrée
- `ARCHIVE_ADJUSTMENT` (si solde de clôture négatif)
- `AJUSTEMENT` : correction manuelle

---

### Règle 2 — Paiements et affectation
> Un paiement n'est jamais "libre" — il est toujours affecté à des dettes précises.

**Mécanisme :**
1. Le copropriétaire paie un montant
2. Ce montant est affecté aux DetailAppelCharge impayés les plus anciens en premier
3. Si le montant dépasse les dettes d'un exercice → le surplus couvre l'exercice suivant (carry-over)
4. Exemple : lot doit 500 pour 2024 et 500 pour 2025. Paiement de 800 → couvre tout 2024 (500) + 300 sur 2025

---

### Règle 3 — Statut d'un lot
> Le statut (À jour / En retard) est calculé automatiquement.

- `reste = total_du − total_paye`
- Si `reste == 0` → À jour
- Si `reste > 0` → En retard / Impayé
- Si `reste < 0` → Avance (paiement en excès, reporté sur futurs appels)

---

### Règle 4 — Archivage
> L'archivage ne détruit pas les données — il les compresse et crée un point de reprise.

- Après archivage : les données de la période sont archivées
- Un `ARCHIVE_ADJUSTMENT` est créé en caisse avec le solde de clôture
- Toutes les vues continuent à fonctionner normalement (la caisse inclut l'ajustement)
- La passation prend en compte l'ARCHIVE_ADJUSTMENT pour calculer le solde réel

---

### Règle 5 — Statut d'un vote en ligne
> Le statut est calculé automatiquement, pas saisi manuellement.

- Pas encore commencé (avant `date_debut_vote`) → **En préparation**
- En cours (entre `date_debut_vote` et `date_cloture_vote`) → **En cours**
- Terminé (après `date_cloture_vote`) → **Clôturé**

---

### Règle 6 — Passation de consigne
> Le solde caisse dans une passation est toujours calculé par le backend, jamais modifiable manuellement.

- Il inclut TOUS les mouvements jusqu'à la date de passation
- Inclut les ARCHIVE_ADJUSTMENT (reports d'archivages passés)
- La date de passation est fixée à la création et ne peut plus être modifiée

---

### Règle 7 — Configuration IA
> La configuration IA est globale (une seule pour toute l'application).

- Elle n'est pas rattachée à une résidence spécifique
- Accessible depuis `/parametrage/ia` (admin résidence) et `/superuser` (superuser)
- La clé API est masquée après sauvegarde — laisser vide pour conserver l'ancienne

---

## RELATIONS IMPORTANTES ENTRE LES DONNÉES

```
Residence
    └── Lot (plusieurs)
           ├── Groupe (un)
           ├── Personne/Propriétaire (un)
           ├── DetailAppelCharge (plusieurs) ← AppelCharge
           ├── Paiement (plusieurs)
           │      └── AffectationPaiement → DetailAppelCharge
           └── VoteResident → ResolutionVote

AppelCharge (CHARGE ou FOND)
    └── DetailAppelCharge (un par lot)
           ├── montant (dû)
           ├── montant_recu (payé via affectations)
           └── statut (NON_PAYÉ / PARTIEL / PAYÉ)

CaisseMouvement
    ├── OneToOne → Paiement (type PAIEMENT)
    ├── OneToOne → Depense (type DEPENSE)
    ├── OneToOne → Recette (type RECETTE)
    └── Manuel (type SOLDE_INITIAL / AJUSTEMENT / ARCHIVE_ADJUSTMENT)

AssembleeGenerale
    ├── Resolution (plusieurs) — résolutions AG présentiel
    ├── Bureau Syndical
    └── PassationConsignes

ResolutionVote (vote en ligne)
    └── VoteResident (un par lot votant)
```

---

## STRUCTURE DE NAVIGATION COMPLÈTE

### Sidebar — Organisation

| Section | Items |
|---------|-------|
| (sans rubrique) | Tableau de bord, Aide |
| Finances | Paiements, Dépenses, Caisse, Recettes |
| Configuration | Résidence, Lots, Appel de charge, Appel de fond |
| Gouvernance | Assemblées, Bureau syndical, Résolutions, Documents, Résolutions/vote, Travaux, Notifications |
| Espace Résident | Messages, Notifications, Vue Résident |
| Comptabilité | Journal, Grand Livre, Balance, CPC, Bilan |
| Paramétrage | Import, Export, Archivage, IA, [Admin: Utilisateurs, Initialisation] |

---

## COMPTES UTILISATEURS

| Type | Accès | Redirection connexion |
|------|-------|----------------------|
| **Admin résidence** | Toute l'application de sa résidence | `/accueil` |
| **Résident** | Portail résident uniquement | `/resident` |
| **Superuser Django** | Dashboard global toutes résidences | `/superuser` |

---

## COMPATIBILITÉ LLM (Assistant IA)

L'assistant IA de JORAT est compatible avec tout service OpenAI-compatible :

| Service | URL exemple | Modèles recommandés |
|---------|-------------|---------------------|
| Groq (gratuit) | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o`, `gpt-4o-mini` |
| Mistral | `https://api.mistral.ai/v1/chat/completions` | `mistral-large-latest` |
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` |
| Ollama (local) | `http://localhost:11434/v1/chat/completions` | `llama3`, `mistral` |

---

## RÈGLES DE RÉPONSE POUR L'ASSISTANT IA

1. **Ne jamais mentionner les APIs** — utiliser les données pour répondre directement
2. **Ne jamais inventer** de chiffres — si une donnée n'est pas dans le contexte, le dire
3. **Guider vers le bon écran** quand l'utilisateur ne sait pas où aller
4. **Utiliser les données fournies en contexte** (DONNÉES ACTUELLES) directement pour répondre
5. **Langue** : Toujours répondre en français
6. **Ton** : Professionnel, clair, concis

---

*Documentation IA générée le 25 mars 2026 — Syndic Pro v2.0*
*Optimisée pour utilisation RAG / prompt IA*
