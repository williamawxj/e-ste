import { apiFetch, clearStoredAuth, getStoredUser, setStoredAuth, setStoredUser } from "./apiClient";

export async function getUsuarios() {
  const [instrutores, pendentes, gestores] = await Promise.all([
    getInstrutores(),
    getInstrutoresPendentes(),
    getGestores(),
  ]);
  return [...gestores, ...instrutores, ...pendentes];
}

export async function getUsuarioPorEmail(email) {
  const usuarios = await getUsuarios();
  return usuarios.find((usuario) => usuario.email === String(email || "").trim().toLowerCase());
}

export async function getUsuarioPorId(id) {
  const response = await apiFetch(`/usuarios/${id}`);
  return response.usuario;
}

export async function autenticar(email, senha) {
  const maxTentativas = 2;
  let ultimoErro = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa += 1) {
    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, senha },
      });
      setStoredAuth({ token: response.token, usuario: response.usuario });
      return { ok: true, usuario: response.usuario };
    } catch (error) {
      ultimoErro = error;
      const status = Number(error?.status || 0);
      const erroTransitorio = !status || status >= 500;
      if (!erroTransitorio || tentativa >= maxTentativas) break;
      await new Promise((resolve) => window.setTimeout(resolve, 350 * tentativa));
    }
  }

  return { ok: false, mensagem: ultimoErro?.message || "Não foi possível concluir o login." };
}

export function getSessao() {
  return getStoredUser();
}

export async function atualizarSessaoDoServidor() {
  const response = await apiFetch("/auth/me");
  setStoredUser(response.usuario);
  return response.usuario;
}

export function salvarSessao(usuario) {
  setStoredUser(usuario);
}

export async function encerrarSessao() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // Sessao local deve ser encerrada mesmo se o servidor ja tiver invalidado o token.
  }
  clearStoredAuth();
}

export async function cadastrarInstrutor({ nome, nomeGrade, email, whatsapp = "", senha, materias = [] }) {
  try {
    const response = await apiFetch("/instrutores", {
      method: "POST",
      body: { nome, nomeGrade, email, whatsapp, senha, materias },
    });
    return { ok: true, usuario: response.usuario };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function cadastrarGestor({ nome, email, senha, chefeSte = false }) {
  try {
    const response = await apiFetch("/admin/gestores", {
      method: "POST",
      body: { nome, email, senha, chefeSte },
    });
    return { ok: true, usuario: response.usuario };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function cadastrarInstrutorPeloGestor({ nome, nomeGrade, email, whatsapp = "", senha, materias = [] }) {
  try {
    const response = await apiFetch("/admin/instrutores", {
      method: "POST",
      body: { nome, nomeGrade, email, whatsapp, senha, materias },
    });
    return { ok: true, usuario: response.usuario };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function aprovarUsuario(id) {
  await apiFetch(`/usuarios/${id}/aprovar`, {
    method: "PATCH",
  });
}

export async function rejeitarUsuario(id) {
  await removerUsuario(id);
}

export async function atualizarUsuario(id, dados) {
  const response = await apiFetch(`/usuarios/${id}`, {
    method: "PATCH",
    body: dados,
  });
  return response.usuario;
}

export async function atualizarMateriasUsuario(id, materias = []) {
  const response = await apiFetch(`/usuarios/${id}/materias`, {
    method: "PATCH",
    body: { materias },
  });
  return response.usuario;
}

export async function removerUsuario(id) {
  await apiFetch(`/usuarios/${id}`, { method: "DELETE" });
}

export async function getInstrutores() {
  const response = await apiFetch("/usuarios/instrutores");
  return response.usuarios;
}

export async function getInstrutoresPendentes() {
  const response = await apiFetch("/usuarios/instrutores-pendentes");
  return response.usuarios;
}

export async function getGestores() {
  const response = await apiFetch("/usuarios/gestores");
  return response.usuarios;
}
