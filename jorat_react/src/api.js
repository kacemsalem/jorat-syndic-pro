// src/api.js — utilitaire fetch central avec credentials
const API = "/api";

export const fetchJson = async (url, options = {}) => {
  const csrfToken = document.cookie
    .split("; ")
    .find(r => r.startsWith("csrftoken="))
    ?.split("=")[1];

  const r = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
  });

  let data = null;
  if (r.status !== 204) {
    try { data = await r.json(); } catch { data = null; }
  }

  return { ok: r.ok, data };
};

export const postJson = async (url, body) => {
  const csrfToken = document.cookie
    .split("; ")
    .find(r => r.startsWith("csrftoken="))
    ?.split("=")[1];

  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken || "",
    },
    body: JSON.stringify(body),
  });
  return r;
};

export const patchJson = async (url, body) => {
  const csrfToken = document.cookie
    .split("; ")
    .find(r => r.startsWith("csrftoken="))
    ?.split("=")[1];

  const r = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken || "",
    },
    body: JSON.stringify(body),
  });
  return r;
};

export const deleteJson = async (url) => {
  const csrfToken = document.cookie
    .split("; ")
    .find(r => r.startsWith("csrftoken="))
    ?.split("=")[1];

  const r = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken || "" },
  });
  return r;
};

export default API;