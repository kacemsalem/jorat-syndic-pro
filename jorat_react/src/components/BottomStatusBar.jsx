import { useState, useEffect, useCallback } from "react";

const fmt = (n) =>
  Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function BottomStatusBar() {
  const [open,    setOpen]    = useState(false);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [stale,   setStale]   = useState(true); // force refresh on open

  const fetchStats = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/rapport-financier/",             { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch("/api/caisse-mouvements/?page_size=1", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([rapport, caisse]) => {
      if (!rapport && !caisse) return;
      const kpis = rapport?.kpis ?? {};
      const te   = parseFloat(caisse?.total_entrees ?? 0);
      const ts   = parseFloat(caisse?.total_sorties ?? 0);
      const ta   = parseFloat(caisse?.total_archive ?? 0);
      const solde = te - ts + ta;
      setData({
        solde,
        total_du:   parseFloat(kpis.total_du   ?? 0),
        total_paye: parseFloat(kpis.total_paye ?? 0),
        taux:       parseFloat(kpis.taux_recouvrement ?? 0),
        nb_impayes: parseInt(kpis.nb_lots_impayes ?? 0, 10),
      });
      setStale(false);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch when first opened or when stale
  useEffect(() => {
    if (open && stale) fetchStats();
  }, [open, stale, fetchStats]);

  // Refresh on route change (mark stale)
  useEffect(() => {
    setStale(true);
  }, [window.location.pathname]);

  const reste = data ? data.total_du - data.total_paye : 0;

  return (
    <>
      {/* ── Overlay to close ── */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* ── Bar container ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ willChange: "transform" }}
      >
        {/* Tab handle — always visible above the bar */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none">
          <button
            onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
            className={`pointer-events-auto flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl text-[10px] font-bold uppercase tracking-wider shadow-lg transition-colors ${
              open
                ? "bg-slate-700 text-white"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}>
            <span>Statut</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}>
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
        </div>

        {/* Bar body */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-3">
          {loading && !data ? (
            <div className="flex items-center justify-center py-2">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="flex items-stretch gap-3 overflow-x-auto pb-1 max-w-4xl mx-auto">

              {/* Solde */}
              <div className="shrink-0 flex flex-col justify-center min-w-[110px]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Solde caisse</p>
                <p className={`text-base font-bold leading-none ${data.solde >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {data.solde >= 0 ? "+" : "−"}{fmt(Math.abs(data.solde))}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">MAD</p>
              </div>

              <div className="w-px bg-slate-700 self-stretch" />

              {/* Total dû */}
              <div className="shrink-0 flex flex-col justify-center min-w-[100px]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total dû</p>
                <p className="text-base font-bold text-slate-200 leading-none">{fmt(data.total_du)}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">MAD</p>
              </div>

              <div className="w-px bg-slate-700 self-stretch" />

              {/* Total payé */}
              <div className="shrink-0 flex flex-col justify-center min-w-[100px]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total payé</p>
                <p className="text-base font-bold text-emerald-400 leading-none">{fmt(data.total_paye)}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">MAD</p>
              </div>

              <div className="w-px bg-slate-700 self-stretch" />

              {/* Reste */}
              <div className="shrink-0 flex flex-col justify-center min-w-[100px]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Reste à payer</p>
                <p className={`text-base font-bold leading-none ${reste > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {fmt(reste)}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">MAD</p>
              </div>

              <div className="w-px bg-slate-700 self-stretch" />

              {/* Taux */}
              <div className="shrink-0 flex flex-col justify-center min-w-[80px]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Recouvrement</p>
                <p className={`text-base font-bold leading-none ${data.taux >= 80 ? "text-emerald-400" : data.taux >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {data.taux.toFixed(1)}%
                </p>
                <div className="w-full bg-slate-600 rounded-full h-1 mt-1">
                  <div
                    className={`h-1 rounded-full transition-all ${data.taux >= 80 ? "bg-emerald-400" : data.taux >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(data.taux, 100)}%` }}
                  />
                </div>
              </div>

              <div className="w-px bg-slate-700 self-stretch" />

              {/* Impayés */}
              <div className="shrink-0 flex flex-col justify-center min-w-[70px]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Lots impayés</p>
                <p className={`text-base font-bold leading-none ${data.nb_impayes > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {data.nb_impayes}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">lot{data.nb_impayes !== 1 ? "s" : ""}</p>
              </div>

              {/* Refresh */}
              <div className="ml-auto shrink-0 flex items-center">
                <button
                  onClick={fetchStats}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition disabled:opacity-40"
                  title="Actualiser">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}>
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>
              </div>

            </div>
          ) : (
            <p className="text-center text-xs text-slate-500 py-1">Données indisponibles</p>
          )}
        </div>
      </div>

      {/* ── Toggle button when bar is closed — tab sticking up from bottom ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-t-xl hover:bg-slate-700 transition shadow-lg">
          <span>Statut</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      )}
    </>
  );
}
