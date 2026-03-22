import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Section({ title, icon, children, defaultOpen = false, color = "indigo" }) {
  const [open, setOpen] = useState(defaultOpen);
  const borderColors = { indigo: "border-l-indigo-500", blue: "border-l-blue-500", emerald: "border-l-emerald-500", violet: "border-l-violet-500", amber: "border-l-amber-500", sky: "border-l-sky-500", slate: "border-l-slate-400" };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-slate-400 flex-shrink-0 transition-transform" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && (
        <div className={`px-5 pb-5 pt-2 border-t border-slate-100 text-sm text-slate-600 space-y-3 border-l-4 ${borderColors[color] || borderColors.indigo}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function Badge({ children, color = "blue" }) {
  const colors = { blue: "bg-blue-100 text-blue-700", green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-600", indigo: "bg-indigo-100 text-indigo-700", slate: "bg-slate-100 text-slate-600", violet: "bg-violet-100 text-violet-700", sky: "bg-sky-100 text-sky-700" };
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${colors[color]}`}>{children}</span>;
}

function FlowStep({ number, label, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{number}</div>
      <div>
        <div className="font-medium text-slate-700 text-sm">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{sub}</div>}
      </div>
    </div>
  );
}

function InfoBox({ color = "slate", title, children }) {
  const colors = { slate: "bg-slate-50 border-slate-200", blue: "bg-blue-50 border-blue-200", amber: "bg-amber-50 border-amber-200", green: "bg-emerald-50 border-emerald-200", indigo: "bg-indigo-50 border-indigo-200", violet: "bg-violet-50 border-violet-200", red: "bg-red-50 border-red-200" };
  const titleColors = { slate: "text-slate-700", blue: "text-blue-700", amber: "text-amber-700", green: "text-emerald-700", indigo: "text-indigo-700", violet: "text-violet-700", red: "text-red-700" };
  return (
    <div className={`rounded-xl border p-3 text-xs ${colors[color]}`}>
      {title && <div className={`font-semibold mb-1.5 ${titleColors[color]}`}>{title}</div>}
      <div className="text-slate-600 space-y-1 leading-relaxed">{children}</div>
    </div>
  );
}

function Row({ label, desc }) {
  return (
    <div className="flex gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-700 w-36 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-500 leading-relaxed">{desc}</span>
    </div>
  );
}

export default function HelpPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-8">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-extrabold mb-1">Guide d'utilisation — Syndic Pro</h1>
        <p className="text-indigo-200 text-sm">
          Plateforme complète de gestion de copropriété : finances, gouvernance, résidents, comptabilité.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {["Configuration", "Finances", "Suivi", "Gouvernance", "Résident", "Comptabilité"].map(t => (
            <span key={t} className="text-[11px] bg-white/15 border border-white/25 px-2.5 py-0.5 rounded-full font-semibold">{t}</span>
          ))}
        </div>
      </div>

      {/* ── 1. Vue d'ensemble ── */}
      <Section title="Vue d'ensemble — Tableau de bord" icon="🏠" defaultOpen color="indigo">
        <p className="text-xs text-slate-500">La page d'accueil après connexion. Elle présente la fiche de la résidence (logo, adresse, statut) et donne un accès direct aux principales sections.</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ["⚙️ Configuration", "Résidence, Lots, Appels de charge et de fond"],
            ["📈 Suivi",          "Synthèse, Rapport financier, Timeline, État mensuel"],
            ["🏛️ Gouvernance",   "Assemblées, Documents, Résolutions, Événements"],
            ["🏠 Espace résident","Notifications, Messages, Vue résident"],
            ["📒 Comptabilité",   "Journal, Grand Livre, Balance, CPC, Bilan"],
          ].map(([k, v]) => (
            <div key={k} className="bg-slate-50 rounded-xl p-2.5">
              <div className="font-semibold text-slate-700">{k}</div>
              <div className="text-slate-500 mt-0.5 text-[11px]">{v}</div>
            </div>
          ))}
        </div>
        <InfoBox color="blue" title="État mensuel — Entrées / Sorties">
          <p>Bouton dédié sur le tableau de bord. Permet de sélectionner un mois et voir :</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li><strong>Entrées du mois</strong> : paiements et recettes reçus</li>
            <li><strong>Sorties du mois</strong> : dépenses engagées</li>
            <li><strong>État global paiements</strong> : tableau croisé lot × mois montrant quels mois ont été couverts par les paiements (logique carry-over — un paiement annuel unique coche tous les mois)</li>
          </ul>
        </InfoBox>
      </Section>

      {/* ── 2. Configuration ── */}
      <Section title="Configuration — Résidence et Lots" icon="⚙️" color="blue">
        <InfoBox color="blue" title="Fiche Résidence">
          <p>Renseigner les informations générales de la copropriété :</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li><strong>Nom, adresse, ville, code postal</strong> — affichés sur le tableau de bord et les rapports</li>
            <li><strong>Email</strong> — lien de contact affiché sur le tableau de bord</li>
            <li><strong>Logo</strong> — image PNG/JPG, <strong>100 Ko maximum</strong>. Affiché sur le tableau de bord et le portail résident. Compresser l'image avant envoi.</li>
            <li><strong>Description</strong> — texte libre, visible sur le tableau de bord</li>
          </ul>
        </InfoBox>
        <InfoBox color="slate" title="Gestion des Lots">
          <p>Chaque lot représente un appartement, local ou parking de la résidence.</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Champs : numéro de lot, groupe (bâtiment), surface, étage, type</li>
            <li>Rattachement à un <strong>propriétaire</strong> (personne physique ou morale)</li>
            <li>La <strong>Fiche Lot</strong> affiche l'historique complet : appels, paiements, état financier</li>
            <li>Vue Kanban disponible depuis <strong>Lots</strong> dans la navigation, triée par groupe puis numéro</li>
          </ul>
        </InfoBox>
        <InfoBox color="indigo" title="Appels de charge et Appels de fond">
          <div className="space-y-2 mt-1">
            <div>
              <span className="font-semibold text-indigo-700">Appel de charge</span> — charges ordinaires de la résidence (entretien, gardiennage, eau, électricité parties communes). Fréquence annuelle.
            </div>
            <div>
              <span className="font-semibold text-violet-700">Appel de fond</span> — provision exceptionnelle pour travaux ou investissements (ravalement, ascenseur, toiture). Séparé comptablement.
            </div>
          </div>
          <div className="mt-2 bg-white border border-indigo-100 rounded-lg p-2 space-y-1">
            <div className="font-semibold text-indigo-700 text-[11px]">Mode d'emploi :</div>
            <div className="text-[11px] text-slate-600">1. Créer l'appel (exercice, date d'émission)</div>
            <div className="text-[11px] text-slate-600">2. Ouvrir <strong>Détails de l'appel</strong> → saisir le montant dû pour chaque lot</div>
            <div className="text-[11px] text-slate-600">3. Le suivi par lot (dû / payé / reste) est calculé automatiquement</div>
          </div>
        </InfoBox>
      </Section>

      {/* ── 3. Finances ── */}
      <Section title="Finances — Paiements, Dépenses, Recettes, Caisse" icon="💰" color="emerald">
        <div className="space-y-2">
          <InfoBox color="green" title="Paiements — Enregistrer et ventiler">
            <p>Sélectionner le lot, saisir le montant, la date, le mode (espèces / virement / chèque) et la référence. Cliquer <strong>Enregistrer</strong> puis confirmer.</p>
            <p className="mt-1">La <strong>ventilation automatique</strong> répartit le montant sur les appels en attente du plus ancien au plus récent :</p>
            <div className="mt-1.5 bg-white border border-emerald-100 rounded-lg p-2 text-[10px]">
              <div className="grid grid-cols-4 gap-1 font-semibold text-slate-500 mb-1">
                <span>Appel</span><span className="text-right">Dû</span><span className="text-right text-emerald-600">Ventilé</span><span className="text-right">Reste</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-slate-600">
                <span>Charge 2024</span><span className="text-right">800</span><span className="text-right text-emerald-600">800</span><span className="text-right">0</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-slate-600">
                <span>Charge 2025</span><span className="text-right">600</span><span className="text-right text-emerald-600">400</span><span className="text-right">200</span>
              </div>
              <div className="text-slate-400 mt-1">Paiement 1 200 MAD → 2024 soldé, 2025 partiel (200 restants)</div>
            </div>
            <p className="mt-1">Si le montant dépasse toutes les dettes, le <strong>solde non ventilé</strong> reste disponible pour le prochain appel.</p>
          </InfoBox>

          <InfoBox color="amber" title="Dépenses">
            <p>Enregistrement des sorties de trésorerie : fournisseurs, entretien, services, charges courantes.</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li>Champs : date, libellé, montant, fournisseur, catégorie, famille, compte comptable</li>
              <li>Chaque dépense génère automatiquement une <strong>sortie de caisse</strong></li>
              <li>Configurer les catégories dans <strong>Paramétrage → Catégories de dépense</strong></li>
            </ul>
          </InfoBox>

          <InfoBox color="blue" title="Recettes diverses">
            <p>Enregistrement des entrées hors paiements copropriétaires : locations, subventions, remboursements.</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li>Chaque recette génère une <strong>entrée de caisse</strong></li>
            </ul>
          </InfoBox>

          <InfoBox color="slate" title="Caisse — journal automatique">
            <p>La caisse reflète en temps réel la trésorerie. Chaque opération génère un mouvement :</p>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <div className="bg-white border border-slate-200 rounded p-1.5 text-[11px]"><span className="font-semibold text-emerald-600">+ Entrée</span> : paiement, recette</div>
              <div className="bg-white border border-slate-200 rounded p-1.5 text-[11px]"><span className="font-semibold text-red-600">− Sortie</span> : dépense</div>
            </div>
            <p className="mt-1">La suppression d'une opération annule automatiquement le mouvement associé.</p>
          </InfoBox>
        </div>
      </Section>

      {/* ── 4. Suivi financier ── */}
      <Section title="Suivi financier — Rapports et Analyses" icon="📊" color="emerald">
        <div className="space-y-2">
          <Row label="Synthèse des lots" desc="Tableau récapitulatif lot par lot : montant dû, total payé, reste à recouvrer. Filtres et tri disponibles. Accès depuis Suivi → Synthèse." />
          <Row label="Rapport financier" desc="KPIs globaux (total entrées, dépenses, solde caisse), journal des mouvements, situation des lots. Exportable en Excel (5 feuilles) ou PDF." />
          <Row label="Timeline paiements" desc="Analyse visuelle mois par mois. Pour chaque lot, une barre de 12 segments montre quels mois sont couverts par les paiements reçus (logique carry-over). Filtres : Appel de charge / Appel de fond, année, statut (soldé / partiel / impayé)." />
          <Row label="État mensuel" desc="Sélectionner un mois : voir les entrées et sorties de ce mois en kanban, puis le tableau croisé lot × 12 mois montrant l'avancement des paiements. Un paiement couvrant 4 mois coche JAN FEV MAR AVR automatiquement." />
        </div>
        <InfoBox color="indigo" title="Logique carry-over">
          <p>Le système considère que les paiements couvrent les mois dans l'ordre (JAN → DÉC). Un lot qui paie 50% de l'annuel en une fois a JAN + FEV + MAR + AVR + MAI + JUN cochés. Cela permet une lecture immédiate de l'avancement sans avoir besoin de savoir en quel mois chaque paiement a été fait.</p>
        </InfoBox>
      </Section>

      {/* ── 5. Gouvernance ── */}
      <Section title="Gouvernance — AG, Bureau, Documents" icon="🏛️" color="violet">
        <div className="space-y-1">
          <Row label="Assemblées générales" desc="Créer et archiver les AG (date, lieu, quorum, taux de présence, PV). Les résidents voient la dernière AG publiée dans leur portail." />
          <Row label="Bureau syndical" desc="Composition du bureau (président, trésorier, secrétaire, membres). Si le bureau n'est pas encore constitué, le formulaire est grisé. Les résidents voient les membres dans leur portail." />
          <Row label="Résolutions" desc="Décisions adoptées lors des AG : libellé, résultat (adoptée / rejetée / reportée), AG de référence. Consultables par les résidents." />
          <Row label="Documents" desc="Partage de fichiers (règlement de copropriété, PV, contrats, plans). Téléchargeables depuis le portail résident." />
          <Row label="Événements / Travaux" desc="Suivi des interventions et chantiers en cours : titre, description, dates, statut (planifié / en cours / terminé)." />
        </div>
      </Section>

      {/* ── 6. Espace résident ── */}
      <Section title="Espace résident — Portail et Communication" icon="🏠" color="indigo">
        <InfoBox color="indigo" title="Portail résident (/resident)">
          <p>Espace personnel sécurisé accessible aux résidents avec leur propre identifiant. Contient :</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li><strong>Ma situation financière</strong> : dû / payé / reste par appel — liste kanban mobile</li>
            <li><strong>Mes notifications</strong> : messages broadcast de l'administrateur</li>
            <li><strong>Mes messages</strong> : échange direct avec le syndic (réclamations, demandes)</li>
            <li><strong>Rapport financier</strong> : bilan global de la résidence en lecture</li>
            <li><strong>Dernière AG</strong> : compte-rendu et résolutions adoptées</li>
            <li><strong>Documents</strong> : fichiers partagés par l'administrateur</li>
            <li><strong>Événements</strong> : travaux et chantiers en cours</li>
            <li><strong>Bureau syndical</strong> : membres et contacts du bureau</li>
          </ul>
        </InfoBox>
        <InfoBox color="amber" title="Créer un compte résident">
          <p>Aller dans <strong>Paramétrage → Utilisateurs</strong> → bouton <strong>Nouveau</strong>.</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Rôle : sélectionner <strong>RÉSIDENT</strong></li>
            <li>Associer au lot correspondant</li>
            <li>Convention recommandée : <code className="bg-white border border-amber-200 rounded px-1">résidence_lot</code> comme identifiant et mot de passe initial</li>
            <li>Le résident devra changer son mot de passe à la première connexion</li>
          </ul>
        </InfoBox>
        <InfoBox color="green" title="Messages résidents (vue administrateur)">
          <p>Accessibles depuis <strong>Espace résident → Messages</strong>. Pour chaque message :</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Changer le statut : <Badge color="red">Nouveau</Badge> → <Badge color="amber">En cours</Badge> → <Badge color="green">Résolu</Badge></li>
            <li>Rédiger une réponse dans la zone de texte</li>
            <li>Cliquer <strong>Enregistrer</strong> — la zone se grise une fois enregistrée (ne pas envoyer deux fois)</li>
          </ul>
        </InfoBox>
        <InfoBox color="blue" title="Notifications">
          <p>Envoi de messages broadcast à tous les résidents ou à un lot spécifique. Types disponibles : SMS, Message, Système. Historique consultable avec filtres par type, statut et recherche.</p>
        </InfoBox>
      </Section>

      {/* ── 7. Comptabilité ── */}
      <Section title="Comptabilité — États financiers" icon="📒" color="sky">
        <p className="text-xs text-slate-500">Les états comptables sont générés automatiquement depuis les opérations saisies. Aucune écriture manuelle n'est nécessaire.</p>
        <div className="space-y-2 mt-2">
          <Row label="Journal" desc="Liste chronologique de toutes les écritures comptables. Chaque paiement, dépense ou recette génère une écriture débit/crédit selon le plan comptable." />
          <Row label="Grand Livre" desc="Récapitulatif par compte comptable : solde cumulé et détail de toutes les écritures. Permet de vérifier la cohérence compte par compte." />
          <Row label="Balance" desc="Tableau de tous les comptes avec totaux débit, crédit et solde. Vérifie l'équilibre général (total débit = total crédit). Utilisée pour valider la clôture." />
          <Row label="CPC" desc="Compte de Produits et Charges : compare produits (paiements, recettes) et charges (dépenses) sur un exercice. Le solde donne le résultat net de la résidence." />
          <Row label="Bilan" desc="Photographie du patrimoine à une date donnée : actif (caisse, créances) et passif (dettes fournisseurs). Actif = Passif." />
        </div>
      </Section>

      {/* ── 8. Archivage ── */}
      <Section title="Archivage comptable — Clôture de période" icon="🗄️" color="slate">
        <p className="text-xs text-slate-500">L'archivage clôture une période financière et libère la base de données opérationnelle.</p>
        <InfoBox color="slate" title="Ce que fait une archive">
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Déplace dépenses, paiements et recettes d'une période sélectionnée dans des tables d'archive</li>
            <li>Calcule le solde net (recettes − dépenses) de la période</li>
            <li>Crée un <strong>ajustement de caisse unique</strong> représentant ce solde — le solde de caisse reste exact</li>
            <li>Les données archivées restent visibles dans les rapports historiques</li>
          </ul>
        </InfoBox>
        <InfoBox color="blue" title="Restauration">
          <p>Une archive peut être restaurée à tout moment depuis <strong>Paramétrage → Archivage</strong>. Les enregistrements reviennent dans les tables opérationnelles et l'ajustement est supprimé.</p>
        </InfoBox>
        <p className="text-xs text-slate-400">Accessible aux <strong>administrateurs uniquement</strong>.</p>
      </Section>

      {/* ── 9. Paramétrage ── */}
      <Section title="Paramétrage — Import, Export, Utilisateurs" icon="🔧" color="amber">
        <div className="space-y-1">
          <Row label="Import" desc="Importation de données depuis un fichier Excel : lots, personnes, paiements, dépenses. Respecter le format du modèle téléchargeable." />
          <Row label="Export" desc="Export des données en Excel ou PDF : lots, appels, paiements, dépenses, rapport financier complet." />
          <Row label="Utilisateurs" desc="Gestion des comptes : créer, modifier, activer/désactiver, réinitialiser le mot de passe. Rôles disponibles : Super Admin, Admin, Gestionnaire, Résident." />
          <Row label="Initialisation" desc="Réinitialisation complète des données de la résidence (remise à zéro). Action irréversible réservée au Super Admin. Une confirmation est demandée." />
        </div>
        <InfoBox color="amber" title="Rôles et permissions">
          <div className="space-y-1">
            <div><Badge color="red">Super Admin</Badge> — accès total, initialisation, gestion des admins</div>
            <div><Badge color="indigo">Admin</Badge> — accès complet sauf initialisation</div>
            <div><Badge color="blue">Gestionnaire</Badge> — accès aux finances et messages résidents</div>
            <div><Badge color="green">Résident</Badge> — portail résident uniquement (lecture + messagerie)</div>
          </div>
        </InfoBox>
      </Section>

      {/* ── 10. Circuit financier ── */}
      <Section title="Circuit financier complet — mode emploi" icon="🔄" color="emerald">
        <p className="text-xs text-slate-500 mb-2">Enchaînement des étapes pour gérer une résidence de A à Z :</p>
        <div className="space-y-3">
          <FlowStep number="1" label="Configurer la résidence"
            sub="Tableau de bord → Résidence : renseigner nom, adresse, email, logo (< 100 Ko). Puis créer les groupes (bâtiments) et les lots avec leurs propriétaires." />
          <FlowStep number="2" label="Émettre un appel de charge ou de fond"
            sub="Configuration → Appel de charge (ou Appel de fond) : créer l'appel pour l'exercice. Puis Détails → saisir le montant dû pour chaque lot." />
          <FlowStep number="3" label="Enregistrer les paiements reçus"
            sub="Finances → Paiements : sélectionner le lot, saisir montant + date + mode. Confirmer. La ventilation automatique répartit sur les appels en attente." />
          <FlowStep number="4" label="Enregistrer les dépenses"
            sub="Finances → Dépenses : saisir les sorties (fournisseurs, entretien, charges). Chaque dépense débite automatiquement la caisse." />
          <FlowStep number="5" label="Suivre la trésorerie"
            sub="Finances → Caisse : journal temps réel. Suivi → Rapport financier : KPIs + situation des lots + mouvements détaillés. Exportable Excel/PDF." />
          <FlowStep number="6" label="Analyser les paiements par lot"
            sub="Suivi → Timeline : visualiser mois par mois la couverture des paiements. État mensuel : croiser lots × mois pour voir l'avancement global." />
          <FlowStep number="7" label="Communiquer avec les résidents"
            sub="Espace résident → Notifications : envoyer des messages broadcast. Messages : répondre aux réclamations individuelles. Les résidents se connectent sur /resident." />
          <FlowStep number="8" label="Clôturer la période"
            sub="Paramétrage → Archivage : archiver la période passée. Les données sont consolidées en un seul ajustement de caisse. La base opérationnelle est allégée." />
        </div>
      </Section>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pt-2 pb-4">
        Syndic Pro — © {new Date().getFullYear()}
      </div>
    </div>
  );
}
