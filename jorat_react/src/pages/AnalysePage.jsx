import { useNavigate } from "react-router-dom";

function NavCard({ onClick, icon, label, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick}
      className={`flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm w-full
                 ${disabled ? "opacity-40 cursor-not-allowed" : "active:scale-95 hover:shadow-md transition-all duration-150"}`}>
      <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
          {icon}
        </svg>
      </div>
      <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">
        {label}
        {disabled && <span className="block text-[8px] text-slate-400 font-normal">bientôt</span>}
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

export default function AnalysePage() {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Syndic Pro</p>
            <h1 className="text-white font-bold text-lg leading-tight">Analyse</h1>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-2">Suivi · Rapports · Graphes</p>
      </div>

      <div className="px-4 -mt-5 space-y-4">

        <Section title="Suivi & Rapports">
          <div className="grid grid-cols-3 gap-2">
            <NavCard onClick={() => navigate("/synthese")} label="Suivi"
              icon={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>} />
            <NavCard onClick={() => navigate("/situation-paiements")} label="Timeline"
              icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></>} />
            <NavCard onClick={() => navigate("/rapport-financier")} label="Rapport"
              icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />
          </div>
        </Section>

        <Section title="Graphes">
          <div className="grid grid-cols-3 gap-2">
            <NavCard onClick={() => navigate("/graphe-depenses")} label="Dépenses"
              icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />
            <NavCard onClick={() => navigate("/graphe-paiements")} label="Paiements"
              icon={<><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M2 12h20"/></>} />
            <NavCard onClick={() => navigate("/graphe-caisse")} label="Caisse"
              icon={<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>} />
          </div>
        </Section>

      </div>
    </div>
  );
}
