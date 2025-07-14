// src/utils/usuariosDB.js
const CHAVE = "usuarios-e-ste";

function normalizarEmail(email) {
  return (email || "").trim().toLowerCase();
}

// Gestor master padrão
const MASTER = {
  email: normalizarEmail("master"),
  senha: "Ad696108",
  nome: "Gestor Master",
  perfil: "gestor",
  aprovado: true,
};

// Carregar todos os usuários do localStorage
export function getUsuarios() {
  const users = JSON.parse(localStorage.getItem(CHAVE)) || [];

  // Garante que sempre tenha o gestor master
  if (!users.find(u => normalizarEmail(u.email) === MASTER.email)) {
    users.push(MASTER);
    localStorage.setItem(CHAVE, JSON.stringify(users));
  }

  return users;
}

// Salvar novo usuário com email normalizado
export function saveUsuario(usuario) {
  const users = getUsuarios();

  const usuarioComEmailLimpo = {
    ...usuario,
    email: normalizarEmail(usuario.email)
  };

  users.push(usuarioComEmailLimpo);
  localStorage.setItem(CHAVE, JSON.stringify(users));
}

// Atualizar usuário existente (comparando email já normalizado)
export function updateUsuario(email, novoUsuario) {
  const emailNormalizado = normalizarEmail(email);

  const usersAtualizados = getUsuarios().map(u =>
    normalizarEmail(u.email) === emailNormalizado
      ? { ...u, ...novoUsuario, email: normalizarEmail(novoUsuario.email || u.email) }
      : u
  );

  localStorage.setItem(CHAVE, JSON.stringify(usersAtualizados));
}

// Autenticação com email e senha
export function autentica(email, senha) {
  const emailNormalizado = normalizarEmail(email);
  const usuario = getUsuarios().find(u => normalizarEmail(u.email) === emailNormalizado);

  if (!usuario || usuario.senha !== senha || !usuario.aprovado) {
    return null;
  }

  return usuario;
}

// Buscar usuário por email
export function getUsuario(email) {
  const emailNormalizado = normalizarEmail(email);
  return getUsuarios().find(u => normalizarEmail(u.email) === emailNormalizado);
}

// Lista de instrutores pendentes
export function getInstrutoresPendentes() {
  return getUsuarios().filter(u => u.perfil === "instrutor" && !u.aprovado);
}

// Lista de gestores aprovados
export function getGestores() {
  return getUsuarios().filter(u => u.perfil === "gestor" && u.aprovado);
}

// Gestor master
export function getGestorMaster() {
  return MASTER;
}
