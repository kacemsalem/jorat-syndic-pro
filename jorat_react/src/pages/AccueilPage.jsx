import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── Carte icône verticale (petite) ────────────────────────── */
function NavCard({ onClick, icon, label }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm
                 active:scale-95 hover:shadow-md transition-all duration-150 w-full">
      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
          {icon}
        </svg>
      </div>
      <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

/* ── Carte action horizontale (avec flèche) ────────────────── */
function ActionCard({ onClick, icon, label, sub }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-sm
                 hover:shadow-md active:scale-[0.98] transition-all duration-150">
      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          {icon}
        </svg>
      </div>
      <div className="flex-1 text-left">
        <p className="text-xs font-bold text-slate-800">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

/* ── Carte section blanche ──────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/* ── Page Accueil ───────────────────────────────────────────── */
export default function AccueilPage() {
  const navigate = useNavigate();
  const [residence, setResidence] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/residences/", { credentials: "include" })
      .then(r => {
        if (r.status === 401 || r.status === 403) { navigate("/login"); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (!data) return;
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        if (list.length === 0) { navigate("/login"); return; }
        setResidence(list[0]);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!residence) return null;

  const adresse = [residence.adresse_residence, residence.ville_residence, residence.code_postal_residence]
    .filter(Boolean).join(" · ");

  return (
    <div className="bg-slate-100 min-h-screen pb-24">

      {/* ── Header bleu dégradé ──────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-10">
        <div className="flex items-center gap-3">
          {residence.logo ? (
            <img src={residence.logo} alt="logo"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white/30 shadow-md" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shadow">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-[9px] font-bold uppercase tracking-wider">Syndic Pro</p>
            <h1 className="text-white font-bold text-[15px] truncate leading-tight">
              {residence.nom_residence}
            </h1>
            {adresse && <p className="text-white/60 text-[10px] mt-0.5 truncate">{adresse}</p>}
          </div>
          {residence.nombre_lots != null && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center border border-white/20">
              <p className="text-white font-bold text-base leading-none">{residence.nombre_lots}</p>
              <p className="text-white/70 text-[9px] mt-0.5">lots</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
            residence.statut_residence === "ACTIF"
              ? "bg-emerald-400/25 text-emerald-100 border border-emerald-300/40"
              : "bg-red-400/25 text-red-100 border border-red-300/40"
          }`}>{residence.statut_residence}</span>
          {residence.email && <span className="text-white/50 text-[10px]">{residence.email}</span>}
        </div>
      </div>

      {/* ── Sections flottantes sur le header ───────────────── */}
      <div className="px-4 -mt-5 space-y-4">

        {/* 1 · Gestion ─────────────────────────────────────── */}
        <Section title="Gestion">
          <div className="grid grid-cols-4 gap-2">
            <NavCard onClick={() => navigate("/caisse")} label="Caisse"
              icon={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>} />
            <NavCard onClick={() => navigate("/paiements")} label="Paiements"
              icon={<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>} />
            <NavCard onClick={() => navigate("/depenses")} label="Dépenses"
              icon={<><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>} />
            <NavCard onClick={() => navigate("/recettes")} label="Recettes"
              icon={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>} />
          </div>
        </Section>

        {/* 2 · Configuration ──────────────────────────────── */}
        <Section title="Configuration">
          <div className="grid grid-cols-4 gap-2">
            <NavCard onClick={() => navigate("/residences")} label="Résidence"
              icon={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />
            <NavCard onClick={() => navigate("/kanban")} label="Lots"
              icon={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>} />
            <NavCard onClick={() => navigate("/appels-charge?filtre=CHARGE")} label="Charge"
              icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>} />
            <NavCard onClick={() => navigate("/appels-charge?filtre=FOND")} label="Fond"
              icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>} />
          </div>
        </Section>

        {/* 3 · Suivi et synthèse ──────────────────────────── */}
        <Section title="Suivi et synthèse">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <NavCard onClick={() => navigate("/synthese")} label="Suivi paiements"
              icon={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>} />
            <NavCard onClick={() => navigate("/rapport-financier")} label="Rapport financier"
              icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />
          </div>
          <div className="space-y-2">
            <ActionCard onClick={() => navigate("/situation-paiements")}
              label="Analyse Paiements — Timeline"
              sub="Couverture mois par mois par lot"
              icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></>} />
            <ActionCard onClick={() => navigate("/etat-mensuel")}
              label="État mensuel — Entrées / Sorties"
              sub="Tableau croisé lot × 12 mois"
              icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />
          </div>
        </Section>

        {/* 4 · Gouvernance ────────────────────────────────── */}
        <Section title="Gouvernance">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <NavCard onClick={() => navigate("/gouvernance/assemblees")} label="Assemblées"
              icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />
            <NavCard onClick={() => navigate("/gouvernance/bureau")} label="Bureau"
              icon={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>} />
            <NavCard onClick={() => navigate("/gouvernance/kanban-resolutions")} label="Résolutions"
              icon={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>} />
            <NavCard onClick={() => navigate("/gouvernance/documents")} label="Documents"
              icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />
          </div>
          <div className="space-y-2">
            <ActionCard onClick={() => navigate("/gouvernance/travaux")}
              label="Événements & Travaux"
              sub="Suivi des travaux et interventions"
              icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />
            <ActionCard onClick={() => navigate("/passation-consignes")}
              label="Passation de consignes"
              sub="Remise entre syndics avec solde caisse"
              icon={<><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/><path d="M15 5l4 4"/></>} />
          </div>
        </Section>

        {/* 5 · Espace résident ────────────────────────────── */}
        <Section title="Espace résident">
          <div className="grid grid-cols-3 gap-2">
            <NavCard onClick={() => navigate("/gouvernance/notifications")} label="Notifications"
              icon={<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />
            <NavCard onClick={() => navigate("/espace-resident/messages")} label="Messages"
              icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />
            <NavCard onClick={() => navigate("/espace-resident/consultation")} label="Vue résident"
              icon={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />
          </div>
        </Section>

        {/* 6 · Comptabilité ───────────────────────────────── */}
        <Section title="Comptabilité">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <NavCard onClick={() => navigate("/comptabilite/journal")} label="Journal"
              icon={<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>} />
            <NavCard onClick={() => navigate("/comptabilite/grand-livre")} label="Grand Livre"
              icon={<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>} />
            <NavCard onClick={() => navigate("/comptabilite/balance")} label="Balance"
              icon={<><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>} />
            <NavCard onClick={() => navigate("/comptabilite/bilan")} label="Bilan"
              icon={<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>} />
          </div>
          <ActionCard onClick={() => navigate("/comptabilite/cpc")}
            label="CPC — Compte de Produits et Charges"
            sub="Tableau de synthèse annuel"
            icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />
        </Section>

        {/* 7 · Paramétrage ────────────────────────────────── */}
        <Section title="Paramétrage">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <NavCard onClick={() => navigate("/import")} label="Import"
              icon={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />
            <NavCard onClick={() => navigate("/export")} label="Export"
              icon={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />
            <NavCard onClick={() => navigate("/archivage")} label="Archivage"
              icon={<><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>} />
            <NavCard onClick={() => navigate("/aide")} label="Aide"
              icon={<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />
          </div>
          <div className="space-y-2">
            <ActionCard onClick={() => navigate("/parametrage/ia")}
              label="Paramétrage IA"
              sub="Configuration de l'assistant IA"
              icon={<><circle cx="12" cy="12" r="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>} />
            <ActionCard onClick={() => navigate("/gestion-utilisateurs")}
              label="Gestion des utilisateurs"
              sub="Comptes et accès de l'application"
              icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />
            <ActionCard onClick={() => navigate("/initialisation")}
              label="Initialisation complète"
              sub="Réinitialiser toutes les données"
              icon={<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>} />
          </div>
        </Section>

      </div>
    </div>
  );
}
