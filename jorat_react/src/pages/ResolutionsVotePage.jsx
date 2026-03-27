import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white";
const SELECT_CLS = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white";

const STATUT_COLS = [
  { key: "EN_PREPARATION", label: "En préparation", color: "bg-slate-100 text-slate-700",   border: "border-slate-300",   dot: "bg-slate-400" },
  { key: "EN_COURS",       label: "En cours",        color: "bg-amber-50 text-amber-800",    border: "border-amber-400",   dot: "bg-amber-500" },
  { key: "CLOTURE",        label: "Clôturé",          color: "bg-emerald-50 text-emerald-800",border: "border-emerald-400", dot: "bg-emerald-500" },
];

const TYPE_VOTE_OPTIONS = [
  { value: "MAJORITE_SIMPLE",  label: "Majorité simple (> 50 % des votants)" },
  { value: "MAJORITE_ABSOLUE", label: "Majorité absolue (> 50 % des copropriétaires)" },
  { value: "DOUBLE_MAJORITE",  label: "Double majorité" },
  { value: "UNANIMITE",        label: "Unanimité" },
];

const EMPTY_FORM = {
  intitule: "", description: "", type_vote: "MAJORITE_SIMPLE",
  date_resolution: new Date().toISOString().slice(0, 10),
  date_debut_vote: "", date_cloture_vote: "",
  statut: "EN_PREPARATION", assemblee: "",
};

function computeStatutFromDates(dateDebut, dateCloture) {
  const now = new Date();
  if (dateCloture && new Date(dateCloture) < now) return "CLOTURE";
  if (dateDebut && new Date(dateDebut) <= now) return "EN_COURS";
  return "EN_PREPARATION";
}

function resultText(rv, resultats) {
  if (!resultats) return null;
  const nbOui    = resultats.counts?.OUI    ?? 0;
  const nbNon    = resultats.counts?.NON    ?? 0;
  const nbNeutre = resultats.counts?.NEUTRE ?? 0;
  const totalVotes = nbOui + nbNon + nbNeutre;
  const totalLots  = resultats.total_notifies ?? 0;

  let adopte = false;
  let condition = "";

  if (rv.type_vote === "MAJORITE_SIMPLE") {
    adopte = totalVotes > 0 && nbOui > totalVotes / 2;
    condition = `${nbOui}/${totalVotes} votants (> 50 % des votants)`;
  } else if (rv.type_vote === "MAJORITE_ABSOLUE") {
    adopte = totalLots > 0 && nbOui > totalLots / 2;
    condition = `${nbOui}/${totalLots} lots (> 50 % des copropriétaires)`;
  } else if (rv.type_vote === "UNANIMITE") {
    adopte = totalVotes > 0 && nbNon === 0 && nbNeutre === 0;
    condition = `${nbOui}/${totalLots} lots (unanimité requise)`;
  } else if (rv.type_vote === "DOUBLE_MAJORITE") {
    const majoriteVotants = totalVotes > 0 && nbOui > totalVotes / 2;
    const majoriteLots    = totalLots > 0 && nbOui > totalLots / 3;
    adopte = majoriteVotants && majoriteLots;
    condition = `${nbOui}/${totalVotes} votants et ${nbOui}/${totalLots} lots`;
  }

  return { adopte, condition };
}

function Badge({ statut }) {
  const col = STATUT_COLS.find(c => c.key === statut);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${col?.color || "bg-slate-100 text-slate-600"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${col?.dot || "bg-slate-400"}`} />
      {col?.label || statut}
    </span>
  );
}

export default function ResolutionsVotePage() {
  const [searchParams] = useSearchParams();
  const [resolutions, setResolutions] = useState([]);
  const [assemblees,  setAssemblees]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [selected,    setSelected]    = useState(null); // résolution sélectionnée
  const [resultats,   setResultats]   = useState(null);
  const [resLoading,  setResLoading]  = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [notifInfo,   setNotifInfo]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/resolutions-vote/",   { credentials: "include" }),
        fetch("/api/assemblees/",         { credentials: "include" }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setResolutions(Array.isArray(d1) ? d1 : []);
      setAssemblees(Array.isArray(d2) ? d2 : (d2.results ?? []));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (searchParams.get("new") === "1") {
      setEditItem(null); setForm(EMPTY_FORM); setError(""); setShowForm(true);
    }
  }, [load]);

  const loadResultats = async (id) => {
    setResLoading(true);
    const r = await fetch(`/api/resolutions-vote/${id}/resultats/`, { credentials: "include" });
    if (r.ok) setResultats(await r.json());
    setResLoading(false);
  };

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); };
  const openEdit   = (rv) => {
    setEditItem(rv);
    setForm({
      intitule:          rv.intitule,
      description:       rv.description || "",
      type_vote:         rv.type_vote,
      date_resolution:   rv.date_resolution,
      date_debut_vote:   rv.date_debut_vote   ? rv.date_debut_vote.slice(0, 16)   : "",
      date_cloture_vote: rv.date_cloture_vote ? rv.date_cloture_vote.slice(0, 16) : "",
      statut:            rv.statut,
      assemblee:         rv.assemblee || "",
    });
    setError(""); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.intitule.trim() || !form.date_resolution) { setError("Intitulé et date requis."); return; }
    setSaving(true); setError("");
    const autoStatut = computeStatutFromDates(form.date_debut_vote, form.date_cloture_vote);
    const payload = {
      ...form,
      statut:            autoStatut,
      assemblee:         form.assemblee || null,
      date_debut_vote:   form.date_debut_vote   || null,
      date_cloture_vote: form.date_cloture_vote || null,
    };
    const url    = editItem ? `/api/resolutions-vote/${editItem.id}/` : "/api/resolutions-vote/";
    const method = editItem ? "PATCH" : "POST";
    const r = await fetch(url, {
      method, credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      await load();
      setShowForm(false);
      if (selected?.id === editItem?.id) setSelected(await r.json());
    } else {
      const e = await r.json().catch(() => ({}));
      setError(e.detail || JSON.stringify(e) || "Erreur.");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette résolution ?")) return;
    await fetch(`/api/resolutions-vote/${id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    await load();
    if (selected?.id === id) { setSelected(null); setResultats(null); }
  };

  const handleEnvoyerNotifs = async (id) => {
    const r = await fetch(`/api/resolutions-vote/${id}/envoyer-notifs/`, {
      method: "POST", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (r.ok) {
      const d = await r.json();
      setNotifInfo(`${d.sent} notification(s) envoyée(s) sur ${d.total_lots} lots.`);
      await load();
      await loadResultats(id);
    }
  };

  const handleSelect = async (rv) => {
    setSelected(rv); setShowForm(false); setNotifInfo(null);
    await loadResultats(rv.id);
  };

  const total = resultats ? resultats.counts.OUI + resultats.counts.NON + resultats.counts.NEUTRE : 0;
  const pct   = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
            <h1 className="text-white font-bold text-lg leading-tight">Votes en ligne</h1>
          </div>
          {!(showForm || selected) && (
            <button onClick={openCreate}
              className="bg-white text-indigo-700 text-xs px-4 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition">
              + Nouvelle résolution
            </button>
          )}
        </div>
        <p className="text-white/50 text-[10px] mt-1">{resolutions.length} résolution{resolutions.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="px-4 -mt-5 space-y-4">

        {/* ── Liste résolutions ── */}
        {!(showForm || selected) && (
          loading ? (
            <div className="bg-white rounded-2xl shadow-sm text-center py-12 text-slate-400">Chargement…</div>
          ) : resolutions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm text-center py-16 text-slate-400">Aucune résolution</div>
          ) : (
            <div className="flex flex-col gap-3">
              {resolutions.map(rv => (
                <button key={rv.id} onClick={() => handleSelect(rv)}
                  className="w-full text-left bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{rv.intitule}</p>
                    <Badge statut={rv.statut} />
                  </div>
                  <p className="text-[11px] text-slate-400">{rv.date_resolution}</p>
                  {rv.assemblee_titre && (
                    <p className="text-[10px] text-indigo-500">🏛 {rv.assemblee_titre}</p>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[10px] text-slate-400">{rv.type_vote_label}</span>
                    <div className="flex gap-1 text-[10px]">
                      <span>📨 {rv.nb_notifies}</span>
                      <span className="text-slate-300">·</span>
                      <span>🗳 {rv.nb_votes}</span>
                    </div>
                  </div>
                  {rv.nb_votes > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✔ {rv.nb_oui} OUI</span>
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">✘ {rv.nb_non} NON</span>
                      {rv.nb_neutre > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">— {rv.nb_neutre} Neutre</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )
        )}

        {/* ── Panneau détail / formulaire ── */}
        {(showForm || selected) && (
          <div className="space-y-4">
            <button onClick={() => { setShowForm(false); setSelected(null); setResultats(null); }}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium transition">
              ← Liste des résolutions
            </button>

            {/* Formulaire */}
            {showForm && (
              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700">{editItem ? "Modifier" : "Nouvelle résolution"}</h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{error}</p>}

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Intitulé *</label>
                  <input className={INPUT} value={form.intitule}
                    onChange={e => setForm(f => ({ ...f, intitule: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Description</label>
                  <textarea rows={3} className={INPUT + " resize-none"} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Date *</label>
                    <input type="date" className={INPUT} value={form.date_resolution}
                      onChange={e => setForm(f => ({ ...f, date_resolution: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Statut (calculé)</label>
                    <div className="flex items-center h-9 px-3">
                      <Badge statut={computeStatutFromDates(form.date_debut_vote, form.date_cloture_vote)} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Type de vote</label>
                  <select className={SELECT_CLS} value={form.type_vote}
                    onChange={e => setForm(f => ({ ...f, type_vote: e.target.value }))}>
                    {TYPE_VOTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Début du vote</label>
                  <input type="datetime-local" className={INPUT} value={form.date_debut_vote}
                    onChange={e => setForm(f => ({ ...f, date_debut_vote: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Clôture du vote</label>
                  <input type="datetime-local" className={INPUT} value={form.date_cloture_vote}
                    onChange={e => setForm(f => ({ ...f, date_cloture_vote: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
                    {saving ? "…" : editItem ? "Modifier" : "Créer"}
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Détail résolution sélectionnée */}
            {selected && !showForm && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <Badge statut={selected.statut} />
                      <h2 className="text-sm font-bold text-slate-800 mt-1">{selected.intitule}</h2>
                      <p className="text-[11px] text-slate-400">{selected.date_resolution} · {selected.type_vote_label}</p>
                    </div>
                    <button onClick={() => { setSelected(null); setResultats(null); }}
                      className="text-slate-300 hover:text-slate-500 text-sm shrink-0">✕</button>
                  </div>
                  {selected.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 mb-3">{selected.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openEdit(selected)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition">
                      ✎ Modifier
                    </button>
                    {selected.statut !== "CLOTURE" && (
                      <button onClick={() => handleEnvoyerNotifs(selected.id)}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition">
                        📨 Envoyer notifications
                      </button>
                    )}
                    <button onClick={() => handleDelete(selected.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200 transition">
                      Supprimer
                    </button>
                  </div>
                  {notifInfo && (
                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">{notifInfo}</p>
                  )}
                  {/* Résultat si clôturé */}
                  {selected.statut === "CLOTURE" && resultats && (() => {
                    const r = resultText(selected, resultats);
                    if (!r) return null;
                    return (
                      <div className={`mt-3 rounded-xl px-4 py-3 border ${r.adopte ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                        <div className={`text-sm font-bold ${r.adopte ? "text-emerald-700" : "text-red-700"}`}>
                          {r.adopte ? "✔ Résolution ADOPTÉE" : "✘ Résolution REJETÉE"}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{r.condition}</div>
                      </div>
                    );
                  })()}
                </div>

                {/* Résultats */}
                {resLoading ? (
                  <div className="bg-white rounded-2xl shadow-sm text-center py-8 text-slate-400 text-xs">Chargement résultats…</div>
                ) : resultats && (
                  <>
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Résultats</h3>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { key: "OUI",    label: "Oui",    cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                          { key: "NON",    label: "Non",    cls: "bg-red-50 border-red-200 text-red-700" },
                          { key: "NEUTRE", label: "Neutre", cls: "bg-slate-50 border-slate-200 text-slate-600" },
                        ].map(v => (
                          <div key={v.key} className={`border rounded-xl p-2 text-center ${v.cls}`}>
                            <div className="text-xl font-bold">{resultats.counts[v.key]}</div>
                            <div className="text-[10px] font-semibold">{v.label}</div>
                            <div className="text-[10px] opacity-70">{pct(resultats.counts[v.key])} %</div>
                          </div>
                        ))}
                      </div>
                      {total > 0 && (
                        <div className="flex rounded-full overflow-hidden h-2">
                          {resultats.counts.OUI    > 0 && <div className="bg-emerald-500" style={{ width: pct(resultats.counts.OUI)    + "%" }} />}
                          {resultats.counts.NON    > 0 && <div className="bg-red-400"     style={{ width: pct(resultats.counts.NON)    + "%" }} />}
                          {resultats.counts.NEUTRE > 0 && <div className="bg-slate-300"   style={{ width: pct(resultats.counts.NEUTRE) + "%" }} />}
                        </div>
                      )}
                      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                        <span>📨 {resultats.total_notifies} notifiés</span>
                        <span>🗳 {resultats.total_votes} votes / {resultats.total_notifies} notifiés</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Suivi par lot</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="px-3 py-2 text-left text-slate-400 font-semibold">Lot</th>
                              <th className="px-3 py-2 text-center text-slate-400 font-semibold">Notifié</th>
                              <th className="px-3 py-2 text-center text-slate-400 font-semibold">Accusé</th>
                              <th className="px-3 py-2 text-center text-slate-400 font-semibold">Vote</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultats.detail.map((row, i) => (
                              <tr key={i} className={`border-b border-slate-50 ${i % 2 ? "bg-slate-50/30" : ""}`}>
                                <td className="px-3 py-1.5 font-bold text-indigo-700">{row.lot}</td>
                                <td className="px-3 py-1.5 text-center">{row.notifie ? "✅" : "—"}</td>
                                <td className="px-3 py-1.5 text-center">{row.accuse_reception ? "✅" : "—"}</td>
                                <td className="px-3 py-1.5 text-center">
                                  {row.vote === "OUI"    && <span className="text-emerald-600 font-bold">OUI</span>}
                                  {row.vote === "NON"    && <span className="text-red-600 font-bold">NON</span>}
                                  {row.vote === "NEUTRE" && <span className="text-slate-400 font-semibold">Neutre</span>}
                                  {!row.vote && <span className="text-slate-300">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
