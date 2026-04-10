/**
 * src/api.js — Client API centralisé
 *
 * CSRF + credentials sont injectés globalement par main.jsx sur tous les fetch.
 * Ce module ajoute :
 *   - extractError : message d'erreur normalisé depuis une réponse DRF
 *   - toList       : normalise résultat paginé ou tableau direct → tableau
 *   - fetchJson    : GET avec {ok, data} (compat pages existantes)
 *   - postJson / patchJson / deleteJson : mutations (compat pages existantes)
 *   - api          : helpers qui lèvent une Error sur status >= 400
 */

const API = "/api";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extrait le message d'erreur depuis une réponse DRF. */
export function extractError(data) {
  if (!data) return "Erreur inconnue.";
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  if (data.error)  return String(data.error);
  const values = Object.values(data).flat();
  return values.length ? values.join(" ") : "Erreur inconnue.";
}

/** Normalise un résultat paginé ({ results: [] }) ou un tableau direct → tableau. */
export function toList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

// ── Helpers compat (utilisés par les pages existantes) ────────────────────

/** GET — retourne { ok, data }. credentials/CSRF injectés par main.jsx. */
export const fetchJson = async (url, options = {}) => {
  const r = await fetch(url, options);
  let data = null;
  if (r.status !== 204) {
    try { data = await r.json(); } catch { data = null; }
  }
  return { ok: r.ok, data };
};

/** POST JSON — retourne la Response brute. */
export const postJson = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** PATCH JSON — retourne la Response brute. */
export const patchJson = (url, body) =>
  fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** DELETE — retourne la Response brute. */
export const deleteJson = (url) => fetch(url, { method: "DELETE" });

// ── Client avec gestion d'erreur (lève Error sur 4xx/5xx) ─────────────────

async function _handle(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(extractError(data));
  return data;
}

export const api = {
  get:    (path, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API}${path}${qs ? "?" + qs : ""}`).then(_handle);
  },
  post:   (path, body) =>
    fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(_handle),
  patch:  (path, body) =>
    fetch(`${API}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(_handle),
  put:    (path, body) =>
    fetch(`${API}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(_handle),
  delete: (path) => fetch(`${API}${path}`, { method: "DELETE" }).then(_handle),
};

export default API;