import { useNavigate } from "react-router-dom";

function NavCard({ onClick, icon, label, sub }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-sm
                 hover:shadow-md active:scale-[0.98] transition-all duration-150 w-full text-left">
      <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          {icon}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
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

export default function ComptabiliteMenuPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-4 pt-5 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <line x1="12" y1="2" x2="12" y2="22"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Syndic Pro</p>
            <h1 className="text-white font-bold text-lg leading-tight">Comptabilité</h1>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-2">Journal · Grand Livre · Balance · CPC · Bilan</p>
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <div className="px-4 -mt-5 space-y-3">

        {/* Avertissement */}
        <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 mt-0.5" style={{ width: 18, height: 18 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            <span className="font-bold">Avertissement —</span> Les résultats des écritures comptables dépendent entièrement de la saisie.
            Il faut impérativement <span className="font-semibold">affecter les mouvements de caisse</span> (entrées, dépenses) aux comptes comptables associés pour que les journaux, balances et bilans soient fiables.
          </p>
        </div>

        <NavCard onClick={() => navigate("/comptabilite/journal")}
          label="Journal"
          sub="Enregistrement chronologique des écritures"
          icon={<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="7" x2="16" y2="7"/><line x1="12" y1="11" x2="16" y2="11"/></>} />

        <NavCard onClick={() => navigate("/comptabilite/grand-livre")}
          label="Grand Livre"
          sub="Détail des mouvements par compte"
          icon={<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>} />

        <NavCard onClick={() => navigate("/comptabilite/balance")}
          label="Balance"
          sub="Soldes débiteurs et créditeurs par compte"
          icon={<><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>} />

        <NavCard onClick={() => navigate("/comptabilite/cpc")}
          label="CPC — Compte de Produits et Charges"
          sub="Tableau de synthèse annuel"
          icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />

        <NavCard onClick={() => navigate("/comptabilite/bilan")}
          label="Bilan"
          sub="Situation patrimoniale de la copropriété"
          icon={<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>} />

      </div>
    </div>
  );
}
