# JORAT — Syndic Pro : Documentation Complète
## Guide destiné à l'assistant IA utilisateur

> **Version** : 1.0 — Mars 2026
> **Technologie** : Django REST Framework + React 19
> **Base URL API** : `/api/`

---

## VUE GLOBALE DE L'APPLICATION

### Structure générale

Syndic Pro est une application de gestion de copropriété organisée en 7 modules :

| Module | Objectif principal |
|--------|-------------------|
| **Configuration** | Créer et paramétrer la résidence, les lots, les propriétaires |
| **Finances** | Saisir les paiements, dépenses, recettes et mouvements de caisse |
| **Suivi** | Analyser la situation financière par lot, par période |
| **Gouvernance** | Gérer les AG, résolutions, bureau syndical, passations |
| **Espace Résident** | Permettre aux résidents de consulter leur situation et voter |
| **Comptabilité** | Journal, grand livre, balance, CPC, bilan |
| **Administration** | Import, export, archivage, utilisateurs, IA |

### Enchaînement logique des actions

```
1. Créer la résidence (Form 02)
2. Créer les groupes de lots (Form 03)
3. Créer les lots (Form 04/05)
4. Associer les propriétaires aux lots (Form 06)
5. Créer un appel de charge ou de fond (Form 07/08)
6. Enregistrer les paiements (Form 09)
7. Enregistrer les dépenses (Form 10)
8. Suivre la caisse (Form 11)
9. Consulter le rapport financier (Form 17)
10. Organiser les AG et résolutions (Form 20-24)
11. Réaliser une passation de consigne (Form 27)
12. Archiver la période comptable (Form 39)
```

### Navigation principale (Sidebar)

- **Sans rubrique** : Tableau de bord, Aide
- **Finances** : Paiements, Dépenses, Caisse, Recettes
- **Configuration** : Résidence, Lots, Appel de charge, Appel de fond
- **Gouvernance** : Assemblées, Bureau syndical, Résolutions, Documents, Résolutions/vote, Travaux, Notifications
- **Paramétrage** : Import, Export, Archivage, [Admin: Utilisateurs, Initialisation]

---

## SECTION A — CONFIGURATION

---

### Form 01 — Tableau de bord (Accueil)

**Route** : `/accueil`
**Description** : Page d'accueil principale. Affiche la fiche résidence et des raccourcis vers les modules clés.

**Navigation** : Menu → Tableau de bord (en haut de la sidebar)

**Contenu affiché**
- Fiche résidence : nom, adresse, ville, logo, statut, nombre de lots
- Section **Configuration** : Résidence, Lots, Appel de charge, Appel de fond
- Section **Suivi financier** : Suivi paiements, Rapport financier, Analyse Timeline, État mensuel
- Section **Gouvernance** : Assemblée Générale, Documents, Événements, Résolutions, Passation
- Section **Espace Résident** : Notifications, Messages, Vue Résident
- Section **Comptabilité** : Journal, Grand Livre, Balance, CPC, Bilan

**Logique métier** : Si aucune résidence n'est associée au compte, l'utilisateur est redirigé vers la page de connexion.

**API utilisée**
- `GET /api/residences/` — Lecture de la résidence active

---

### Form 02 — Résidence

**Route** : `/residences`
**Description** : Consulter et modifier les informations de la résidence (une seule résidence par compte administrateur).

**Navigation** : Sidebar → Configuration → Résidence, ou Tableau de bord → Résidence

**Champs principaux**
- Nom de la résidence
- Adresse, ville, code postal
- Email de contact
- Logo (upload image)
- Description

**Logique métier** : La résidence est le conteneur principal de toutes les données. Elle est créée lors de l'inscription. Le champ `statut_residence` (ACTIF/INACTIF) est géré automatiquement.

**Résultat attendu** : Les modifications sont sauvegardées et reflétées sur le tableau de bord.

**API**
- `GET /api/residences/` — Lecture
- `PATCH /api/residences/{id}/` — Mise à jour

---

### Form 03 — Groupes de lots

**Route** : `/groupes`
**Description** : Organiser les lots par groupes (bâtiments, entrées, tours...).

**Navigation** : Sidebar → Configuration → Lots → onglet Groupes

**Champs principaux**
- Nom du groupe
- Description

**Logique métier** : Les groupes servent uniquement à organiser l'affichage des lots. L'ordre d'affichage est alphabétique par groupe, puis numérique par lot.

**API**
- `GET /api/groupes/` — Lecture
- `POST /api/groupes/` — Création
- `PATCH /api/groupes/{id}/` — Modification
- `DELETE /api/groupes/{id}/` — Suppression

---

### Form 04 — Kanban Lots

**Route** : `/kanban`
**Description** : Vue kanban de tous les lots de la résidence, organisés par groupe.

**Navigation** : Sidebar → Configuration → Lots, ou Tableau de bord → Lots

**Contenu affiché**
- Cartes lots regroupées par groupe
- Statut de chaque lot (à jour / en retard)
- Nom du propriétaire
- Numéro de lot

**Action** : Cliquer sur un lot ouvre la fiche de détail (Form 05).

**API**
- `GET /api/lots/` — Lecture des lots (triés groupe ASC puis numéro numérique)

---

### Form 05 — Détail Lot / Création Lot

**Route** : `/lots/:id` ou `/lots/new`
**Description** : Créer ou modifier un lot. Voir la fiche complète d'un lot.

**Navigation** : Kanban → clic sur un lot, ou bouton + Nouveau lot

**Champs principaux**
- Numéro de lot
- Groupe (sélection)
- Surface (m²)
- Quote-part (tantièmes)
- Propriétaire associé (sélection personne)

**Champs masqués** : `statut_lot` (valeur par défaut A_JOUR conservée automatiquement)

**Logique métier** : Un lot doit être associé à un groupe existant. La quote-part détermine la répartition des charges. Un lot peut avoir un propriétaire (personne) associé.

**API**
- `GET /api/lots/{id}/` — Lecture
- `POST /api/lots/` — Création
- `PATCH /api/lots/{id}/` — Modification
- `GET /api/groupes/` — Liste des groupes disponibles
- `GET /api/personnes/` — Liste des propriétaires disponibles

---

### Form 06 — Personnes (Propriétaires)

**Route** : `/personnes`
**Description** : Gérer les propriétaires et occupants de la résidence.

**Navigation** : Sidebar → Configuration → (accès depuis fiche lot)

**Champs principaux**
- Nom, Prénom
- CIN (carte d'identité nationale)
- Téléphone, Email
- Adresse

**Logique métier** : Une personne peut être associée à plusieurs lots. Le champ CIN est obligatoire et doit figurer dans le sérialiseur pour que l'édition fonctionne correctement.

**API**
- `GET /api/personnes/` — Lecture
- `POST /api/personnes/` — Création
- `PATCH /api/personnes/{id}/` — Modification
- `DELETE /api/personnes/{id}/` — Suppression

---

### Form 07 — Appel de Charge

**Route** : `/appels-charge?filtre=CHARGE`
**Description** : Créer et gérer les appels de charges courantes envoyés aux copropriétaires.

**Navigation** : Sidebar → Configuration → Appel de charge, ou Tableau de bord → Appel de charge

**Champs principaux**
- Exercice (année)
- Description de l'appel
- Date d'émission
- Montant par lot (saisi dans le détail)

**Logique métier** : Un appel de charge génère automatiquement un détail par lot (DetailAppelCharge) en fonction des tantièmes. Les montants sont répartis proportionnellement à la quote-part de chaque lot.

**Résultat attendu** : Création de l'appel + génération des lignes par lot → visible dans Suivi paiements.

**API**
- `GET /api/appels-charge/?filtre=CHARGE` — Lecture des appels de charges
- `POST /api/appels-charge/` — Création d'un appel
- `GET /api/details-appel/?appel={id}` — Détails par lot
- `PATCH /api/details-appel/{id}/` — Modifier le montant d'un lot

---

### Form 08 — Appel de Fond

**Route** : `/appels-charge?filtre=FOND`
**Description** : Créer et gérer les appels de fonds (travaux, fonds de réserve...).

**Navigation** : Sidebar → Configuration → Appel de fond, ou Tableau de bord → Appel de fond

**Champs principaux** : Identiques à Form 07 avec `type_charge = FOND`

**Logique métier** : Même mécanique que l'appel de charge, mais pour les fonds spéciaux. Les paiements reçus sont affectés séparément (CHARGE vs FOND).

**API** : Identiques à Form 07 avec `filtre=FOND`

---

## SECTION B — FINANCES

---

### Form 09 — Paiements

**Route** : `/paiements`
**Description** : Enregistrer les paiements des copropriétaires pour les appels de charge et de fond.

**Navigation** : Sidebar → Finances → Paiements

**Champs principaux**
- Lot (sélection)
- Mois de paiement (JAN à DEC)
- Montant
- Mode de paiement (Espèces, Virement, Chèque)
- Référence
- Date de paiement

**Logique métier** : Un paiement est lié à un lot. Il est automatiquement affecté aux échéances impayées les plus anciennes (logique de carry-over). Le statut (NON_PAYÉ, PARTIEL, PAYÉ) est calculé par comparaison entre montant dû et montant reçu. Un mouvement de caisse est automatiquement créé à chaque paiement enregistré.

**Résultat attendu** : Le paiement est enregistré, un mouvement DÉBIT est créé en caisse, le statut du lot est mis à jour.

**API**
- `GET /api/paiements/` — Lecture des paiements
- `POST /api/paiements/` — Création d'un paiement
- `PATCH /api/paiements/{id}/` — Modification
- `DELETE /api/paiements/{id}/` — Suppression
- `GET /api/lots/` — Liste des lots pour sélection

---

### Form 10 — Dépenses

**Route** : `/depenses`
**Description** : Enregistrer les dépenses de la résidence (entretien, prestataires, charges...).

**Navigation** : Sidebar → Finances → Dépenses

**Champs principaux**
- Libellé
- Famille de dépense (catégorie)
- Compte comptable
- Fournisseur
- Date de dépense
- Montant
- Mois d'imputation (JAN-DEC)
- Détail / commentaire
- Référence facture
- Modèle de dépense (optionnel, pré-remplit le formulaire)

**Logique métier** : Une dépense génère automatiquement un mouvement CRÉDIT (sortie) en caisse. Les familles de dépense peuvent être créées à la volée depuis le formulaire.

**Résultat attendu** : La dépense est enregistrée, un mouvement CRÉDIT est créé en caisse.

**API**
- `GET /api/depenses/` — Lecture
- `POST /api/depenses/` — Création
- `PATCH /api/depenses/{id}/` — Modification
- `DELETE /api/depenses/{id}/` — Suppression
- `GET /api/familles-depense/` — Familles disponibles
- `GET /api/fournisseurs/` — Fournisseurs disponibles
- `GET /api/comptes-comptables/` — Comptes disponibles
- `GET /api/modeles-depense/` — Modèles disponibles

---

### Form 11 — Caisse

**Route** : `/caisse`
**Description** : Journal de trésorerie. Affiche tous les mouvements financiers de la résidence.

**Navigation** : Sidebar → Finances → Caisse

**Contenu affiché**
- Solde actuel (total général)
- Total entrées (DÉBIT)
- Total sorties (CRÉDIT)
- Nombre de mouvements
- Liste des mouvements filtrables

**Filtres disponibles**
- Année
- Période (mois)
- Type de mouvement (Solde initial, Paiement, Recette, Dépense, Ajustement, Archive)
- Sens (Entrées + Sorties / Entrées seules / Sorties seules)

**Logique métier** : La caisse est alimentée automatiquement par les paiements, dépenses et recettes. Le solde inclut TOUS les types de mouvements y compris les ajustements d'archive (`ARCHIVE_ADJUSTMENT`). Un mouvement manuel peut être créé (Solde initial ou Ajustement).

**Types de mouvements**
- `SOLDE_INITIAL` : Solde de départ
- `PAIEMENT` : Paiement copropriétaire (auto)
- `RECETTE` : Recette diverse (auto)
- `DEPENSE` : Dépense (auto)
- `AJUSTEMENT` : Ajustement manuel
- `ARCHIVE_ADJUSTMENT` : Report de solde après archivage

**API**
- `GET /api/caisse-mouvements/` — Lecture (avec filtres en query params)
- `POST /api/caisse-mouvements/` — Création manuelle
- `DELETE /api/caisse-mouvements/{id}/` — Suppression (mouvements manuels uniquement)

---

### Form 12 — Recettes

**Route** : `/recettes`
**Description** : Enregistrer les recettes diverses (locations salle, pénalités, subventions...).

**Navigation** : Sidebar → Finances → Recettes

**Champs principaux**
- Libellé
- Montant
- Date de recette
- Compte comptable
- Référence
- Commentaire

**Logique métier** : Une recette génère un mouvement DÉBIT (entrée) en caisse automatiquement.

**API**
- `GET /api/recettes/` — Lecture
- `POST /api/recettes/` — Création
- `PATCH /api/recettes/{id}/` — Modification
- `DELETE /api/recettes/{id}/` — Suppression

---

### Form 13 — Catégories de Dépenses

**Route** : `/categories-depense`
**Description** : Gérer les catégories et familles de classification des dépenses.

**Navigation** : Sidebar → Configuration → (accessible depuis Dépenses)

**Champs principaux**
- Nom de la catégorie
- Code
- Description

**API**
- `GET /api/categories-depense/` — Lecture
- `POST /api/categories-depense/` — Création
- `PATCH /api/categories-depense/{id}/` — Modification
- `DELETE /api/categories-depense/{id}/` — Suppression

---

### Form 14 — Fournisseurs

**Route** : `/fournisseurs`
**Description** : Gérer le répertoire des fournisseurs de la résidence.

**Navigation** : Sidebar → Configuration → Fournisseurs

**Champs principaux**
- Nom du fournisseur
- Téléphone, Email
- Adresse
- ICE / Identifiant fiscal

**API**
- `GET /api/fournisseurs/` — Lecture
- `POST /api/fournisseurs/` — Création
- `PATCH /api/fournisseurs/{id}/` — Modification
- `DELETE /api/fournisseurs/{id}/` — Suppression

---

## SECTION C — SUIVI & RAPPORTS

---

### Form 15 — Synthèse Paiements

**Route** : `/synthese`
**Description** : Tableau récapitulatif de la situation financière de chaque lot.

**Navigation** : Tableau de bord → Suivi paiements

**Contenu affiché** : Pour chaque lot :
- Propriétaire
- Total dû (appels de charge + fond)
- Total payé
- Reste à payer
- Statut (à jour / en retard)

**Filtres** : Par statut, recherche par lot ou nom, tri colonnes

**Logique métier** : Les données sont calculées depuis le rapport financier backend (`/api/rapport-financier/`), qui annote chaque lot avec `total_du` et `total_paye`.

**API**
- `GET /api/rapport-financier/` — Données agrégées par lot (`situation_lots`)

---

### Form 16 — Analyse Paiements (Timeline)

**Route** : `/situation-paiements`
**Description** : Analyse mois par mois de la couverture des appels de charge par lot.

**Navigation** : Tableau de bord → Analyse Paiements — Timeline

**Contenu affiché**
- Sélecteur [Appel de charge | Appel de fond]
- Sélecteur d'année (années dynamiques depuis les exercices réels)
- Filtres : Tous / Impayés / Soldés + recherche
- Timeline 12 mois par lot : segments colorés selon état de paiement
- Carry-over inter-années : les surplus d'une année couvrent les exercices suivants

**Logique métier** : Les paiements couvrent les exercices dans l'ordre chronologique. Si un paiement dépasse le montant dû, le surplus est reporté sur l'exercice suivant (carry-over).

**API**
- `GET /api/situation-paiements/?year=2026&type_charge=CHARGE` — Timeline données
  - Réponse : `{ "years": [...], "lots": [...] }`

---

### Form 17 — Rapport Financier

**Route** : `/rapport-financier`
**Description** : Tableau de bord financier complet avec KPIs, mouvements de caisse et situation des lots.

**Navigation** : Tableau de bord → Rapport financier

**Contenu affiché**
- KPIs : Solde caisse, Total encaissé, Total dépensé, Taux de recouvrement
- Mouvements de caisse récents
- Section accordion "Situation des lots" (liste lot / dû / payé / reste)

**Exports disponibles** : Excel et PDF

**API**
- `GET /api/rapport-financier/` — Toutes les données
- `GET /api/rapport-financier/export/excel/` — Export Excel
- `GET /api/rapport-financier/export/pdf/` — Export PDF

---

### Form 18 — État Mensuel

**Route** : `/etat-mensuel`
**Description** : Tableau croisé des entrées et sorties mois par mois, par lot.

**Navigation** : Tableau de bord → État mensuel — Entrées / Sorties

**Contenu affiché** : Grille lot × 12 mois avec les montants reçus pour chaque période.

**API**
- `GET /api/rapport-financier/` — Données source

---

### Form 19 — Fiche Lot

**Route** : `/fiche-lot?lot_id={id}`
**Description** : Fiche détaillée d'un lot spécifique : historique des paiements, appels, solde.

**Navigation** : Depuis la Synthèse ou le Kanban → clic sur un lot

**Contenu affiché**
- Informations lot (numéro, groupe, surface, propriétaire)
- Appels de charge et fond affectés
- Historique des paiements
- Solde actuel (dû - payé)

**API**
- `GET /api/lots/{id}/` — Infos lot
- `GET /api/paiements/?lot={id}` — Paiements du lot
- `GET /api/details-appel/?lot={id}` — Détails appels du lot

---

## SECTION D — GOUVERNANCE

---

### Form 20 — Assemblées Générales

**Route** : `/gouvernance/assemblees`
**Description** : Planifier et gérer les assemblées générales de la résidence.

**Navigation** : Sidebar → Gouvernance → Assemblées, ou Tableau de bord → Assemblée Générale

**Champs principaux**
- Date de l'AG
- Type (Ordinaire / Extraordinaire)
- Statut (Planifiée / Tenue / Annulée)
- Ordre du jour (texte libre)

**Logique métier** : Une AG peut contenir des résolutions (Form 23), un bureau syndical (Form 21) et une passation de consigne (Form 27). La suppression d'une AG supprime en cascade ses résolutions et passations associées.

**API**
- `GET /api/assemblees/` — Lecture
- `POST /api/assemblees/` — Création
- `PATCH /api/assemblees/{id}/` — Modification
- `DELETE /api/assemblees/{id}/` — Suppression

---

### Form 21 — Bureau Syndical

**Route** : `/gouvernance/bureau`
**Description** : Désigner les membres du bureau syndical et leurs mandats.

**Navigation** : Sidebar → Gouvernance → Bureau syndical

**Champs principaux**
- Lier à une AG (optionnel)
- Date début / fin de mandat
- Membres : Personne + Fonction (Président, Vice-Président, Trésorier, Secrétaire, Membre)

**API**
- `GET /api/bureau-syndical/` — Lecture
- `POST /api/bureau-syndical/` — Création
- `GET /api/mandats-bureau/` — Mandats
- `GET /api/membres-bureau/` — Membres
- `GET /api/personnes/` — Liste des personnes

---

### Form 22 — Kanban Résolutions (Vue unifiée)

**Route** : `/gouvernance/kanban-resolutions`
**Description** : Vue unifiée de toutes les résolutions (AG + vote en ligne) en liste avec badges distinctifs.

**Navigation** : Tableau de bord → Résolutions, ou Sidebar → Gouvernance → Résolutions

**Contenu affiché**
- Badge **🏛 AG** : résolutions issues des Assemblées Générales
- Badge **🗳 Vote en ligne** : résolutions issues du vote en ligne
- Statut de chaque résolution
- Résultats de vote si disponibles

**Boutons d'action**
- `+ Résolution AG` → redirige vers Form 23
- `+ Vote en ligne` → redirige vers Form 24

**API**
- `GET /api/resolutions/` — Résolutions AG
- `GET /api/resolutions-vote/` — Résolutions vote en ligne

---

### Form 23 — Résolutions AG (Présentiel)

**Route** : `/gouvernance/resolutions`
**Description** : Gérer les résolutions adoptées lors des Assemblées Générales.

**Navigation** : Kanban Résolutions → + Résolution AG, ou depuis une AG

**Champs principaux**
- Numéro de résolution
- Titre
- Description
- Assemblée Générale associée (obligatoire)
- Résultat (Proposée / Adoptée / Rejetée / Ajournée)
- Voix pour / contre / abstentions
- Date

**Logique métier** : Le statut d'une résolution est géré manuellement après le vote en séance. Les résultats (voix pour/contre) sont saisis directement.

**API**
- `GET /api/resolutions/` — Lecture (filtrable par `?ag_id=`)
- `POST /api/resolutions/` — Création
- `PATCH /api/resolutions/{id}/` — Modification
- `DELETE /api/resolutions/{id}/` — Suppression
- `GET /api/assemblees/` — Liste des AG disponibles

---

### Form 24 — Résolutions Vote en Ligne

**Route** : `/gouvernance/resolutions-vote`
**Description** : Créer et gérer les résolutions soumises au vote électronique des copropriétaires.

**Navigation** : Kanban Résolutions → + Vote en ligne, ou Sidebar → Gouvernance → Résolutions/vote

**Champs principaux**
- Intitulé de la résolution
- Description
- Type de vote (Majorité simple / Absolue / Double / Unanimité)
- Date de résolution
- Statut (calculé automatiquement depuis les dates)
- Date début de vote (optionnel)
- Date de clôture (optionnel)
- AG associée (optionnel)

**Statut automatique** (calculé depuis les dates)
- Avant date début → **En préparation**
- Entre début et clôture → **En cours**
- Après clôture → **Clôturé**

**Fonctionnalités**
- Envoi de notifications aux résidents (bouton 📨)
- Consultation des résultats (OUI / NON / Neutre) avec pourcentages
- Suivi par lot (notifié / accusé / vote)
- Affichage résultats directement sur les cartes de la liste

**API**
- `GET /api/resolutions-vote/` — Liste (inclut `nb_oui`, `nb_non`, `nb_neutre`)
- `POST /api/resolutions-vote/` — Création
- `PATCH /api/resolutions-vote/{id}/` — Modification
- `DELETE /api/resolutions-vote/{id}/` — Suppression
- `GET /api/resolutions-vote/{id}/resultats/` — Résultats détaillés
- `POST /api/resolutions-vote/{id}/envoyer-notifs/` — Envoi notifications
- `POST /api/resolutions-vote/{id}/voter/` — Enregistrer un vote (résident)
- `POST /api/resolutions-vote/{id}/accuser/` — Accusé de réception (résident)

---

### Form 25 — Documents de Gouvernance

**Route** : `/gouvernance/documents`
**Description** : Gérer la bibliothèque de documents officiels de la résidence.

**Navigation** : Sidebar → Gouvernance → Documents, ou Tableau de bord → Documents

**Champs principaux**
- Titre du document
- Type (PV, Règlement, Contrat, Autre)
- Fichier (upload PDF/Word)
- Date
- Description

**API**
- `GET /api/documents-gouvernance/` — Lecture
- `POST /api/documents-gouvernance/` — Upload
- `DELETE /api/documents-gouvernance/{id}/` — Suppression

---

### Form 26 — Travaux / Événements

**Route** : `/gouvernance/travaux`
**Description** : Planifier et suivre les travaux et événements de la résidence.

**Navigation** : Sidebar → Gouvernance → Travaux, ou Tableau de bord → Événements

**Champs principaux**
- Titre
- Description
- Date de début / fin
- Statut (Planifié / En cours / Terminé)
- Budget estimé

**API**
- `GET /api/travaux/` — Lecture
- `POST /api/travaux/` — Création
- `PATCH /api/travaux/{id}/` — Modification
- `DELETE /api/travaux/{id}/` — Suppression

---

### Form 27 — Passation de Consignes

**Route** : `/passation-consignes`
**Description** : Documenter la passation officielle entre l'ancien et le nouveau syndic.

**Navigation** : Tableau de bord → Passation, ou Sidebar → Gouvernance (accès direct)

**Champs principaux**
- Date de passation (automatique, non modifiable après création)
- Nom syndic sortant / entrant
- Nom trésorier sortant / entrant
- Solde caisse (calculé automatiquement à la date de passation, non modifiable)
- Solde banque (saisie manuelle)
- Notes
- Réserves et observations (libellé uniquement)

**Logique métier**
- La date est fixée à l'instant de la création et ne peut plus être modifiée
- Le solde caisse est calculé automatiquement par le backend en agrégeant **tous** les mouvements caisse jusqu'à la date de passation (y compris `ARCHIVE_ADJUSTMENT`)
- La situation des lots (dû / payé / reste) est générée automatiquement pour chaque lot
- Les 4 signataires sont requis

**API**
- `GET /api/passations/` — Liste des passations
- `POST /api/passations/` — Création (calcule automatiquement le solde caisse)
- `PATCH /api/passations/{id}/` — Modification (date et solde caisse non modifiables)
- `DELETE /api/passations/{id}/` — Suppression
- `POST /api/passations/{id}/refresh-caisse/` — Recalculer le solde caisse
- `GET /api/passations/{id}/situation/` — Situation lots à la date de passation
- `POST /api/passations/{id}/reserves/` — Ajouter une réserve
- `DELETE /api/passations/{id}/reserves/` — Supprimer une réserve

---

## SECTION E — ESPACE RÉSIDENT

---

### Form 28 — Portail Résident

**Route** : `/resident`
**Description** : Interface dédiée aux résidents pour consulter leur situation personnelle.

**Navigation** : Accessible avec un compte de type RÉSIDENT uniquement

**Contenu affiché**
- Situation financière du lot (dû / payé / reste)
- Historique des paiements
- Appels de charge en cours
- Notifications reçues

**API**
- `GET /api/resident/` — Données personnalisées du résident

---

### Form 29 — Notifications

**Route** : `/gouvernance/notifications`
**Description** : Envoyer et gérer les notifications vers les résidents.

**Navigation** : Sidebar → Gouvernance → Notifications

**Champs principaux**
- Destinataire (Tous les lots / lot spécifique)
- Sujet
- Message
- Type (Information, Rappel, Urgent)

**API**
- `GET /api/notifications/` — Lecture
- `POST /api/notification-send/` — Envoi d'une notification
- `GET /api/notification-mes/` — Notifications du résident connecté
- `PATCH /api/notification-read/{id}/` — Marquer comme lu

---

### Form 30 — Messages Résidents

**Route** : `/espace-resident/messages`
**Description** : Système de messagerie entre le syndic et les résidents.

**Navigation** : Sidebar → Espace Résident → Messages

**Champs principaux**
- Objet du message
- Contenu
- Lot destinataire

**API**
- `GET /api/messages-resident/` — Lecture (admin: tous | résident: les siens)
- `POST /api/messages-resident/submit/` — Envoyer un message (résident)
- `PATCH /api/messages-resident/{id}/` — Modifier statut (admin)
- `GET /api/messages-resident/mes/` — Messages du résident connecté

---

### Form 31 — Consultation Résident (Vue Admin)

**Route** : `/espace-resident/consultation`
**Description** : Vue administrateur simulant le portail résident pour un lot spécifique.

**Navigation** : Tableau de bord → Vue Résident

**Contenu affiché** : Identique au portail résident, mais avec sélection du lot à consulter.

**API**
- `GET /api/resident-lot-preview/{lot_id}/` — Aperçu situation d'un lot spécifique

---

### Form 32 — Vote Résident

**Route** : `/espace-resident/votes`
**Description** : Interface de vote en ligne pour les résidents.

**Navigation** : Notification → lien de vote, ou portail résident

**Contenu affiché**
- Liste des résolutions en cours (`EN_COURS`)
- Pour chaque résolution : intitulé, description, type de vote
- Boutons de vote : OUI / NON / Neutre
- Accusé de réception

**Logique métier** : Un résident ne peut voter qu'une seule fois par résolution. Le statut `EN_COURS` est calculé automatiquement depuis les dates.

**API**
- `GET /api/resolutions-vote/mes/` — Résolutions avec état de vote du résident
- `POST /api/resolutions-vote/{id}/voter/` — Enregistrer le vote
- `POST /api/resolutions-vote/{id}/accuser/` — Accuser réception

---

## SECTION F — COMPTABILITÉ

---

### Form 33 — Journal Comptable

**Route** : `/comptabilite/journal`
**Description** : Journal des écritures comptables de la résidence.

**Navigation** : Sidebar → Comptabilité → Journal, ou Tableau de bord → Journal

**Contenu affiché** : Toutes les écritures dans l'ordre chronologique avec débit/crédit par compte.

**Filtres** : Période, compte, type d'opération

**Exports** : Excel, PDF

**API**
- `GET /api/comptabilite/journal/` — Données
- `GET /api/comptabilite/journal/excel/` — Export Excel
- `GET /api/comptabilite/journal/pdf/` — Export PDF

---

### Form 34 — Grand Livre

**Route** : `/comptabilite/grand-livre`
**Description** : Détail des mouvements par compte comptable.

**Navigation** : Tableau de bord → Grand Livre

**API**
- `GET /api/comptabilite/grand-livre/` — Données

---

### Form 35 — Balance

**Route** : `/comptabilite/balance`
**Description** : Balance générale des comptes (soldes débiteurs et créditeurs).

**Navigation** : Tableau de bord → Balance

**API**
- `GET /api/comptabilite/balance/` — Données
- `GET /api/comptabilite/balance/excel/` — Export Excel
- `GET /api/comptabilite/balance/pdf/` — Export PDF

---

### Form 36 — CPC (Compte de Produits et Charges)

**Route** : `/comptabilite/cpc`
**Description** : État des produits et charges de l'exercice.

**Navigation** : Tableau de bord → CPC

**API**
- `GET /api/comptabilite/cpc/` — Données
- `GET /api/comptabilite/cpc/excel/` — Export Excel
- `GET /api/comptabilite/cpc/pdf/` — Export PDF

---

### Form 37 — Bilan

**Route** : `/comptabilite/bilan`
**Description** : Bilan actif/passif de la résidence.

**Navigation** : Tableau de bord → Bilan

**API**
- `GET /api/comptabilite/bilan/` — Données
- `GET /api/comptabilite/bilan/excel/` — Export Excel
- `GET /api/comptabilite/bilan/pdf/` — Export PDF

---

## SECTION G — ADMINISTRATION

---

### Form 38 — Import

**Route** : `/import`
**Description** : Importer des données en masse depuis un fichier Excel.

**Navigation** : Sidebar → Paramétrage → Import

**Fonctionnement** : Télécharger le template Excel, remplir les données, importer le fichier.

**API**
- `GET /api/import/template/` — Télécharger le modèle Excel
- `POST /api/import/excel/` — Importer les données

---

### Form 39 — Export

**Route** : `/export`
**Description** : Exporter les données de l'application en Excel.

**Navigation** : Sidebar → Paramétrage → Export

**API**
- `GET /api/export/excel/` — Export complet en Excel

---

### Form 40 — Archivage

**Route** : `/archivage`
**Description** : Archiver une période comptable passée pour alléger les données actives.

**Navigation** : Sidebar → Paramétrage → Archivage

**Fonctionnement**
1. Choisir la période à archiver (date début → date fin)
2. Lancer l'archivage : les données sont compressées, un `ARCHIVE_ADJUSTMENT` est créé en caisse avec le solde de clôture
3. Restaurer une archive si nécessaire

**Logique métier** : Après archivage, le solde caisse est représenté par l'ajustement d'archive. Toutes les vues (caisse, passation) continuent à fonctionner correctement car l'`ARCHIVE_ADJUSTMENT` est traité comme un mouvement normal.

**API**
- `GET /api/archives/` — Liste des archives
- `POST /api/archives/create/` — Créer une archive
- `POST /api/archives/{id}/restore/` — Restaurer une archive

---

### Form 41 — Gestion Utilisateurs

**Route** : `/gestion-utilisateurs`
**Description** : Gérer les comptes utilisateurs de la résidence (admins et résidents).

**Navigation** : Sidebar → Paramétrage → Utilisateurs (Admin uniquement)

**Champs principaux**
- Nom d'utilisateur
- Email
- Rôle (Admin / Résident)
- Lot associé (pour les résidents)
- Mot de passe (reset)

**API**
- `GET /api/residence-users/` — Liste des utilisateurs
- `POST /api/residence-users/` — Créer un utilisateur
- `PATCH /api/residence-users/{id}/` — Modifier
- `POST /api/residence-users/{id}/reset-password/` — Réinitialiser mot de passe

---

### Form 42 — Initialisation Complète

**Route** : `/initialisation`
**Description** : Réinitialiser toutes les données de la résidence (reset factory). Action irréversible.

**Navigation** : Sidebar → Paramétrage → Initialisation complète (Admin uniquement)

**Logique métier** : Supprime toutes les données financières, lots, personnes, AG, résolutions. Ne supprime pas le compte administrateur ni la résidence elle-même.

**API**
- `POST /api/init-complete/` — Réinitialisation complète

---

### Form 43 — Aide

**Route** : `/aide`
**Description** : Guide utilisateur en accordion avec explications par module.

**Navigation** : Sidebar → Aide (en bas), ou Tableau de bord → Aide

---

## SECTION H — INTELLIGENCE ARTIFICIELLE

---

### Form 44 — Chat IA

**Route** : `/ia/chat`
**Description** : Assistant IA pour guider l'utilisateur, répondre à ses questions sur la gestion ou analyser la situation de la résidence.

**Navigation** : Sidebar → IA → Chat

**Fonctionnement**
1. L'utilisateur pose une question en langage naturel
2. Le backend détecte si la question nécessite des données réelles (mots-clés : caisse, solde, lot, paiement...)
3. Si oui : le backend calcule un résumé (total dû, payé, solde...) et l'envoie à l'IA
4. L'IA répond en français, en s'appuyant sur les documents PDF chargés et/ou le résumé fourni

**Règles de sécurité** : L'IA n'a jamais accès direct à la base de données. Elle reçoit uniquement des résumés structurés.

**API**
- `POST /api/ai/chat/` — Envoyer un message
  - Body : `{ "message": "...", "history": [...] }`
  - Réponse : `{ "reply": "..." }`

---

### Form 45 — Paramétrage IA

**Route** : `/parametrage/ia`
**Description** : Configurer le modèle LLM utilisé par l'assistant IA et charger les documents de référence.

**Navigation** : Sidebar → Paramétrage → IA

**Champs principaux**
- URL de l'API LLM (ex: `https://api.groq.com/openai/v1/chat/completions`)
- Clé API (masquée après sauvegarde)
- Modèle (ex: `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`)
- Instructions système (prompt de comportement de l'IA)
- Documents PDF à charger (règlement, lois, procédures...)

**Compatibilité LLM** : Tout service compatible OpenAI Chat Completions fonctionne (Groq, DeepSeek, OpenAI, Mistral, Ollama local).

**API**
- `GET /api/ai/config/` — Lecture configuration
- `PUT /api/ai/config/` — Sauvegarde configuration
- `GET /api/ai/documents/` — Liste des documents
- `POST /api/ai/documents/` — Upload document PDF
- `DELETE /api/ai/documents/{id}/` — Supprimer un document
- `PATCH /api/ai/documents/{id}/` — Activer/désactiver un document

---

## SECTION I — SUPERUSER

---

### Form 46 — Dashboard Superuser

**Route** : `/superuser`
**Description** : Interface d'administration globale pour le superuser Django. Accessible uniquement avec le compte superuser.

**Navigation** : Connexion avec le compte superuser → redirection automatique

**Section 1 — Configuration IA Globale**
- URL API, Clé API, Modèle, Instructions système
- Configuration unique partagée par toutes les résidences

**Section 2 — Gestion des Résidences**
- Liste toutes les résidences : nom, ville, date création, nombre de lots
- Par résidence : liste des administrateurs avec bouton **🔑 Changer MP**
- Bouton **+ Nouvelle résidence** : crée une résidence + un compte admin en une seule opération

**API**
- `GET /api/superuser/residences/` — Liste toutes les résidences
- `POST /api/superuser/set-password/` — Réinitialiser le mot de passe d'un admin
- `GET/PUT /api/superuser/ai-config/` — Configuration IA globale
- `POST /api/setup/` — Créer une résidence avec son admin
- `GET /api/me/` — Infos utilisateur connecté (retourne `is_superuser: true`)

---

## ANNEXE — RÉFÉRENCE RAPIDE API

| Entité | Endpoint | Méthodes |
|--------|----------|----------|
| Résidences | `/api/residences/` | GET, PATCH |
| Groupes | `/api/groupes/` | GET, POST, PATCH, DELETE |
| Lots | `/api/lots/` | GET, POST, PATCH, DELETE |
| Personnes | `/api/personnes/` | GET, POST, PATCH, DELETE |
| Paiements | `/api/paiements/` | GET, POST, PATCH, DELETE |
| Appels de charge | `/api/appels-charge/` | GET, POST, PATCH, DELETE |
| Détails appel | `/api/details-appel/` | GET, PATCH |
| Dépenses | `/api/depenses/` | GET, POST, PATCH, DELETE |
| Recettes | `/api/recettes/` | GET, POST, PATCH, DELETE |
| Caisse | `/api/caisse-mouvements/` | GET, POST, DELETE |
| Rapport financier | `/api/rapport-financier/` | GET |
| Situation paiements | `/api/situation-paiements/` | GET |
| Assemblées | `/api/assemblees/` | GET, POST, PATCH, DELETE |
| Bureau syndical | `/api/bureau-syndical/` | GET, POST, PATCH, DELETE |
| Résolutions AG | `/api/resolutions/` | GET, POST, PATCH, DELETE |
| Résolutions vote | `/api/resolutions-vote/` | GET, POST, PATCH, DELETE |
| Documents | `/api/documents-gouvernance/` | GET, POST, DELETE |
| Travaux | `/api/travaux/` | GET, POST, PATCH, DELETE |
| Notifications | `/api/notifications/` | GET, POST |
| Passations | `/api/passations/` | GET, POST, PATCH, DELETE |
| Archives | `/api/archives/` | GET, POST |
| Utilisateurs résidence | `/api/residence-users/` | GET, POST, PATCH |
| Chat IA | `/api/ai/chat/` | POST |
| Config IA | `/api/ai/config/` | GET, PUT |
| Documents IA | `/api/ai/documents/` | GET, POST, DELETE |

---

## ANNEXE — MODÈLES DE DONNÉES PRINCIPAUX

| Modèle | Table | Champs clés |
|--------|-------|-------------|
| Residence | syndic_residence | nom_residence, ville_residence, statut_residence |
| Lot | syndic_lot | numero_lot, groupe, quote_part, proprietaire |
| Groupe | syndic_groupe | nom_groupe |
| Personne | syndic_personne | nom, prenom, cin, telephone, email |
| AppelCharge | syndic_appelcharge | type_charge (CHARGE/FOND), exercice, date_emission |
| DetailAppelCharge | syndic_detailappelcharge | lot, appel, montant, montant_recu, statut |
| Paiement | syndic_paiement | lot, montant, date_paiement, mode_paiement, mois |
| AffectationPaiement | syndic_affectationpaiement | paiement, detail, montant_affecte |
| Depense | syndic_depense | libelle, montant, date_depense, famille, fournisseur |
| Recette | syndic_recette | libelle, montant, date_recette, compte |
| CaisseMouvement | syndic_caissemouvement | type_mouvement, sens (DEBIT/CREDIT), montant, date_mouvement |
| AssembleeGenerale | syndic_assembleegenerale | date_ag, type_ag, statut, ordre_du_jour |
| Resolution | syndic_resolution | titre, resultat, voix_pour, voix_contre, assemblee |
| ResolutionVote | syndic_resolutionvote | intitule, statut (calculé), date_debut_vote, date_cloture_vote |
| VoteResident | syndic_voteresident | resolution, lot, choix (OUI/NON/NEUTRE) |
| PassationConsignes | syndic_passationconsignes | date_passation, solde_caisse, solde_banque, nom_syndic... |
| ArchiveComptable | syndic_archivecomptable | date_debut, date_fin, solde_archive |
| AIConfig | syndic_aiconfig | api_url, api_key, model_name, system_prompt (residence=None = global) |
| AIDocument | syndic_aidocument | nom, fichier, texte_extrait, actif |

---

*Documentation générée le 25 mars 2026 — Syndic Pro v1.0*
