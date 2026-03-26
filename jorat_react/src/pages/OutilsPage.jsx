import { useNavigate } from "react-router-dom";

function NavCard({ onClick, icon, label, sub }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-sm
                 hover:shadow-md active:scale-[0.98] transition-all duration-150 w-full text-left">
      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8"
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

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{title}</p>
      {children}
    </div>
  );
}

export default function OutilsPage() {
  const navigate  = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("syndic_user") || "null");
  const isAdmin    = storedUser?.role === "ADMIN" || storedUser?.role === "SUPER_ADMIN";

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-800 px-4 pt-5 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Syndic Pro</p>
            <h1 className="text-white font-bold text-lg leading-tight">Outils</h1>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-2">Import · Export · Archivage · IA</p>
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <div className="px-4 -mt-5 space-y-5">

        <Section title="Données">
          <NavCard onClick={() => navigate("/import")}
            label="Import"
            sub="Importer des données depuis un fichier"
            icon={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />
          <NavCard onClick={() => navigate("/export")}
            label="Export"
            sub="Exporter les données en Excel / PDF"
            icon={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />
          <NavCard onClick={() => navigate("/archivage")}
            label="Archivage"
            sub="Archiver et restaurer les périodes"
            icon={<><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>} />
        </Section>

        <Section title="Intelligence artificielle">
          <NavCard onClick={() => navigate("/ia/chat")}
            label="Assistant IA"
            sub="Poser une question à l'assistant"
            icon={<><circle cx="12" cy="12" r="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>} />
          <NavCard onClick={() => navigate("/parametrage/ia")}
            label="Paramétrage IA"
            sub="Configurer l'assistant"
            icon={<><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></>} />
        </Section>

        {isAdmin && (
          <Section title="Administration">
            <NavCard onClick={() => navigate("/gestion-utilisateurs")}
              label="Utilisateurs"
              sub="Gérer les comptes et accès"
              icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>} />
            <NavCard onClick={() => navigate("/initialisation")}
              label="Initialisation complète"
              sub="Réinitialiser toutes les données"
              icon={<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>} />
          </Section>
        )}

        <Section title="Aide">
          <NavCard onClick={() => navigate("/aide")}
            label="Centre d'aide"
            sub="Documentation et guide d'utilisation"
            icon={<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />
        </Section>

      </div>
    </div>
  );
}
