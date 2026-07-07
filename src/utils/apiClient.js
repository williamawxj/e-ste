const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "este_auth_token";
const USER_KEY = "este_sessao";
const loadingListeners = new Set();
let pendingRequests = 0;

function notifyLoading() {
  const carregando = pendingRequests > 0;
  loadingListeners.forEach((listener) => {
    try {
      listener({ carregando, pendentes: pendingRequests });
    } catch {
      // Ignora listeners com erro para não interromper a aplicação.
    }
  });
}

function iniciarRequisicao() {
  pendingRequests += 1;
  notifyLoading();
}

function finalizarRequisicao() {
  pendingRequests = Math.max(0, pendingRequests - 1);
  notifyLoading();
}

export function subscribeApiLoading(listener) {
  if (typeof listener !== "function") return () => {};
  loadingListeners.add(listener);
  listener({ carregando: pendingRequests > 0, pendentes: pendingRequests });
  return () => loadingListeners.delete(listener);
}

export async function withApiLoading(executor) {
  iniciarRequisicao();
  try {
    return await executor();
  } finally {
    finalizarRequisicao();
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  return JSON.parse(localStorage.getItem(USER_KEY) || "null");
}

export function setStoredAuth({ token, usuario }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (usuario) localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function setStoredUser(usuario) {
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch(path, options = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await withApiLoading(() => fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : options.body,
  }));

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const inicio = text.trim().slice(0, 80).toLowerCase();
      const pareceHtml = inicio.startsWith("<!doctype") || inicio.startsWith("<html");
      const mensagem = pareceHtml
        ? "A API retornou HTML em vez de JSON. Verifique se a API está ativa e atualizada."
        : "Resposta inesperada do servidor. Verifique se a API está ativa e atualizada.";
      const error = new Error(mensagem);
      error.status = response.status;
      error.raw = text.slice(0, 200);
      throw error;
    }
  }

  if (!response.ok) {
    if (response.status === 401) clearStoredAuth();
    const error = new Error(data.mensagem || "Não foi possível concluir a solicitação.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

