import { apiFetch, getStoredToken, withApiLoading } from "./apiClient";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const DIAS_SEMANA = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"];
export const SLOTS_AULA = [
  { inicio: "08:00", fim: "08:45", periodo: "Manha" },
  { inicio: "08:45", fim: "09:30", periodo: "Manha" },
  { inicio: "09:30", fim: "10:15", periodo: "Manha" },
  { inicio: "10:15", fim: "10:30", intervalo: true, rotulo: "Intervalo" },
  { inicio: "10:30", fim: "11:15", periodo: "Manha" },
  { inicio: "11:15", fim: "12:00", periodo: "Manha" },
  { inicio: "12:00", fim: "14:00", intervalo: true, rotulo: "Almoço" },
  { inicio: "14:00", fim: "14:45", periodo: "Tarde" },
  { inicio: "14:45", fim: "15:30", periodo: "Tarde" },
  { inicio: "15:30", fim: "15:45", intervalo: true, rotulo: "Intervalo" },
  { inicio: "15:45", fim: "16:30", periodo: "Tarde" },
  { inicio: "16:30", fim: "17:15", periodo: "Tarde" },
  { inicio: "17:15", fim: "18:00", periodo: "Tarde" },
];

export async function getMaterias() {
  const response = await apiFetch("/materias");
  return response.materias;
}

export async function getChefesMateria() {
  const response = await apiFetch("/materias/chefes");
  return response.chefes || [];
}

export async function definirChefeMateria(materiaId, instrutorId = "") {
  if (!materiaId) return { ok: false, mensagem: "Matéria não informada." };
  try {
    const response = await apiFetch(`/materias/${materiaId}/chefe`, {
      method: "PUT",
      body: { instrutorId },
    });
    return {
      ok: true,
      mensagem: response.mensagem || "Chefe da pasta atualizado.",
      chefe: response.chefe || null,
    };
  } catch (error) {
    return {
      ok: false,
      mensagem: error.message || "Não foi possível atualizar o chefe da pasta.",
    };
  }
}

export async function getMateriasDoUsuario(usuario) {
  const materias = await getMaterias();
  if (!usuario) return [];
  if (usuario.perfil === "gestor") return materias;

  const materiasUsuario = usuario.materias || [];
  return materias.filter((materia) => materiasUsuario.includes(materia.id));
}

export async function salvarMateria({ nome, cargaHoraria = 0 }) {
  const response = await apiFetch("/materias", {
    method: "POST",
    body: { nome, cargaHoraria },
  });
  return response.materia;
}

export async function atualizarMateria(id, dados = {}) {
  const response = await apiFetch(`/materias/${id}`, {
    method: "PATCH",
    body: dados,
  });
  return response.materia;
}

export async function removerMateria(id) {
  await apiFetch(`/materias/${id}`, { method: "DELETE" });
}

export async function getTurmas() {
  const response = await apiFetch("/turmas");
  return response.turmas;
}

export async function salvarTurma({ nome, materias = [] }) {
  const response = await apiFetch("/turmas", {
    method: "POST",
    body: { nome, materias },
  });
  return response.turma;
}

export async function atualizarTurma(id, dados) {
  if (dados.materias !== undefined) {
    return atualizarMateriasTurma(id, dados.materias);
  }
  return null;
}

export async function atualizarMateriasTurma(id, materias = []) {
  const response = await apiFetch(`/turmas/${id}/materias`, {
    method: "PATCH",
    body: { materias },
  });
  return response.turma;
}

export async function getMateriasDaTurma(turmaId) {
  const [turmas, materias] = await Promise.all([getTurmas(), getMaterias()]);
  const turma = turmas.find((item) => item.id === turmaId);
  if (!turma) return [];

  const materiasTurma = turma.materias || [];
  return materias.filter((materia) => materiasTurma.includes(materia.id));
}

export async function getMateriasParaPreenchimento(usuario, turmaId) {
  const [materiasUsuario, materiasTurma] = await Promise.all([
    getMateriasDoUsuario(usuario),
    getMateriasDaTurma(turmaId),
  ]);
  const idsDaTurma = new Set(materiasTurma.map((materia) => materia.id));
  return materiasUsuario.filter((materia) => idsDaTurma.has(materia.id));
}

export async function removerTurma(id) {
  await apiFetch(`/turmas/${id}`, { method: "DELETE" });
}

export async function getSemanas(mes = "") {
  const params = new URLSearchParams();
  if (mes) params.set("mes", mes);
  const query = params.toString();
  const response = await apiFetch(`/semanas${query ? `?${query}` : ""}`);
  return response.semanas;
}

export async function salvarSemana({ nome, inicio, fim }) {
  const response = await apiFetch("/semanas", {
    method: "POST",
    body: { nome, inicio, fim },
  });
  return response.semana;
}

export async function removerSemana(id) {
  await apiFetch(`/semanas/${id}`, { method: "DELETE" });
}

export async function getHorarios() {
  const response = await apiFetch("/horarios");
  return response.horarios;
}

export async function salvarHorario(registro) {
  try {
    const response = await apiFetch("/horarios", {
      method: "POST",
      body: registro,
    });
    return { ok: true, horario: response.horario };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function removerHorario(id, opcoes = {}) {
  const body = opcoes && Object.keys(opcoes).length > 0 ? opcoes : undefined;
  await apiFetch(`/horarios/${id}`, { method: "DELETE", body });
}

export async function solicitarAuxiliaresHorario(id, quantidade) {
  try {
    const response = await apiFetch(`/horarios/${id}/auxiliares/solicitar`, {
      method: "PATCH",
      body: { quantidade },
    });
    return { ok: true, horario: response.horario };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function atualizarAuxiliaresHorario(id, dados) {
  try {
    const response = await apiFetch(`/horarios/${id}/auxiliares`, {
      method: "PATCH",
      body: dados,
    });
    return { ok: true, horario: response.horario };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function atualizarLocalHorario(id, localInstrucao) {
  try {
    const response = await apiFetch(`/horarios/${id}/local`, {
      method: "PATCH",
      body: { localInstrucao },
    });
    return { ok: true, horario: response.horario };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function atualizarProvaHorario(id, prova) {
  try {
    const response = await apiFetch(`/horarios/${id}/prova`, {
      method: "PATCH",
      body: { prova },
    });
    return { ok: true, horario: response.horario };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function getHorariosPorTurmaSemana(turmaId, semanaId) {
  if (!turmaId || !semanaId) return [];
  const params = new URLSearchParams({ turmaId, semanaId });
  const response = await apiFetch(`/horarios?${params.toString()}`);
  return response.horarios;
}

export async function getHorariosPorTurma(turmaId) {
  if (!turmaId) return [];
  const params = new URLSearchParams({ turmaId });
  const response = await apiFetch(`/horarios?${params.toString()}`);
  return response.horarios;
}

export async function getHorariosPorSemana(semanaId) {
  if (!semanaId) return [];
  const params = new URLSearchParams({ semanaId });
  const response = await apiFetch(`/horarios?${params.toString()}`);
  return response.horarios;
}

export async function getConfirmacaoHorariosInstrutor({ turmaId, semanaId, instrutorId = "" }) {
  if (!turmaId || !semanaId) return { confirmado: false, confirmadoEm: null };
  const params = new URLSearchParams({ turmaId, semanaId });
  if (instrutorId) params.set("instrutorId", instrutorId);
  const response = await apiFetch(`/horarios/confirmacao?${params.toString()}`);
  return {
    confirmado: Boolean(response.confirmado),
    confirmadoEm: response.confirmadoEm || null,
  };
}

export async function confirmarHorariosInstrutor({ turmaId, semanaId, aulas = [] }) {
  try {
    const response = await apiFetch("/horarios/confirmacao", {
      method: "POST",
      body: { turmaId, semanaId, aulas },
    });
    return {
      ok: true,
      confirmado: Boolean(response.confirmado),
      confirmadoEm: response.confirmadoEm || null,
      emailInstrutor: response.emailInstrutor || { enviado: false, motivo: "" },
    };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function getSolicitacoesModificacaoHorario({ mes = "" } = {}) {
  const params = new URLSearchParams();
  if (mes) params.set("mes", mes);
  const query = params.toString();
  const response = await apiFetch(`/solicitacoes-modificacao-horario${query ? `?${query}` : ""}`);
  return response.solicitacoes || [];
}

export async function getStatusNotificacaoEmail() {
  try {
    const response = await apiFetch("/notificacoes/email/status");
    return {
      ...(response.email || { configurado: false, mensagem: "Status de e-mail indisponível." }),
      indisponivel: false,
      validado: true,
    };
  } catch (error) {
    const status = Number(error?.status || 0);
    const mensagem = error?.message || "Status de e-mail indisponível.";
    const indisponivel = !status || status >= 500;
    return {
      configurado: false,
      mensagem,
      indisponivel,
      status,
      validado: false,
    };
  }
}

export async function getContatoSte() {
  try {
    const response = await apiFetch("/contato-ste");
    return response.contato || { nome: "STE", whatsapp: "", email: "" };
  } catch {
    return { nome: "STE", whatsapp: "", email: "" };
  }
}

export async function getContatoSteGestao() {
  try {
    const response = await apiFetch("/admin/contato-ste");
    return response.contato || { nome: "STE", whatsapp: "", email: "" };
  } catch (error) {
    return { nome: "STE", whatsapp: "", email: "", erro: error.message || "Nao foi possivel carregar o contato da STE." };
  }
}

export async function salvarContatoSteGestao({ whatsapp = "" }) {
  try {
    const response = await apiFetch("/admin/contato-ste", {
      method: "PUT",
      body: { whatsapp },
    });
    return {
      ok: true,
      contato: response.contato || { nome: "STE", whatsapp: "", email: "" },
      mensagem: response.mensagem || "Contato da STE atualizado com sucesso.",
    };
  } catch (error) {
    return { ok: false, mensagem: error.message || "Nao foi possivel salvar o contato da STE." };
  }
}

export async function confirmarQtsGestor({ turmaId, semanaId, instrutoresRemovidosIds = [], aulasCanceladas = [] }) {
  try {
    const response = await apiFetch("/qts/confirmacao", {
      method: "POST",
      body: { turmaId, semanaId, instrutoresRemovidosIds, aulasCanceladas },
    });
    return {
      ok: true,
      mensagem: response.mensagem || "",
      email: response.email || {},
    };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function solicitarModificacaoHorario({ turmaId, semanaId, motivo }) {
  try {
    const response = await apiFetch("/solicitacoes-modificacao-horario", {
      method: "POST",
      body: { turmaId, semanaId, motivo },
    });
    return { ok: true, solicitacao: response.solicitacao };
  } catch (error) {
    return { ok: false, mensagem: error.message };
  }
}

export async function localizarHorario({ turmaId, semanaId, dia, inicio }) {
  const horarios = await getHorariosPorTurmaSemana(turmaId, semanaId);
  return horarios.find((horario) => horario.dia === dia && horario.inicio === inicio);
}

export async function getHorasAulaMensal(mes) {
  const params = new URLSearchParams({ mes });
  const response = await apiFetch(`/relatorios/horas-aula?${params.toString()}`);
  return response;
}

export async function getRelatorioCargaHoraria(turmaId = "", mes = "") {
  const params = new URLSearchParams();
  if (turmaId) params.set("turmaId", turmaId);
  if (mes) params.set("mes", mes);
  const query = params.toString();
  return apiFetch(`/relatorios/carga-horaria${query ? `?${query}` : ""}`);
}

export async function getStatusBancoDados() {
  const response = await apiFetch("/admin/banco/status");
  return response.status || null;
}

function extrairNomeArquivo(disposition, fallback = "backup-grades.json") {
  const valor = String(disposition || "");
  const utf8 = valor.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }

  const simples = valor.match(/filename=\"?([^\";]+)\"?/i);
  return simples?.[1] || fallback;
}

export async function baixarBackupGrades() {
  const token = getStoredToken();
  if (!token) {
    return { ok: false, mensagem: "Sessão expirada. Faça login novamente." };
  }

  try {
    const response = await withApiLoading(() => fetch(`${API_BASE}/admin/banco/backup-grades`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }));

    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return { ok: false, mensagem: data.mensagem || "Não foi possível gerar o backup." };
      } catch {
        return { ok: false, mensagem: "Resposta inesperada do servidor ao gerar backup." };
      }
    }

    const blob = await response.blob();
    const filename = extrairNomeArquivo(
      response.headers.get("content-disposition"),
      `e-ste-backup-grades-${new Date().toISOString().slice(0, 10)}.json`,
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return { ok: true, arquivo: filename };
  } catch (error) {
    return { ok: false, mensagem: error.message || "Não foi possível gerar o backup." };
  }
}

export async function esvaziarGradesPreenchidas() {
  try {
    const response = await apiFetch("/admin/banco/esvaziar-grades", {
      method: "POST",
      body: { confirmar: true },
    });
    return {
      ok: true,
      mensagem: response.mensagem || "Grades removidas com sucesso.",
      removidos: response.removidos || {},
      status: response.status || null,
    };
  } catch (error) {
    return { ok: false, mensagem: error.message || "Não foi possível esvaziar as grades." };
  }
}

export async function enviarConvocacaoPorMateria({ materiaId, periodoInicio, periodoFim, observacao = "" }) {
  try {
    const response = await apiFetch("/admin/convocacoes/materia", {
      method: "POST",
      body: { materiaId, periodoInicio, periodoFim, observacao },
    });
    return {
      ok: true,
      mensagem: response.mensagem || "Convocação enviada com sucesso.",
      resultado: response.resultado || {},
    };
  } catch (error) {
    return { ok: false, mensagem: error.message || "Não foi possível enviar a convocação." };
  }
}

export async function enviarComunicacaoChefeMateria({ materiaId, periodoInicio, periodoFim, observacao = "" }) {
  try {
    const response = await apiFetch("/admin/comunicacoes/chefe-materia", {
      method: "POST",
      body: { materiaId, periodoInicio, periodoFim, observacao },
    });
    return {
      ok: true,
      mensagem: response.mensagem || "Comunicação enviada ao chefe da pasta.",
      resultado: response.resultado || {},
    };
  } catch (error) {
    return { ok: false, mensagem: error.message || "Não foi possível comunicar o chefe da pasta." };
  }
}

export async function solicitarGestorParaDarAulas({ gestorDestinoId, periodoInicio, periodoFim, observacao = "" }) {
  try {
    const response = await apiFetch("/admin/solicitacoes/gestor-aulas", {
      method: "POST",
      body: { gestorDestinoId, periodoInicio, periodoFim, observacao },
    });
    return {
      ok: true,
      mensagem: response.mensagem || "Solicitação enviada com sucesso.",
      resultado: response.resultado || {},
    };
  } catch (error) {
    return { ok: false, mensagem: error.message || "Não foi possível enviar a solicitação." };
  }
}

export async function notificarChefeDaMateria({ materiaId, instrutorInteressadoId, observacao = "" }) {
  try {
    const response = await apiFetch("/admin/comunicacoes/pretensao-materia", {
      method: "POST",
      body: { materiaId, instrutorInteressadoId, observacao },
    });
    return {
      ok: true,
      mensagem: response.mensagem || "Aviso enviado com sucesso ao chefe da pasta.",
      resultado: response.resultado || {},
    };
  } catch (error) {
    return { ok: false, mensagem: error.message || "Não foi possível enviar o aviso ao chefe da pasta." };
  }
}

