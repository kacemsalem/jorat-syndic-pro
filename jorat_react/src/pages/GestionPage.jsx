import { useNavigate } from "react-router-dom";

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

export default function GestionPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Syndic Pro</p>
            <h1 className="text-white font-bold text-lg leading-tight">Gestion</h1>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-2">Finances · Configuration · Suivi</p>
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <div className="px-4 -mt-5 space-y-4">

        <Section title="Finances">
          <div className="grid grid-cols-4 gap-2">
            <NavCard onClick={() => navigate("/caisse")} label="Caisse"
              icon={<><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h.01M12 15h.01"/></>} />
            <NavCard onClick={() => navigate("/depenses")} label="Dépenses"
              icon={<><path d="M12 5v14M19 12l-7 7-7-7"/></>} />
            <NavCard onClick={() => navigate("/paiements")} label="Cotisations"
              icon={<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>} />
            <NavCard onClick={() => navigate("/synthese")} label="Suiv."
              icon={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>} />
          </div>
        </Section>

        <Section title="Configuration">
          <div className="grid grid-cols-4 gap-2">
            <NavCard onClick={() => navigate("/residences")} label="Résidence"
              icon={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />
            <NavCard onClick={() => navigate("/kanban")} label="Lots"
              icon={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>} />
            <NavCard onClick={() => navigate("/appels-charge?filtre=CHARGE")} label="Charge"
              icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>} />
            <NavCard onClick={() => navigate("/appels-charge?filtre=FOND")} label="Fond"
              icon={<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>} />
          </div>
        </Section>

        <Section title="Analyse">
          <button onClick={() => navigate("/analyse")}
            className="w-full flex items-center justify-between px-2 py-3 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-700">Tableau d'analyse</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Synthèse · Timeline · Rapport · Graphes</p>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </Section>

      </div>
    </div>
  );
}
