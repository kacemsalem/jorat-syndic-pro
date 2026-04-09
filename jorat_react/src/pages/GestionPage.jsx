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
        <p className="text-white/50 text-[10px] mt-2">Saisie · Configuration</p>
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <div className="px-4 -mt-5 space-y-4">

        {/* ── Saisie — bouton large ───────────────────────── */}
        <button onClick={() => navigate("/saisie-grille")}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-md
                     active:scale-95 hover:shadow-lg transition-all duration-150 p-4
                     flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 border border-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-base leading-tight">Saisie en grille</p>
            <p className="text-white/60 text-[11px] mt-0.5">Paiements & dépenses par mois</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-auto opacity-50">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* ── Configuration ───────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuration</p>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-4 gap-2">
              <NavCard onClick={() => navigate("/appels-charge?filtre=CHARGE")} label="Charge"
                icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>} />
              <NavCard onClick={() => navigate("/appels-charge?filtre=FOND")} label="Fond"
                icon={<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>} />
              <NavCard onClick={() => navigate("/kanban")} label="Lots"
                icon={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>} />
              <NavCard onClick={() => navigate("/residences")} label="Résidence"
                icon={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
