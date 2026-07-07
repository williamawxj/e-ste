import { useEffect, useMemo, useState } from "react";
import AuxiliaresInfo from "../components/AuxiliaresInfo";
import Button from "../components/Button";
import Card from "../components/Card";
import LocalInstrucaoInfo from "../components/LocalInstrucaoInfo";
import PageShell from "../components/PageShell";
import ProvaInfo from "../components/ProvaInfo";
import {
  DIAS_SEMANA,
  confirmarQtsGestor,
  atualizarAuxiliaresHorario,
  atualizarProvaHorario,
  getHorariosPorTurmaSemana,
  getHorariosPorTurma,
  getMateriasDaTurma,
  getStatusNotificacaoEmail,
  getSemanas,
  getTurmas,
  removerHorario,
  salvarHorario,
  SLOTS_AULA,
} from "../utils/academicoDB";
import {
  calcularCargasMaterias,
  criarMapaCargaAulasPorHorario,
  getIndicadorCargaHorario,
  montarTituloHorarioComCarga,
} from "../utils/cargaHorariaProgressao";
import { filtrarSemanasPorMes, getMesAtualInput, listarMesesDasSemanas } from "../utils/dateUtils";
import { getInstrutores } from "../utils/usuariosDB";
import { exportarGradeExcel, exportarGradePDF, exportarQtsPDF } from "../utils/exportUtils";
import { getEstiloHorario } from "../utils/gradeColors";

const OPCOES_ESPECIAIS = [
  "A DISPOSICAO DA ESFAO",
  "A DISPOSICAO DA ESFAP",
  "MISSAO DABM",
  "FERIADO",
];

function normalizarNumeroWhatsapp(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("55")) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

function textoHorarioWhatsapp(horario, turma, semana) {
  if (!horario) return "";
  const conteudo = horario.texto || horario.materiaNome || horario.tipo || "Aula";
  return [
    `Turma: ${turma?.nome || "-"}`,
    `Semana: ${semana?.nome || "-"}`,
    `Dia: ${horario.dia || "-"}`,
    `Horário: ${horario.inicio || "-"} - ${horario.fim || "-"}`,
    `Conteúdo: ${conteudo}`,
    horario.prova ? "Tipo: Prova" : "",
    horario.localInstrucao ? `Local: ${horario.localInstrucao}` : "",
    Number(horario.auxiliaresAutorizados || 0) > 0 ? `Auxiliares autorizados: ${Number(horario.auxiliaresAutorizados || 0)}` : "",
  ].filter(Boolean).join("\n");
}

function chaveHorario(item) {
  if (!item) return "";
  const turma = item.turmaId || item.turma_id || "";
  const semana = item.semanaId || item.semana_id || "";
  return `${turma}|${semana}|${item.dia || ""}|${item.inicio || ""}`;
}

function erroPareceIndisponibilidade(error) {
  const status = Number(error?.status || 0);
  return !status || status >= 500;
}

async function executarComRetry(tarefa, { tentativas = 3, esperaMs = 700 } = {}) {
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    try {
      return await tarefa();
    } catch (error) {
      ultimoErro = error;
      if (tentativa < tentativas) {
        await new Promise((resolve) => window.setTimeout(resolve, esperaMs * tentativa));
      }
    }
  }
  throw ultimoErro;
}

export default function ModificarHorarios({ usuario }) {
  const [turmas, setTurmas] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(getMesAtualInput());
  const [instrutores, setInstrutores] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [horariosDaTurma, setHorariosDaTurma] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [semanaId, setSemanaId] = useState("");
  const [modo, setModo] = useState("aula");
  const [materiaId, setMateriaId] = useState("");
  const [instrutorId, setInstrutorId] = useState("");
  const [localInstrucao, setLocalInstrucao] = useState("CAEBM");
  const [prova, setProva] = useState(false);
  const [textoLivre, setTextoLivre] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [avisosWhatsapp, setAvisosWhatsapp] = useState([]);
  const [statusEmail, setStatusEmail] = useState({ configurado: false, mensagem: "", indisponivel: false, validado: false });
  const [versao, setVersao] = useState(0);
  const [horarioAuxiliar, setHorarioAuxiliar] = useState(null);
  const [auxiliaresForm, setAuxiliaresForm] = useState({ auxiliares: "", auxiliaresAutorizados: "", localInstrucao: "", prova: false, aulaCorrente: "" });
  const [remocoesPendentes, setRemocoesPendentes] = useState([]);

  const opcoesMes = useMemo(() => listarMesesDasSemanas(semanas), [semanas]);
  const semanasFiltradas = useMemo(
    () => filtrarSemanasPorMes(semanas, mesFiltro),
    [semanas, mesFiltro],
  );
  const turma = turmas.find((item) => item.id === turmaId);
  const semana = semanas.find((item) => item.id === semanaId);
  const materiasComStatusInstrutor = useMemo(
    () => materias.map((materia) => ({
      ...materia,
      possuiInstrutor: instrutores.some((instrutor) => (instrutor.materias || []).includes(materia.id)),
    })),
    [materias, instrutores],
  );
  const instrutoresDaMateria = useMemo(
    () => instrutores.filter((instrutor) => (instrutor.materias || []).includes(materiaId)),
    [instrutores, materiaId],
  );
  const chavesRemocoesPendentes = useMemo(
    () => new Set(remocoesPendentes.map((item) => chaveHorario(item)).filter(Boolean)),
    [remocoesPendentes],
  );
  const horariosVisiveis = useMemo(
    () => horarios.filter((item) => !chavesRemocoesPendentes.has(chaveHorario(item))),
    [horarios, chavesRemocoesPendentes],
  );
  const horariosDaTurmaVisiveis = useMemo(
    () => horariosDaTurma.filter((item) => !chavesRemocoesPendentes.has(chaveHorario(item))),
    [horariosDaTurma, chavesRemocoesPendentes],
  );
  const cargasMaterias = useMemo(
    () => calcularCargasMaterias(materias, horariosDaTurmaVisiveis, semanas),
    [materias, horariosDaTurmaVisiveis, semanas],
  );
  const cargasPorHorario = useMemo(
    () => criarMapaCargaAulasPorHorario({
      horarios: horariosDaTurmaVisiveis,
      materias,
      semanas,
    }),
    [horariosDaTurmaVisiveis, materias, semanas],
  );

  useEffect(() => {
    async function carregarBase() {
      const [turmasRes, semanasRes, instrutoresRes, emailRes] = await Promise.allSettled([
        getTurmas(),
        getSemanas(),
        getInstrutores(),
        getStatusNotificacaoEmail(),
      ]);
      if (turmasRes.status === "rejected") throw turmasRes.reason;
      if (semanasRes.status === "rejected") throw semanasRes.reason;
      if (instrutoresRes.status === "rejected") throw instrutoresRes.reason;

      const listaTurmas = turmasRes.value || [];
      const listaSemanas = semanasRes.value || [];
      const listaInstrutores = instrutoresRes.value || [];
      if (usuario?.perfil === "gestor" && !listaInstrutores.some((item) => item.id === usuario.id)) {
        listaInstrutores.push({
          id: usuario.id,
          nome: usuario.nome,
          nomeGrade: usuario.nomeGrade || usuario.nome,
          whatsapp: usuario.whatsapp || "",
          materias: usuario.materias || [],
        });
      }
      const email = emailRes.status === "fulfilled"
        ? emailRes.value
        : {
            configurado: false,
            mensagem: emailRes.reason?.message || "Status de e-mail indisponível.",
            indisponivel: erroPareceIndisponibilidade(emailRes.reason),
            validado: false,
          };

      setTurmas(listaTurmas);
      setSemanas(listaSemanas);
      setInstrutores(listaInstrutores);
      setStatusEmail(email || {
        configurado: false,
        mensagem: "Status de e-mail indisponível.",
        indisponivel: true,
        validado: false,
      });
      setTurmaId((atual) => atual || listaTurmas[0]?.id || "");
      setInstrutorId((atual) => atual || listaInstrutores[0]?.id || "");
      const mesesDisponiveis = listarMesesDasSemanas(listaSemanas);
      setMesFiltro((atual) => (
        mesesDisponiveis.some((item) => item.valor === atual)
          ? atual
          : (mesesDisponiveis[mesesDisponiveis.length - 1]?.valor || getMesAtualInput())
      ));
    }

    executarComRetry(carregarBase, { tentativas: 3, esperaMs: 750 }).catch((error) => {
      setTurmas([]);
      setSemanas([]);
      setInstrutores([]);
      setStatusEmail({ configurado: false, mensagem: "Status de e-mail indisponível.", indisponivel: false, validado: false });
      const indisponivel = erroPareceIndisponibilidade(error);
      setMensagem(
        indisponivel
          ? "Não foi possível acessar o banco de dados/API no momento. Verifique se a API está ativa e com conexão ao banco."
          : (error?.message || "Não foi possível carregar os dados da tela."),
      );
    });
  }, []);

  useEffect(() => {
    if (semanasFiltradas.length === 0) {
      setSemanaId("");
      return;
    }
    setSemanaId((atual) => (
      semanasFiltradas.some((item) => item.id === atual)
        ? atual
        : (semanasFiltradas[0]?.id || "")
    ));
  }, [semanasFiltradas]);

  useEffect(() => {
    async function carregarMaterias() {
      if (!turmaId) {
        setMaterias([]);
        setMateriaId("");
        return;
      }

      const lista = await getMateriasDaTurma(turmaId);
      setMaterias(lista);
      setMateriaId((atual) => lista.some((materia) => materia.id === atual) ? atual : lista[0]?.id || "");
    }

    carregarMaterias().catch(() => setMaterias([]));
  }, [turmaId]);

  useEffect(() => {
    async function carregarHorarios() {
      setHorarios(await getHorariosPorTurmaSemana(turmaId, semanaId));
    }

    if (turmaId && semanaId) {
      carregarHorarios().catch(() => setHorarios([]));
    } else {
      setHorarios([]);
    }
  }, [turmaId, semanaId, versao]);

  useEffect(() => {
    async function carregarHorariosDaTurma() {
      setHorariosDaTurma(await getHorariosPorTurma(turmaId));
    }

    if (turmaId) {
      carregarHorariosDaTurma().catch(() => setHorariosDaTurma([]));
    } else {
      setHorariosDaTurma([]);
    }
  }, [turmaId, versao]);

  useEffect(() => {
    setAvisosWhatsapp([]);
    setHorarioAuxiliar(null);
    setRemocoesPendentes([]);
  }, [turmaId, semanaId]);

  useEffect(() => {
    if (modo !== "aula") return;
    if (!materiaId) {
      setInstrutorId("");
      return;
    }

    setInstrutorId((atual) => (
      instrutoresDaMateria.some((instrutor) => instrutor.id === atual)
        ? atual
        : (instrutoresDaMateria[0]?.id || "")
    ));
  }, [modo, materiaId, instrutoresDaMateria]);

  function atualizarGrade() {
    setVersao((v) => v + 1);
  }

  function buscarInstrutorDoHorario(item) {
    return instrutores.find((instrutor) => instrutor.id === item?.instrutorId) || {
      id: item?.instrutorId || "",
      nome: item?.instrutorNome || "Instrutor",
      nomeGrade: item?.instrutorNome || "Instrutor",
      whatsapp: "",
    };
  }

  function criarAvisoWhatsapp(item, tipo = "alterada", instrutorInformado) {
    if (!item || item.tipo !== "aula" || !item.instrutorId) return null;

    const instrutor = instrutorInformado || buscarInstrutorDoHorario(item);
    const numero = normalizarNumeroWhatsapp(instrutor?.whatsapp);
    const nomeInstrutor = instrutor?.nomeGrade || instrutor?.nome || item.instrutorNome || "instrutor";
    const texto = [
      `Olá, ${nomeInstrutor}.`,
      `A STE informa que sua aula foi ${tipo}.`,
      "",
      textoHorarioWhatsapp(item, turma, semana),
      "",
      "Por favor, confira a grade no sistema.",
      `Gestor: ${usuario.nome}`,
    ].join("\n");

    return {
      id: `${item.id || item.dia}-${item.inicio}-${tipo}-${instrutor?.id || ""}`,
      instrutorNome: nomeInstrutor,
      whatsapp: instrutor?.whatsapp || "",
      href: numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : "",
      texto,
    };
  }

  function horarioParaAviso({ dia, slot, materia, instrutor, texto, tipo, local, provaMarcada }) {
    return {
      id: `${dia}-${slot.inicio}-${instrutor?.id || "gestor"}`,
      dia,
      inicio: slot.inicio,
      fim: slot.fim,
      materiaId: materia?.id || "",
      materiaNome: materia?.nome || "",
      instrutorId: instrutor?.id || "",
      instrutorNome: instrutor ? (instrutor.nomeGrade || instrutor.nome) : "Gestor",
      tipo,
      texto,
      localInstrucao: local || "",
      prova: Boolean(provaMarcada),
      auxiliaresAutorizados: 0,
    };
  }

  async function preencher(dia, slot) {
    if (!turmaId || !semanaId) {
      setMensagem("Selecione semana e turma.");
      return;
    }

    const existente = horariosVisiveis.find((horario) => horario.dia === dia && horario.inicio === slot.inicio);
    const materia = materias.find((item) => item.id === materiaId);
    const instrutor = instrutores.find((item) => item.id === instrutorId);
    const texto = modo === "aula" ? "" : (modo === "livre" ? textoLivre : modo);
    const instrutorPodeLecionarMateria = Boolean(
      materia && instrutor && (instrutor.materias || []).includes(materia.id),
    );

    if (modo === "aula" && (!materia || !instrutor)) {
      setMensagem("Para inserir aula, selecione uma matéria vinculada à turma e um instrutor.");
      return;
    }

    if (modo === "aula" && !instrutorPodeLecionarMateria) {
      setMensagem("A matéria selecionada não está associada ao instrutor informado.");
      return;
    }

    if (modo === "livre" && !textoLivre.trim()) {
      setMensagem("Digite o texto livre antes de inserir.");
      return;
    }

    const resultado = await salvarHorario({
      turmaId,
      semanaId,
      dia,
      inicio: slot.inicio,
      fim: slot.fim,
      materiaId: modo === "aula" ? materia.id : "",
      materiaNome: modo === "aula" ? materia.nome : "",
      instrutorId: modo === "aula" ? instrutor.id : usuario.id,
      instrutorNome: modo === "aula" ? (instrutor.nomeGrade || instrutor.nome) : "Gestor",
      tipo: modo === "aula" ? "aula" : "especial",
      texto,
      localInstrucao: modo === "aula" ? localInstrucao : "",
      prova: modo === "aula" ? prova : false,
      substituir: true,
    });

    if (resultado.ok) {
      const avisos = [];
      if (existente?.tipo === "aula") {
        avisos.push(criarAvisoWhatsapp(existente, "alterada"));
      }

      if (modo === "aula" && instrutor && (!existente || existente.instrutorId !== instrutor.id)) {
        const novoHorario = horarioParaAviso({
          dia,
          slot,
          materia,
          instrutor,
          texto,
          tipo: "aula",
          local: localInstrucao,
          provaMarcada: prova,
        });
        avisos.push(criarAvisoWhatsapp(novoHorario, "atribuida", instrutor));
      }

      const avisosValidos = avisos.filter(Boolean);
      setAvisosWhatsapp(avisosValidos);
      setMensagem(avisosValidos.length ? "Horário atualizado. Use o link de WhatsApp para avisar o instrutor." : "Horário atualizado.");
      setRemocoesPendentes((atual) => atual.filter((item) => (
        chaveHorario(item) !== `${turmaId}|${semanaId}|${dia}|${slot.inicio}`
      )));
    } else {
      setMensagem(resultado.mensagem);
    }

    atualizarGrade();
  }

  async function limpar(item) {
    const chave = chaveHorario(item);
    if (!chave) return;

    const jaPendente = remocoesPendentes.some((pendente) => chaveHorario(pendente) === chave);
    if (jaPendente) {
      setMensagem("Esta aula já está marcada para exclusão pendente de confirmação do QTS.");
      return;
    }

    setRemocoesPendentes((atual) => [...atual, item]);
    setAvisosWhatsapp([]);
    setMensagem("Aula marcada para exclusão. A remoção só será salva quando o gestor confirmar o QTS.");
    if (horarioAuxiliar?.id === item.id) setHorarioAuxiliar(null);
  }

  function abrirAuxiliares(item) {
    setHorarioAuxiliar(item);
    setAuxiliaresForm({
      auxiliares: item.auxiliares || "",
      auxiliaresAutorizados: String(item.auxiliaresAutorizados || ""),
      localInstrucao: item.localInstrucao || "",
      prova: Boolean(item.prova),
      aulaCorrente: item.aulaCorrente ? String(item.aulaCorrente) : "",
    });
  }

  async function alternarProvaHorario(item) {
    const novoValor = !item.prova;
    const resultado = await atualizarProvaHorario(item.id, novoValor);

    if (resultado.ok) {
      const avisosValidos = [criarAvisoWhatsapp({ ...item, prova: novoValor }, novoValor ? "marcada como prova" : "desmarcada como prova")].filter(Boolean);
      setAvisosWhatsapp(avisosValidos);
      setMensagem(`${novoValor ? "Horário marcado como prova." : "Marcação de prova removida."}${avisosValidos.length ? " Use o link de WhatsApp para avisar o instrutor." : ""}`);
    } else {
      setMensagem(resultado.mensagem);
    }

    if (resultado.ok && horarioAuxiliar?.id === item.id) {
      const atualizado = { ...horarioAuxiliar, prova: novoValor };
      setHorarioAuxiliar(atualizado);
      setAuxiliaresForm((atual) => ({ ...atual, prova: novoValor }));
    }

    atualizarGrade();
  }

  async function salvarAuxiliares() {
    if (!horarioAuxiliar) return;

    const resultadoAuxiliares = await atualizarAuxiliaresHorario(horarioAuxiliar.id, {
      auxiliares: auxiliaresForm.auxiliares,
      auxiliaresAutorizados: auxiliaresForm.auxiliaresAutorizados,
      localInstrucao: auxiliaresForm.localInstrucao,
      prova: auxiliaresForm.prova,
      aulaCorrente: auxiliaresForm.aulaCorrente,
    });

    if (resultadoAuxiliares.ok) {
      const avisosValidos = [criarAvisoWhatsapp({
        ...horarioAuxiliar,
        auxiliares: auxiliaresForm.auxiliares,
        auxiliaresAutorizados: auxiliaresForm.auxiliaresAutorizados,
        localInstrucao: auxiliaresForm.localInstrucao,
        prova: auxiliaresForm.prova,
        aulaCorrente: auxiliaresForm.aulaCorrente,
      }, "alterada")].filter(Boolean);
      setAvisosWhatsapp(avisosValidos);
      setMensagem(avisosValidos.length ? "Detalhes da instrução atualizados. Use o link de WhatsApp para avisar o instrutor." : "Detalhes da instrução atualizados.");
    } else {
      setMensagem(resultadoAuxiliares.mensagem);
    }

    setHorarioAuxiliar(null);
    atualizarGrade();
  }

  function exportarExcel() {
    exportarGradeExcel({
      horarios: horariosVisiveis,
      nomeArquivo: `grade-${turma?.nome || "turma"}.csv`,
      cargaAulasPorHorario: cargasPorHorario,
    });
  }

  async function exportarPDF() {
    await exportarGradePDF({
      horarios: horariosVisiveis,
      titulo: `Grade - ${turma?.nome || "Turma"} - ${semana?.nome || "Semana"}`,
      nomeArquivo: `grade-${turma?.nome || "turma"}.pdf`,
      cargaAulasPorHorario: cargasPorHorario,
      assinaturaTexto: `${String(usuario?.nome || "STE").trim().toUpperCase()} - ${usuario?.chefeSte ? "Chefe da STE CAEBMAEBM" : "Seção de Treinamento e Ensino - STE"}`,
    });
  }

  async function confirmarQts() {
    if (!turma || !semana) {
      setMensagem("Selecione uma turma e uma semana para confirmar o QTS.");
      return;
    }

    const totalPendentes = remocoesPendentes.length;
    let instrutoresRemovidosNaConfirmacao = [];
    let aulasCanceladasNaConfirmacao = [];
    const textoConfirmacao = totalPendentes > 0
      ? `Confirmar o QTS de ${turma.nome} - ${semana.nome}? Isso também vai excluir ${totalPendentes} aula(s) marcada(s) para exclusão.`
      : `Confirmar o QTS de ${turma.nome} - ${semana.nome}?`;
    if (!confirm(textoConfirmacao)) return;

    let horariosConfirmacao = [...horarios];
    let totalRemovidas = 0;

    if (totalPendentes > 0) {
      try {
        const gradeAtual = await getHorariosPorTurmaSemana(turmaId, semanaId);
        const mapaPorChave = new Map(gradeAtual.map((item) => [chaveHorario(item), item]));

        for (const pendente of remocoesPendentes) {
          const atual = mapaPorChave.get(chaveHorario(pendente));
          if (!atual?.id) continue;
          if (atual.tipo === "aula") {
            if (atual.instrutorId) instrutoresRemovidosNaConfirmacao.push(atual.instrutorId);
            aulasCanceladasNaConfirmacao.push({
              id: atual.id || "",
              turmaId: atual.turmaId || turmaId,
              turmaNome: atual.turmaNome || turma.nome,
              semanaId: atual.semanaId || semanaId,
              semanaNome: atual.semanaNome || semana.nome,
              dia: atual.dia || "",
              inicio: atual.inicio || "",
              fim: atual.fim || "",
              materiaId: atual.materiaId || "",
              materiaNome: atual.materiaNome || "",
              instrutorId: atual.instrutorId || "",
              instrutorNome: atual.instrutorNome || "",
              tipo: atual.tipo,
              texto: atual.texto || "",
              localInstrucao: atual.localInstrucao || "",
              prova: Boolean(atual.prova),
              auxiliares: atual.auxiliares || "",
              auxiliaresAutorizados: atual.auxiliaresAutorizados || 0,
              aulaCorrente: atual.aulaCorrente || null,
            });
          }
          await removerHorario(atual.id, { enviarEmailCancelamento: false });
          totalRemovidas += 1;
        }

        horariosConfirmacao = await getHorariosPorTurmaSemana(turmaId, semanaId);
        setHorarios(horariosConfirmacao);
        setRemocoesPendentes([]);
      } catch (error) {
        setMensagem(error.message || "Não foi possível aplicar as exclusões pendentes antes da confirmação do QTS.");
        return;
      }
    }

    const resultadoConfirmacao = await confirmarQtsGestor({
      turmaId,
      semanaId,
      instrutoresRemovidosIds: [...new Set(instrutoresRemovidosNaConfirmacao)],
      aulasCanceladas: aulasCanceladasNaConfirmacao,
    });
    if (!resultadoConfirmacao.ok) {
      setMensagem(resultadoConfirmacao.mensagem || "Não foi possível confirmar o QTS.");
      return;
    }

    await exportarQtsPDF({
      horarios: horariosConfirmacao.filter((item) => !chavesRemocoesPendentes.has(chaveHorario(item))),
      turma,
      semana,
      usuario,
      cargaAulasPorHorario: cargasPorHorario,
    });
    atualizarGrade();
    const resumoRemocoes = totalRemovidas > 0 ? ` ${totalRemovidas} aula(s) removida(s) na confirmação.` : "";
    setMensagem(`QTS confirmado e PDF gerado.${resumoRemocoes} ${resultadoConfirmacao.mensagem}`);
  }

  return (
    <PageShell
      title="Modificação de QTS"
      subtitle="Área do gestor para editar qualquer célula da grade, substituir aulas, inserir feriados e confirmar o QTS semanal."
      actions={<><Button variant="success" onClick={confirmarQts}>Confirmar QTS</Button><Button variant="secondary" onClick={exportarPDF}>PDF</Button><Button variant="secondary" onClick={exportarExcel}>Excel</Button></>}
    >
      <Card className="mb-6">
        <div className="grid gap-3 lg:grid-cols-5">
          <select
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {opcoesMes.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={semanaId} onChange={(e) => setSemanaId(e.target.value)}>
            <option value="">Semana</option>
            {semanasFiltradas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            <option value="">Turma</option>
            {turmas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="aula">Aula</option>
            {OPCOES_ESPECIAIS.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
            <option value="livre">Texto livre</option>
          </select>
          {modo === "livre" && <input className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Texto livre" value={textoLivre} onChange={(e) => setTextoLivre(e.target.value)} />}
        </div>
        {semanas.length > 0 && semanasFiltradas.length === 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Não há semanas cadastradas para o mês selecionado.
          </div>
        )}

        {modo === "aula" && (
          <div className="mt-3 grid gap-3 lg:grid-cols-4">
            <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={materiaId} onChange={(e) => setMateriaId(e.target.value)} disabled={materias.length === 0}>
              <option value="">Matéria</option>
              {materiasComStatusInstrutor.map((item) => {
                const carga = cargasMaterias[item.id] || { aulasLancadas: 0, cargaHoraria: Number(item.cargaHoraria || 0) };
                return (
                  <option key={item.id} value={item.id} disabled={!item.possuiInstrutor}>
                    {item.nome} - {carga.aulasLancadas}({carga.cargaHoraria}){item.possuiInstrutor ? "" : " - sem instrutor associado"}
                  </option>
                );
              })}
            </select>
            <select
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={instrutorId}
              onChange={(e) => setInstrutorId(e.target.value)}
              disabled={!materiaId || instrutoresDaMateria.length === 0}
            >
              <option value="">{materiaId ? "Instrutor" : "Selecione a matéria primeiro"}</option>
              {instrutoresDaMateria.map((item) => <option key={item.id} value={item.id}>{item.nomeGrade || item.nome}</option>)}
            </select>
            <input
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Local da instrução (sugerido: CAEBM)"
              value={localInstrucao}
              onChange={(e) => setLocalInstrucao(e.target.value)}
            />
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={prova} onChange={(e) => setProva(e.target.checked)} />
              Prova
            </label>
          </div>
        )}

        {modo === "aula" && materiaId && cargasMaterias[materiaId] && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
            Carga da matéria selecionada: {cargasMaterias[materiaId].aulasLancadas}({cargasMaterias[materiaId].cargaHoraria})
          </div>
        )}

        {modo === "aula" && materiaId && instrutoresDaMateria.length === 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            A matéria selecionada não possui instrutor associado. Associe essa matéria a pelo menos um instrutor para lançar aula.
          </div>
        )}

        {modo === "aula" && turmaId && materias.length === 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            A turma selecionada não possui matérias vinculadas em Matérias por turma.
          </div>
        )}
        {statusEmail.indisponivel && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Não foi possível consultar o status de e-mail porque a API/banco está indisponível. {statusEmail.mensagem || ""}
          </div>
        )}
        {!statusEmail.indisponivel && statusEmail.validado && !statusEmail.configurado && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            E-mail automático desativado. Configure SMTP_HOST, SMTP_FROM, SMTP_USER e SMTP_PASS no arquivo .env para ativar os avisos por e-mail aos instrutores.
          </div>
        )}
        {mensagem && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{mensagem}</div>}
        {remocoesPendentes.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="font-bold">Exclusões pendentes de confirmação</div>
            <div className="mt-1">
              {remocoesPendentes.length} aula(s) marcada(s) para exclusão. Essas alterações só serão salvas após clicar em Confirmar QTS.
            </div>
            <div className="mt-2">
              <Button variant="secondary" onClick={() => setRemocoesPendentes([])}>
                Desfazer exclusões pendentes
              </Button>
            </div>
          </div>
        )}
        {avisosWhatsapp.length > 0 && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="font-bold">Mensagem pronta para WhatsApp</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {avisosWhatsapp.map((aviso) => (
                aviso.href ? (
                  <a
                    key={aviso.id}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    href={aviso.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir WhatsApp para {aviso.instrutorNome}
                  </a>
                ) : (
                  <span key={aviso.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    Cadastre o WhatsApp de {aviso.instrutorNome} para gerar o link.
                  </span>
                )
              ))}
            </div>
          </div>
        )}
      </Card>

      {horarioAuxiliar && (
        <Card className="mb-6 border-2 border-blue-300 bg-blue-50">
          <div className="mb-4 flex flex-col gap-3 border-b border-blue-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase text-blue-800">Horário preenchido selecionado para alteração</div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                {montarTituloHorarioComCarga(horarioAuxiliar, cargasPorHorario)}
              </div>
              <div className="text-xs text-slate-700">
                {horarioAuxiliar.dia}, {horarioAuxiliar.inicio} - {horarioAuxiliar.fim}
              </div>
              {getIndicadorCargaHorario(horarioAuxiliar, cargasPorHorario) && (
                <div className="text-xs text-slate-700">
                  Carga: <b>{getIndicadorCargaHorario(horarioAuxiliar, cargasPorHorario)}</b>
                </div>
              )}
              {horarioAuxiliar.instrutorNome && (
                <div className="text-xs text-slate-700">Instrutor: {horarioAuxiliar.instrutorNome}</div>
              )}
              <div className="mt-2 text-xs text-amber-800">
                Solicitados pelo instrutor: <b>{horarioAuxiliar.auxiliaresSolicitados || 0}</b>
              </div>
            </div>
            <span className={`rounded-xl px-3 py-2 text-sm font-bold ${auxiliaresForm.prova ? "bg-amber-100 text-amber-800" : "bg-white text-slate-700"}`}>
              {auxiliaresForm.prova ? "Marcado como prova" : "Aula sem prova"}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[140px_140px_1fr_160px_1.4fr_auto]">

            <label className="text-sm font-semibold text-slate-700">
              Auxiliares autorizados
              <input
                type="number"
                min="0"
                max="20"
                className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                value={auxiliaresForm.auxiliaresAutorizados}
                onChange={(event) => setAuxiliaresForm((atual) => ({ ...atual, auxiliaresAutorizados: event.target.value }))}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Aula corrente (vazio = auto)
              <input
                type="number"
                min="1"
                className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                value={auxiliaresForm.aulaCorrente}
                onChange={(event) => setAuxiliaresForm((atual) => ({ ...atual, aulaCorrente: event.target.value }))}
                placeholder="Auto"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Local da instrução
              <input
                className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                value={auxiliaresForm.localInstrucao}
                onChange={(event) => setAuxiliaresForm((atual) => ({ ...atual, localInstrucao: event.target.value }))}
                placeholder="Ex.: Sala 3, patio, campo"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(auxiliaresForm.prova)}
                onChange={(event) => setAuxiliaresForm((atual) => ({ ...atual, prova: event.target.checked }))}
              />
              Marcar como prova
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Auxiliares / observacoes internas
              <textarea
                className="mt-1 h-20 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                value={auxiliaresForm.auxiliares}
                onChange={(event) => setAuxiliaresForm((atual) => ({ ...atual, auxiliares: event.target.value }))}
                placeholder="Ex.: Sgt Silva, Cb Souza"
              />
            </label>

            <div className="flex items-end gap-2">
              <Button variant="success" onClick={salvarAuxiliares}>Salvar alterações</Button>
              <Button variant="secondary" onClick={() => setHorarioAuxiliar(null)}>Cancelar seleção</Button>
            </div>
          </div>
        </Card>
      )}

      <div key={versao} className="overflow-x-auto rounded-2xl border border-black">
        <table className="min-w-[900px] border-collapse bg-white text-[15px] md:min-w-full">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="w-36 border border-black p-3.5 text-left">Horário</th>
              {DIAS_SEMANA.map((dia) => <th key={dia} className="border border-black p-3.5 text-left">{dia}</th>)}
            </tr>
          </thead>
          <tbody>
            {SLOTS_AULA.map((slot) => (
              <tr key={slot.inicio} className={slot.intervalo ? "bg-slate-100" : ""}>
                <td className="border border-black p-3.5 font-semibold text-slate-700">{slot.inicio} - {slot.fim}</td>
                {DIAS_SEMANA.map((dia) => {
                  const item = horariosVisiveis.find((horario) => horario.dia === dia && horario.inicio === slot.inicio);
                  if (slot.intervalo) return <td key={dia} className="border border-black p-3.5 text-center text-slate-500">{slot.rotulo || "Intervalo"}</td>;
                  const selecionado = item && horarioAuxiliar?.id === item.id;
                  const avisoWhatsapp = item?.tipo === "aula" ? criarAvisoWhatsapp(item, "alterada") : null;
                  return (
                    <td key={dia} className="h-28 border border-black p-2.5 align-top">
                      {item ? (
                        <div className={`rounded-xl border p-2.5 text-sm font-medium shadow-sm ${selecionado ? "ring-4 ring-blue-300" : ""}`} style={getEstiloHorario(item)}>
                          {selecionado && (
                            <div className="mb-1 rounded-md bg-blue-700 px-2 py-1 text-[10px] font-bold uppercase text-white">
                              Selecionado para alteração
                            </div>
                          )}
                          <b>{montarTituloHorarioComCarga(item, cargasPorHorario)}</b><br />
                          <span>{item.texto ? "" : item.instrutorNome}</span>
                          <ProvaInfo horario={item} />
                          <LocalInstrucaoInfo horario={item} compacto />
                          <AuxiliaresInfo horario={item} compacto />
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button className="rounded-md bg-white/70 px-2 py-1 text-blue-700 underline" onClick={() => preencher(dia, slot)}>Substituir</button>
                            {item.tipo === "aula" && (
                              <>
                                <button className="rounded-md bg-white/70 px-2 py-1 text-emerald-700 underline" onClick={() => abrirAuxiliares(item)}>Editar aula/prova</button>
                                <button className="rounded-md bg-white/70 px-2 py-1 text-amber-700 underline" onClick={() => alternarProvaHorario(item)}>
                                  {item.prova ? "Desmarcar prova" : "Marcar prova"}
                                </button>
                                {avisoWhatsapp?.href ? (
                                  <a className="rounded-md bg-white/70 px-2 py-1 text-green-700 underline" href={avisoWhatsapp.href} target="_blank" rel="noreferrer">
                                    Avisar WhatsApp
                                  </a>
                                ) : (
                                  <button className="rounded-md bg-white/70 px-2 py-1 text-slate-700 underline" onClick={() => setMensagem(`Cadastre o WhatsApp de ${item.instrutorNome || "instrutor"} para gerar o link.`)}>
                                    WhatsApp sem numero
                                  </button>
                                )}
                              </>
                            )}
                            <button className="rounded-md bg-white/70 px-2 py-1 text-red-700 underline" onClick={() => limpar(item)}>Excluir</button>
                          </div>
                        </div>
                      ) : (
                        <button className="h-full w-full rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-700" onClick={() => preencher(dia, slot)}>
                          + inserir
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

