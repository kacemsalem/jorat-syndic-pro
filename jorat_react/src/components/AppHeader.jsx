import { useNavigate } from "react-router-dom";

export default function AppHeader({ residence, onToggleSidebar }) {
  const navigate = useNavigate();
  const nom = residence?.nom_residence ?? "…";
  const ville = residence?.ville_residence ?? "";

  const handleLogout = async () => {
    try {
      const csrfToken = document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1];
      await fetch("/api/logout/", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": csrfToken || "" },
      });
    } catch {}
    localStorage.removeItem("syndic_user");
    navigate("/login");
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6 flex-shrink-0 z-10 relative">

      {/* Left — Hamburger + Residence name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Ouvrir/fermer le menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Connecté" />
          {residence?.logo && (
            <img
              src={residence.logo}
              alt="Logo résidence"
              className="h-7 w-auto max-w-[56px] object-contain rounded"
            />
          )}
          <div>
            <span className="text-slate-800 font-semibold text-sm">{nom}</span>
            {ville && (
              <span className="text-slate-400 text-xs ml-2">{ville}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-3">

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold select-none">
          A
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Déconnexion
        </button>

      </div>
    </header>
  );
}
