// Banco de dados fake para testes, pronto para migrar para backend depois

const CHAVE = "usuarios-e-ste";

// Sempre inicia com o gestor master
const MASTER = {
  email: "master",
  senha: "Ad696108",
  nome: "Gestor Master",
  perfil: "gestor",
  aprovado: true,
};

// Carregar todos os usuários do localStorage
export function getUsuarios() {
  const users = JSON.parse(localStorage.getItem(CHAVE)) || [];
  // Garante que sempre tenha o master
  if (!users.find(u => u.email === MASTER.email)) {
    users.push(MASTER);
    localStorage.setItem(CHAVE, JSON.stringify(users));
  }
  return users;
}

// Salvar usuário novo
export function saveUsuario(usuario) {
  const users = getUsuarios();
  users.push(usuario);
  localStorage.setItem(CHAVE, JSON.stringify(users));
}

// Atualizar um usuário (por email)
export function updateUsuario(email, novoUsuario) {
  let users = getUsuarios().map(u =>
    u.email === email ? { ...u, ...novoUsuario } : u
  );
  localStorage.setItem(CHAVE, JSON.stringify(users));
}

// Autenticação: retorna user se existir e aprovado
export function autentica(email, senha) {
  const users = getUsuarios();
  return users.find(u => u.email === email && u.senha === senha && u.aprovado);
}

// Buscar usuário por email
export function getUsuario(email) {
  return getUsuarios().find(u => u.email === email);
}

// Lista de instrutores pendentes de aprovação
export function getInstrutoresPendentes() {
  return getUsuarios().filter(u => u.perfil === "instrutor" && !u.aprovado);
}

// Lista de gestores (aprovados)
export function getGestores() {
  return getUsuarios().filter(u => u.perfil === "gestor" && u.aprovado);
}

// Retorna o gestor master
export function getGestorMaster() {
  return MASTER;
}
