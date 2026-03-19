import { useState } from "react";

function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-slate-400 flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 text-sm text-slate-600 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function Badge({ children, color = "blue" }) {
  const colors = {
    blue:    "bg-blue-100 text-blue-700",
    green:   "bg-emerald-100 text-emerald-700",
    amber:   "bg-amber-100 text-amber-700",
    red:     "bg-red-100 text-red-600",
    indigo:  "bg-indigo-100 text-indigo-700",
    slate:   "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${colors[color]}`}>
      {children}
    </span>
  );
}

function FlowStep({ number, label, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <div className="font-medium text-slate-700">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function InfoBox({ color = "slate", title, children }) {
  const colors = {
    slate:  "bg-slate-50 border-slate-200",
    blue:   "bg-blue-50 border-blue-200",
    amber:  "bg-amber-50 border-amber-200",
    green:  "bg-emerald-50 border-emerald-200",
    indigo: "bg-indigo-50 border-indigo-200",
  };
  const titleColors = {
    slate:  "text-slate-700",
    blue:   "text-blue-700",
    amber:  "text-amber-700",
    green:  "text-emerald-700",
    indigo: "text-indigo-700",
  };
  return (
    <div className={`rounded-xl border p-3 text-xs ${colors[color]}`}>
      {title && <div className={`font-semibold mb-1.5 ${titleColors[color]}`}>{title}</div>}
      <div className="text-slate-600 space-y-1">{children}</div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-bold mb-1">Aide — XYZ Syndic</h1>
        <p className="text-blue-100 text-sm">
          Guide d'utilisation de la plateforme de gestion de copropriété
        </p>
      </div>

      {/* 1. Présentation */}
      <Section title="Présentation de l'application" icon="🏢" defaultOpen={true}>
        <p>
          <strong>XYZ Syndic</strong> est une plateforme complète de gestion de résidence en copropriété. Elle couvre l'ensemble du cycle financier, de la gouvernance et de la communication avec les résidents.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
          {[
            ["💰 Finances",      "Paiements, dépenses, recettes, caisse"],
            ["📋 Appels",        "Charges ordinaires et fonds de travaux"],
            ["🏛️ Gouvernance",   "AG, bureau syndical, résolutions, documents"],
            ["👤 Résidents",     "Portail dédié, notifications, messagerie"],
            ["📊 Rapports",      "Rapport financier, situation des lots, export Excel/PDF"],
            ["🗄️ Archivage",     "Clôture de période, historique comptable"],
          ].map(([k, v]) => (
            <div key={k} className="bg-slate-50 rounded-xl p-3">
              <div className="font-semibold text-slate-700">{k}</div>
              <div className="text-slate-500 mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. Circuit financier */}
      <Section title="Circuit financier — vue d'ensemble" icon="🔄">
        <p className="text-slate-500 text-xs mb-3">
          Le flux standard de gestion financière d'une résidence suit ces étapes :
        </p>
        <div className="space-y-3">
          <FlowStep number="1" label="Configurer la résidence et les lots"
            sub="Renseigner l'adresse, les informations générales, puis créer les lots (appartements, locaux) et affecter un représentant à chacun." />
          <FlowStep number="2" label="Émettre un appel de charge ou de fond"
            sub="Créer l'appel (exercice, période, montant global), puis saisir les détails par lot dans la page Détails de l'appel." />
          <FlowStep number="3" label="Enregistrer les paiements des copropriétaires"
            sub="Dans Finances → Paiements : sélectionner le lot, saisir le montant reçu, puis ventiler sur les appels en attente." />
          <FlowStep number="4" label="Enregistrer les dépenses"
            sub="Dans Finances → Dépenses : saisir les sorties de caisse (fournisseurs, travaux, charges courantes)." />
          <FlowStep number="5" label="Consulter la caisse et le rapport financier"
            sub="La caisse est mise à jour automatiquement à chaque opération. Le rapport financier résume recettes, dépenses et situation des lots." />
        </div>
      </Section>

      {/* 3. Appels de charge et de fond */}
      <Section title="Appels de charge et appels de fond" icon="📋">
        <div className="space-y-3">
          <InfoBox color="blue" title="Appel de charge">
            <p>Facture périodique des <strong>charges ordinaires</strong> de la résidence (entretien, gardiennage, eau, électricité des parties communes…).</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li>Période : <strong>Annuel</strong> (charge annuelle) ou <strong>Fond</strong> (dotation particulière)</li>
              <li>Chaque lot reçoit un montant dû en fonction de sa quote-part ou d'un montant fixe</li>
              <li>Le montant dû par lot est saisi dans la page <strong>Détails de l'appel</strong></li>
            </ul>
          </InfoBox>
          <InfoBox color="indigo" title="Appel de fond">
            <p>Appel exceptionnel pour constituer une <strong>provision travaux</strong> ou financer un investissement (ravalement, ascenseur, toiture…).</p>
            <p className="mt-1">Fonctionne exactement comme l'appel de charge, mais est classé séparément pour distinguer l'épargne de l'entretien courant.</p>
          </InfoBox>
          <InfoBox color="amber" title="Suivi par lot">
            <p>Pour chaque lot, la page de détail affiche :</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li><strong>Montant dû</strong> : total de l'appel attribué à ce lot</li>
              <li><strong>Montant reçu</strong> : somme des paiements ventilés sur cet appel</li>
              <li><strong>Reste à payer</strong> : différence automatiquement calculée</li>
            </ul>
          </InfoBox>
        </div>
      </Section>

      {/* 4. Paiements et ventilation */}
      <Section title="Paiements et ventilation automatique" icon="💸">
        <p className="text-xs text-slate-500 mb-3">
          La ventilation est le mécanisme qui distribue un montant encaissé sur les dettes en attente d'un lot.
        </p>

        <InfoBox color="blue" title="Étape 1 — Enregistrer le paiement">
          <p>Sélectionner le lot, saisir :</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li><strong>Montant</strong> encaissé (ex. 1 200 MAD)</li>
            <li><strong>Date</strong> du paiement</li>
            <li><strong>Mode</strong> : espèces, virement, chèque</li>
            <li><strong>Référence</strong> : numéro de chèque, référence virement…</li>
            <li><strong>Période comptable</strong> (mois optionnel pour le suivi)</li>
          </ul>
        </InfoBox>

        <InfoBox color="indigo" title="Étape 2 — Ventiler le paiement">
          <p>Après enregistrement, cliquer sur <strong>Ventiler</strong>. Le système répartit automatiquement le montant sur les appels de charge (ou de fond) en attente, <strong>du plus ancien au plus récent</strong>.</p>
          <div className="mt-2 bg-white border border-indigo-100 rounded-lg p-2">
            <div className="font-semibold text-indigo-700 mb-1">Exemple concret :</div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wide">
                  <th className="text-left py-0.5">Appel</th>
                  <th className="text-right py-0.5">Dû</th>
                  <th className="text-right py-0.5">Ventilé</th>
                  <th className="text-right py-0.5">Reste</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr><td>Charge 2024</td><td className="text-right">800</td><td className="text-right text-emerald-600">800</td><td className="text-right">0</td></tr>
                <tr><td>Charge 2025</td><td className="text-right">600</td><td className="text-right text-emerald-600">400</td><td className="text-right">200</td></tr>
              </tbody>
            </table>
            <p className="text-slate-400 mt-1">Paiement de 1 200 MAD → 800 sur 2024 (soldé), 400 sur 2025 (partiel), solde restant : 200 MAD.</p>
          </div>
        </InfoBox>

        <InfoBox color="green" title="Solde non ventilé">
          <p>Si le montant encaissé dépasse la totalité des dettes, le <strong>solde non ventilé</strong> reste disponible sur le paiement. Il pourra être ventilé lors du prochain appel émis.</p>
        </InfoBox>

        <InfoBox color="amber" title="Modification d'un paiement">
          <p>Cliquer sur ✏️ dans l'historique pour modifier un paiement. Si le montant est modifié :</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Toutes les affectations existantes sont <strong>annulées automatiquement</strong></li>
            <li>La ventilation est <strong>recalculée depuis zéro</strong> avec le nouveau montant</li>
            <li>Les soldes de tous les appels concernés sont mis à jour</li>
          </ul>
        </InfoBox>
      </Section>

      {/* 5. Caisse */}
      <Section title="Caisse — mouvements automatiques" icon="🏦">
        <p>La caisse reflète en temps réel la trésorerie de la résidence. Chaque opération génère automatiquement un mouvement :</p>
        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
          {[
            ["Paiement enregistré",  "Entrée de caisse (+)", "green"],
            ["Dépense enregistrée",  "Sortie de caisse (−)", "red"],
            ["Recette enregistrée",  "Entrée de caisse (+)", "green"],
            ["Archivage de période", "Ajustement de solde", "slate"],
          ].map(([op, effet, color]) => (
            <div key={op} className="bg-slate-50 rounded-xl p-3">
              <div className="font-semibold text-slate-700">{op}</div>
              <Badge color={color} >{effet}</Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          La suppression d'une opération annule automatiquement le mouvement de caisse correspondant.
        </p>
      </Section>

      {/* 6. Rapport financier */}
      <Section title="Rapport financier et situation des lots" icon="📊">
        <p>Accessible depuis le <strong>Tableau de bord → Rapport financier</strong>. Il affiche :</p>
        <ul className="list-disc pl-4 space-y-1 text-xs text-slate-500 mt-1">
          <li><strong>KPIs</strong> : total recettes, total dépenses, solde de caisse</li>
          <li><strong>Mouvements de caisse</strong> : journal détaillé de toutes les opérations</li>
          <li><strong>Situation des lots</strong> : pour chaque lot, total dû / total payé / reste à recouvrer</li>
        </ul>
        <InfoBox color="blue" title="Export disponible">
          <p>Le rapport peut être exporté en <strong>Excel</strong> (5 feuilles) ou en <strong>PDF</strong> depuis les boutons en haut de la page.</p>
        </InfoBox>
      </Section>

      {/* 7. Comptabilité */}
      <Section title="Comptabilité" icon="📒">
        <p className="text-xs text-slate-500 mb-3">
          Le module comptabilité génère automatiquement les états financiers à partir des opérations saisies (paiements, dépenses, recettes).
        </p>
        <div className="space-y-2 text-xs">
          <InfoBox color="slate" title="Journal">
            <p>Liste chronologique de toutes les écritures comptables. Chaque opération enregistrée (paiement, dépense, recette) génère automatiquement une écriture au débit et au crédit selon le plan comptable de la résidence.</p>
          </InfoBox>
          <InfoBox color="blue" title="Grand Livre">
            <p>Récapitulatif par compte comptable. Pour chaque compte, affiche le solde cumulé et le détail de toutes les écritures qui le concernent. Permet de vérifier la cohérence compte par compte.</p>
          </InfoBox>
          <InfoBox color="indigo" title="Balance">
            <p>Tableau récapitulatif de tous les comptes avec leurs totaux débit, crédit et solde. Vérifie l'équilibre général : <strong>total débit = total crédit</strong>. Utilisée pour valider la clôture d'exercice.</p>
          </InfoBox>
          <InfoBox color="amber" title="CPC — Compte de Produits et Charges">
            <p>État de synthèse qui compare <strong>produits</strong> (recettes, paiements copropriétaires) et <strong>charges</strong> (dépenses, services) sur un exercice. Le solde donne le résultat net de la résidence.</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <div className="bg-white border border-amber-100 rounded p-1.5">
                <div className="font-semibold text-emerald-700 mb-0.5">Produits</div>
                <div className="text-slate-500 space-y-0.5">
                  <div>Paiements copropriétaires</div>
                  <div>Recettes diverses</div>
                </div>
              </div>
              <div className="bg-white border border-amber-100 rounded p-1.5">
                <div className="font-semibold text-red-700 mb-0.5">Charges</div>
                <div className="text-slate-500 space-y-0.5">
                  <div>Dépenses fournisseurs</div>
                  <div>Charges courantes</div>
                </div>
              </div>
            </div>
          </InfoBox>
          <InfoBox color="green" title="Bilan">
            <p>Photographie du patrimoine de la résidence à une date donnée. Présente l'<strong>actif</strong> (ce que possède la résidence : caisse, créances) et le <strong>passif</strong> (ce qu'elle doit : fournisseurs, dettes). L'actif doit toujours égaler le passif.</p>
          </InfoBox>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Accessible via la section <strong>Comptabilité</strong> dans la navigation. Les états sont recalculés en temps réel à partir des données opérationnelles.
        </p>
      </Section>

      {/* 9. Gouvernance */}
      <Section title="Gouvernance" icon="🏛️">
        <div className="space-y-2 text-xs">
          {[
            ["Assemblées générales", "Enregistrement des AG (date, lieu, quorum, PV). Les résidents voient la dernière AG dans leur portail."],
            ["Bureau syndical",      "Composition du bureau (président, trésorier, membres). Affiché aux résidents connectés."],
            ["Résolutions",          "Décisions adoptées lors des AG. Classées par assemblée et consultables par les résidents."],
            ["Documents",            "Partage de fichiers (règlement, PV, contrats). Accessible aux résidents depuis leur portail."],
            ["Événements",           "Suivi des travaux, interventions et événements de la résidence."],
          ].map(([k, v]) => (
            <div key={k} className="bg-slate-50 rounded-xl p-3">
              <div className="font-semibold text-slate-700">{k}</div>
              <div className="text-slate-500 mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 10. Portail résident */}
      <Section title="Portail résident" icon="🏠">
        <p>
          Les résidents accèdent à un espace personnel via <code className="bg-slate-100 px-1 rounded">/resident</code>. Ils y trouvent :
        </p>
        <ul className="list-disc pl-4 space-y-1 text-xs text-slate-500 mt-1">
          <li><strong>Ma situation</strong> : total dû, total payé, reste à payer pour leur lot</li>
          <li><strong>Mes notifications</strong> : messages diffusés par l'administrateur</li>
          <li><strong>Mes messages</strong> : échange direct avec le syndic</li>
          <li><strong>Rapport financier</strong> : bilan de la résidence</li>
          <li><strong>Dernière AG</strong> : compte-rendu et résolutions adoptées</li>
          <li><strong>Documents</strong> : fichiers partagés par l'administrateur</li>
          <li><strong>Événements</strong> : travaux et événements en cours</li>
          <li><strong>Bureau syndical</strong> : membres du bureau</li>
        </ul>
        <InfoBox color="amber" title="Création de compte résident">
          <p>L'administrateur crée le compte dans <strong>Paramétrage → Utilisateurs</strong>. Convention recommandée : <code className="bg-white border border-slate-200 rounded px-1">Résidence_Lot</code> pour le nom d'utilisateur et le mot de passe initial. Le résident doit changer son mot de passe à la première connexion.</p>
        </InfoBox>
      </Section>

      {/* 11. Archivage */}
      <Section title="Archivage comptable" icon="🗄️">
        <p>L'archivage clôture une période financière en déplaçant les données dans des tables d'archive :</p>
        <div className="space-y-2 text-xs">
          <InfoBox color="slate" title="Ce que fait une archive">
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Déplace dépenses, paiements et recettes d'une période sélectionnée</li>
              <li>Calcule le solde net (recettes − dépenses) de la période</li>
              <li>Crée un <strong>ajustement de caisse unique</strong> représentant ce solde</li>
              <li>Le solde de caisse reste <strong>exact</strong> après archivage</li>
            </ul>
          </InfoBox>
          <InfoBox color="blue" title="Restauration">
            <p>Une archive peut être restaurée à tout moment. Les enregistrements reviennent dans les tables opérationnelles et l'ajustement est supprimé.</p>
          </InfoBox>
        </div>
        <p className="text-xs text-slate-400">Accessible via <strong>Administration → Archivage</strong> (admins uniquement).</p>
      </Section>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pb-4">
        XYZ Syndic — © 2026
      </div>

    </div>
  );
}
