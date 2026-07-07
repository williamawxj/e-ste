import { useEffect, useMemo, useState } from "react";
import AuxiliaresInfo from "../components/AuxiliaresInfo";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import LocalInstrucaoInfo from "../components/LocalInstrucaoInfo";
import PageShell from "../components/PageShell";
import ProvaInfo from "../components/ProvaInfo";
import {
  atualizarLocalHorario,
  atualizarProvaHorario,
  confirmarHorariosInstrutor,
  DIAS_SEMANA,
  getConfirmacaoHorariosInstrutor,
  getContatoSte,
  getHorariosPorSemana,
  getHorariosPorTurma,
  getHorariosPorTurmaSemana,
  getMateriasDaTurma,
  getMateriasParaPreenchimento,
  getSemanas,
  getTurmas,
  removerHorario,
  salvarHorario,
  solicitarAuxiliaresHorario,
  SLOTS_AULA,
} from "../utils/academicoDB";
import {
  calcularCargasMaterias,
  criarMapaCargaAulasPorHorario,
  montarTituloHorarioComCarga,
} from "../utils/cargaHorariaProgressao";
import {
  dataComOffset,
  filtrarSemanasPorMes,
  formatarDataBR,
  formatarPeriodoBR,
  getMesAtualInput,
  listarMesesDasSemanas,
} from "../utils/dateUtils";
import { getEstiloHorario } from "../utils/gradeColors";

function normalizarNumeroWhatsapp(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("55")) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

const AVISO_AULAS_PENDENTES = "A aula ainda não está confirmada. Caso você deixe a página, as atualizações serão perdidas.";

function chaveHorarioGrade(item) {
  return `${item?.turmaId || ""}|${item?.semanaId || ""}|${item?.dia || ""}|${item?.inicio || ""}`;
}

function combinarHorariosComPendentes(horarios, pendentes) {
  const mapa = new Map();
  (horarios || []).forEach((horario) => mapa.set(chaveHorarioGrade(horario), horario));
  (pendentes || []).forEach((horario) => mapa.set(chaveHorarioGrade(horario), horario));
  return Array.from(mapa.values());
}

function criarIdPendente() {
  return `pendente_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function PreenchimentoHorarios({ usuario }) {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(getMesAtualInput());
  const [turmaId, setTurmaId] = useState("");
  const [semanaId, setSemanaId] = useState("");
  const [materiaId, setMateriaId] = useState("");
  const [localInstrucao, setLocalInstrucao] = useState("CAEBM");
  const [prova, setProva] = useState(false);
  const [materiasDaTurma, setMateriasDaTurma] = useState([]);
  const [materiasDaTurmaCompleta, setMateriasDaTurmaCompleta] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [horariosDaTurma, setHorariosDaTurma] = useState([]);
  const [horariosDaSemana, setHorariosDaSemana] = useState([]);
  const [aulasPendentes, setAulasPendentes] = useState([]);
  const [confirmacao, setConfirmacao] = useState({ confirmado: false, confirmadoEm: null });
  const [confirmando, setConfirmando] = useState(false);
  const [contatoSte, setContatoSte] = useState({ nome: "STE", whatsapp: "", email: "" });
  const [mensagem, setMensagem] = useState("");
  const [versao, setVersao] = useState(0);

  const turmaSelecionada = turmas.find((turma) => turma.id === turmaId);
  const semanaSelecionada = semanas.find((semana) => semana.id === semanaId);
  const ehInstrutor = usuario?.perfil === "instrutor" || usuario?.perfil === "gestor";
  const temAulasPendentes = ehInstrutor && aulasPendentes.length > 0;
  const horariosVisiveis = useMemo(
    () => combinarHorariosComPendentes(horarios, aulasPendentes),
    [horarios, aulasPendentes],
  );
  const horariosDaTurmaComPendentes = useMemo(
    () => combinarHorariosComPendentes(horariosDaTurma, aulasPendentes),
    [horariosDaTurma, aulasPendentes],
  );
  const horariosDaSemanaComPendentes = useMemo(
    () => combinarHorariosComPendentes(horariosDaSemana, aulasPendentes),
    [horariosDaSemana, aulasPendentes],
  );
  const contador = horariosVisiveis.filter((horario) => horario.instrutorId === usuario.id).length;
  const bloqueadoPorConfirmacao = ehInstrutor && Boolean(confirmacao.confirmado);
  const opcoesMes = useMemo(() => listarMesesDasSemanas(semanas), [semanas]);
  const semanasFiltradas = useMemo(
    () => filtrarSemanasPorMes(semanas, mesFiltro),
    [semanas, mesFiltro],
  );
  const prontoParaPreencher = Boolean(turmaId && semanaId && materiasDaTurma.length > 0);
  const cargasMaterias = useMemo(
    () => calcularCargasMaterias(materiasDaTurma, horariosDaTurmaComPendentes, semanas),
    [materiasDaTurma, horariosDaTurmaComPendentes, semanas],
  );
  const cargaSelecionada = cargasMaterias[materiaId];
  const cargaSelecionadaAtingida = ehInstrutor
    && Number(cargaSelecionada?.cargaHoraria || 0) > 0
    && Number(cargaSelecionada?.aulasLancadas || 0) >= Number(cargaSelecionada?.cargaHoraria || 0);
  const linkWhatsappSte = useMemo(() => {
    if (!ehInstrutor) return "";
    const numero = normalizarNumeroWhatsapp(contatoSte.whatsapp);
    if (!numero) return "";
    const texto = `Olá, STE. Sou ${usuario?.nomeGrade || usuario?.nome || "instrutor"} e preciso de apoio.`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }, [ehInstrutor, contatoSte.whatsapp, usuario]);
  const cargasPorHorario = useMemo(
    () => criarMapaCargaAulasPorHorario({
      horarios: horariosDaTurmaComPendentes,
      materias: materiasDaTurmaCompleta,
      semanas,
    }),
    [horariosDaTurmaComPendentes, materiasDaTurmaCompleta, semanas],
  );
  useEffect(() => {
    if (!temAulasPendentes) return undefined;

    function avisarSaida(event) {
      event.preventDefault();
      event.returnValue = AVISO_AULAS_PENDENTES;
      return AVISO_AULAS_PENDENTES;
    }

    window.addEventListener("beforeunload", avisarSaida);
    return () => window.removeEventListener("beforeunload", avisarSaida);
  }, [temAulasPendentes]);

  useEffect(() => {
    if (!temAulasPendentes) return undefined;

    function interceptarNavegacao(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target?.closest?.("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const destino = `${url.pathname}${url.search}${url.hash}`;
      const atual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (destino === atual) return;

      event.preventDefault();
      if (!window.confirm(AVISO_AULAS_PENDENTES)) return;
      setAulasPendentes([]);
      navigate(destino);
    }

    document.addEventListener("click", interceptarNavegacao, true);
    return () => document.removeEventListener("click", interceptarNavegacao, true);
  }, [temAulasPendentes, navigate]);

  useEffect(() => {
    async function carregarBase() {
      const [listaTurmas, listaSemanas] = await Promise.all([getTurmas(), getSemanas()]);
      setTurmas(listaTurmas);
      setSemanas(listaSemanas);
      setTurmaId((atual) => atual || listaTurmas[0]?.id || "");
      const mesesDisponiveis = listarMesesDasSemanas(listaSemanas);
      setMesFiltro((atual) => (
        mesesDisponiveis.some((item) => item.valor === atual)
          ? atual
          : (mesesDisponiveis[mesesDisponiveis.length - 1]?.valor || getMesAtualInput())
      ));
    }

    carregarBase().catch(() => {
      setTurmas([]);
      setSemanas([]);
    });
  }, []);

  useEffect(() => {
    if (semanasFiltradas.length === 0) {
      setSemanaId("");
      return;
    }
    setSemanaId((atual) => (
      semanasFiltradas.some((semana) => semana.id === atual)
        ? atual
        : (semanasFiltradas[0]?.id || "")
    ));
  }, [semanasFiltradas]);

  useEffect(() => {
    async function carregarMaterias() {
      if (!turmaId) {
        setMateriasDaTurma([]);
        setMateriasDaTurmaCompleta([]);
        setMateriaId("");
        return;
      }

      const [listaPreenchimento, listaCompleta] = await Promise.all([
        getMateriasParaPreenchimento(usuario, turmaId),
        getMateriasDaTurma(turmaId),
      ]);
      setMateriasDaTurma(listaPreenchimento);
      setMateriasDaTurmaCompleta(listaCompleta);
      setMateriaId((atual) => listaPreenchimento.some((materia) => materia.id === atual) ? atual : listaPreenchimento[0]?.id || "");
    }

    carregarMaterias().catch(() => {
      setMateriasDaTurma([]);
      setMateriasDaTurmaCompleta([]);
    });
  }, [turmaId, usuario]);

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
    async function carregarCargaHoraria() {
      setHorariosDaTurma(await getHorariosPorTurma(turmaId));
    }

    if (turmaId) {
      carregarCargaHoraria().catch(() => setHorariosDaTurma([]));
    } else {
      setHorariosDaTurma([]);
    }
  }, [turmaId, versao]);

  useEffect(() => {
    async function carregarHorariosDaSemana() {
      setHorariosDaSemana(await getHorariosPorSemana(semanaId));
    }

    if (semanaId) {
      carregarHorariosDaSemana().catch(() => setHorariosDaSemana([]));
    } else {
      setHorariosDaSemana([]);
    }
  }, [semanaId, versao]);

  useEffect(() => {
    async function carregarConfirmacao() {
      const status = await getConfirmacaoHorariosInstrutor({ turmaId, semanaId });
      setConfirmacao(status);
    }

    if (!ehInstrutor) {
      setConfirmacao({ confirmado: false, confirmadoEm: null });
      return;
    }

    if (turmaId && semanaId) {
      carregarConfirmacao().catch(() => setConfirmacao({ confirmado: false, confirmadoEm: null }));
    } else {
      setConfirmacao({ confirmado: false, confirmadoEm: null });
    }
  }, [turmaId, semanaId, versao, ehInstrutor]);

  useEffect(() => {
    if (!ehInstrutor) return;
    getContatoSte()
      .then((contato) => setContatoSte(contato))
      .catch(() => setContatoSte({ nome: "STE", whatsapp: "", email: "" }));
  }, [ehInstrutor]);

  function confirmarDescartePendencias() {
    return !temAulasPendentes || window.confirm(AVISO_AULAS_PENDENTES);
  }

  function descartarPendencias() {
    if (temAulasPendentes) setAulasPendentes([]);
  }

  function alterarMes(valor) {
    if (valor === mesFiltro) return;
    if (!confirmarDescartePendencias()) return;
    descartarPendencias();
    setMesFiltro(valor);
  }

  function alterarSemana(valor) {
    if (valor === semanaId) return;
    if (!confirmarDescartePendencias()) return;
    descartarPendencias();
    setSemanaId(valor);
  }

  function alterarTurma(valor) {
    if (valor === turmaId) return;
    if (!confirmarDescartePendencias()) return;
    descartarPendencias();
    setTurmaId(valor);
  }

  async function preencher(dia, slot) {
    if (!turmaId || !semanaId || !materiaId) {
      setMensagem("Selecione semana, turma e uma matéria vinculada à turma antes de preencher.");
      return;
    }

    const materia = materiasDaTurma.find((item) => item.id === materiaId);
    if (!materia) {
      setMensagem("Esta matéria não está disponível para a turma selecionada.");
      return;
    }

    const cargaMateria = cargasMaterias[materiaId] || { aulasLancadas: 0, cargaHoraria: Number(materia.cargaHoraria || 0) };
    if (ehInstrutor && Number(cargaMateria.cargaHoraria || 0) > 0 && Number(cargaMateria.aulasLancadas || 0) >= Number(cargaMateria.cargaHoraria || 0)) {
      setMensagem("Carga horária dessa matéria atingida. Somente o gestor pode lançar novas aulas dessa matéria.");
      return;
    }

    const existente = horariosVisiveis.find((horario) => horario.dia === dia && horario.inicio === slot.inicio);
    if (existente) {
      setMensagem("Esta célula já está preenchida. O instrutor não pode sobrescrever horários já ocupados.");
      return;
    }

    if (ehInstrutor) {
      const conflitos = horariosDaSemanaComPendentes.filter((horario) =>
        horario.tipo === "aula"
        && horario.instrutorId === usuario.id
        && horario.dia === dia
        && horario.inicio === slot.inicio
        && horario.turmaId !== turmaId
      );

      if (conflitos.length > 0) {
        const turmaAtualNome = turmaSelecionada?.nome || turmaId;
        const materiaAtualNome = materia.nome || "Matéria sem nome";
        const horarioAtual = `${dia}, ${slot.inicio} - ${slot.fim}`;
        const linhasConflitos = conflitos.map((horario) => {
          const turmaConflito = turmas.find((turma) => turma.id === horario.turmaId);
          const turmaNome = turmaConflito?.nome || horario.turmaId || "Turma sem nome";
          const materiaNome = horario.materiaNome || "Matéria sem nome";
          const fim = horario.fim || slot.fim;
          return `- Turma: ${turmaNome} | Matéria: ${materiaNome} | Horário: ${horario.dia}, ${horario.inicio} - ${fim}`;
        });
        const desejaMesmoAssim = confirm(
          [
            "Você já possui aula(s) no mesmo dia e horário para outra(s) turma(s).",
            "",
            `Nova aula: Turma: ${turmaAtualNome} | Matéria: ${materiaAtualNome} | Horário: ${horarioAtual}`,
            "",
            "Aulas já lançadas:",
            ...linhasConflitos,
            "",
            "Deseja manter as aulas simultâneas mesmo assim?",
          ].join("\n")
        );

        if (!desejaMesmoAssim) {
          setMensagem("Lançamento cancelado. Ajuste o horário para evitar conflito entre turmas.");
          return;
        }
      }

      const aulaPendente = {
        id: criarIdPendente(),
        turmaId,
        semanaId,
        dia,
        inicio: slot.inicio,
        fim: slot.fim,
        materiaId,
        materiaNome: materia.nome,
        instrutorId: usuario.id,
        instrutorNome: usuario.nomeGrade || usuario.nome,
        tipo: "aula",
        texto: "",
        localInstrucao: String(localInstrucao || "").trim() || "CAEBM",
        prova,
        auxiliares: "",
        auxiliaresSolicitados: 0,
        auxiliaresAutorizados: 0,
        aulaCorrente: null,
        pendente: true,
      };
      setAulasPendentes((atuais) => [...atuais, aulaPendente]);
      setMensagem("Aula adicionada, mas ainda não confirmada. Clique em Confirmar horários desta turma/semana para gravar na grade.");
      return;
    }

    const resultado = await salvarHorario({
      turmaId,
      semanaId,
      dia,
      inicio: slot.inicio,
      fim: slot.fim,
      materiaId,
      materiaNome: materia.nome,
      instrutorId: usuario.id,
      instrutorNome: usuario.nomeGrade || usuario.nome,
      tipo: "aula",
      localInstrucao,
      prova,
    });
    setMensagem(resultado.ok ? "Horário preenchido." : resultado.mensagem);
    setVersao((v) => v + 1);
  }

  async function removerAula(item) {
    if (horarioTravadoPorConfirmacao(item)) {
      setMensagem("Esta aula já foi confirmada e está bloqueada para edição.");
      return;
    }

    if (!item?.id) return;

    if (item.pendente) {
      const confirmado = confirm(
        `Remover esta aula ainda não confirmada? Turma: ${turmaSelecionada?.nome || turmaId} | Matéria: ${item.materiaNome || "Matéria sem nome"} | Horário: ${item.dia}, ${item.inicio} - ${item.fim}`
      );
      if (!confirmado) return;
      setAulasPendentes((atuais) => atuais.filter((aula) => aula.id !== item.id));
      setMensagem("Aula não confirmada removida.");
      return;
    }

    const confirmado = confirm(
      `Remover esta aula? Turma: ${turmaSelecionada?.nome || turmaId} | Matéria: ${item.materiaNome || "Matéria sem nome"} | Horário: ${item.dia}, ${item.inicio} - ${item.fim}`
    );
    if (!confirmado) return;

    try {
      await removerHorario(item.id);
      setMensagem("Aula removida da grade.");
      setVersao((v) => v + 1);
    } catch (error) {
      setMensagem(error.message || "Não foi possível remover esta aula.");
    }
  }

  async function atualizarLocal(item, novoLocal) {
    if (horarioTravadoPorConfirmacao(item)) {
      setMensagem("Esta aula já foi confirmada e está bloqueada para edição.");
      return;
    }

    if (item.pendente) {
      setAulasPendentes((atuais) => atuais.map((aula) => (
        aula.id === item.id ? { ...aula, localInstrucao: String(novoLocal || "").trim() || "CAEBM" } : aula
      )));
      setMensagem("Local atualizado na aula ainda não confirmada.");
      return;
    }

    const resultado = await atualizarLocalHorario(item.id, novoLocal);
    setMensagem(resultado.ok ? "Local da instrução atualizado." : resultado.mensagem);
    setVersao((v) => v + 1);
  }

  async function atualizarProva(item, marcado) {
    if (horarioTravadoPorConfirmacao(item)) {
      setMensagem("Esta aula já foi confirmada e está bloqueada para edição.");
      return;
    }

    if (item.pendente) {
      setAulasPendentes((atuais) => atuais.map((aula) => (
        aula.id === item.id ? { ...aula, prova: Boolean(marcado) } : aula
      )));
      setMensagem("Marcação de prova atualizada na aula ainda não confirmada.");
      return;
    }

    const resultado = await atualizarProvaHorario(item.id, marcado);
    setMensagem(resultado.ok ? "Marcação de prova atualizada." : resultado.mensagem);
    setVersao((v) => v + 1);
  }

  function atualizarAuxiliaresPendente(item, quantidade) {
    setAulasPendentes((atuais) => atuais.map((aula) => (
      aula.id === item.id ? { ...aula, auxiliaresSolicitados: quantidade } : aula
    )));
    setMensagem("Quantidade de auxiliares registrada. Será enviada ao gestor quando você confirmar os horários.");
  }

  async function solicitarAuxiliares(item, quantidade) {
    if (item.pendente) {
      atualizarAuxiliaresPendente(item, quantidade);
      return;
    }
    if (horarioTravadoPorConfirmacao(item)) {
      setMensagem("Esta aula já foi confirmada e está bloqueada para edição. Somente o gestor pode atualizar os auxiliares.");
      return;
    }
    const resultado = await solicitarAuxiliaresHorario(item.id, quantidade);
    setMensagem(resultado.ok ? "Solicitação de auxiliares enviada ao gestor." : resultado.mensagem);
    setVersao((v) => v + 1);
  }

  function listarConflitosDeHorarioDaSemana() {
    if (!ehInstrutor) return [];

    const aulasDoInstrutor = horariosDaSemanaComPendentes.filter((horario) =>
      horario.tipo === "aula"
      && horario.instrutorId === usuario.id
    );
    const gruposPorDiaHorario = new Map();

    aulasDoInstrutor.forEach((horario) => {
      const chave = `${horario.dia}__${horario.inicio}`;
      const grupo = gruposPorDiaHorario.get(chave) || [];
      grupo.push(horario);
      gruposPorDiaHorario.set(chave, grupo);
    });

    return Array.from(gruposPorDiaHorario.values()).filter((grupo) => {
      const turmasUnicas = new Set(grupo.map((item) => item.turmaId).filter(Boolean));
      return turmasUnicas.size > 1;
    });
  }

  function horarioTravadoPorConfirmacao(item) {
    if (!ehInstrutor || !item || item.tipo !== "aula" || item.instrutorId !== usuario.id) return false;
    if (item.pendente) return false;
    if (!confirmacao.confirmado || !confirmacao.confirmadoEm) return false;

    const confirmadoEm = Date.parse(confirmacao.confirmadoEm);
    const criadoEm = Date.parse(item.criadoEm || "");
    if (!Number.isFinite(confirmadoEm) || !Number.isFinite(criadoEm)) {
      return true;
    }

    return criadoEm <= confirmadoEm;
  }

  async function confirmarGrade() {
    if (!turmaId || !semanaId) {
      setMensagem("Selecione turma e semana antes de confirmar.");
      return;
    }
    const jaConfirmada = Boolean(confirmacao.confirmado);

    const conflitos = listarConflitosDeHorarioDaSemana();
    if (conflitos.length > 0) {
      const linhasConflitos = conflitos.flatMap((grupo) => {
        const fim = grupo[0]?.fim || "";
        const titulo = `- ${grupo[0]?.dia || "-"}, ${grupo[0]?.inicio || "-"}${fim ? ` - ${fim}` : ""}`;
        const detalhes = grupo.map((horario) => {
          const turma = turmas.find((item) => item.id === horario.turmaId);
          const turmaNome = turma?.nome || horario.turmaId || "Turma sem nome";
          const materiaNome = horario.materiaNome || "Matéria sem nome";
          return `  Turma: ${turmaNome} | Matéria: ${materiaNome}`;
        });
        return [titulo, ...detalhes];
      });

      const confirmarComConflitos = confirm(
        [
          "Atenção: há aulas suas no mesmo horário para turmas diferentes nesta semana.",
          "",
          "Conflitos encontrados:",
          ...linhasConflitos,
          "",
          "Deseja confirmar a grade mesmo assim?",
        ].join("\n")
      );
      if (!confirmarComConflitos) {
        setMensagem("Confirmação cancelada. Ajuste os conflitos de horário antes de confirmar.");
        return;
      }
    }

    const totalPendentes = aulasPendentes.length;
    const perguntaConfirmacao = totalPendentes > 0
      ? `Confirmar seus horários desta turma/semana e gravar ${totalPendentes} aula(s) ainda não confirmada(s) na grade?`
      : (jaConfirmada
        ? "Você já confirmou esta turma/semana antes. Deseja reconfirmar a grade com os horários atuais?"
        : "Confirmar seus horários desta turma/semana? Após a confirmação, as aulas já gravadas ficam bloqueadas para edição direta.");
    if (!confirm(perguntaConfirmacao)) {
      return;
    }

    setConfirmando(true);
    const resultado = await confirmarHorariosInstrutor({
      turmaId,
      semanaId,
      aulas: aulasPendentes.map((aula) => ({
        turmaId: aula.turmaId,
        semanaId: aula.semanaId,
        dia: aula.dia,
        inicio: aula.inicio,
        fim: aula.fim,
        materiaId: aula.materiaId,
        materiaNome: aula.materiaNome,
        localInstrucao: aula.localInstrucao,
        prova: Boolean(aula.prova),
      })),
    });
    setConfirmando(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Não foi possível confirmar os horários.");
      return;
    }

    setConfirmacao({
      confirmado: Boolean(resultado.confirmado),
      confirmadoEm: resultado.confirmadoEm || new Date().toISOString(),
    });
    const mensagemBase = (
      jaConfirmada
        ? "Grade reconfirmada com sucesso."
        : "Horários confirmados. As aulas já gravadas ficaram bloqueadas para edição direta."
    );
    const emailEnviado = Boolean(resultado.emailInstrutor?.enviado);
    const motivoEmail = String(resultado.emailInstrutor?.motivo || "");
    const avisoEmail = emailEnviado
      ? " E-mail de confirmação enviado para você."
      : (motivoEmail === "smtp_nao_configurado"
        ? " Confirmação registrada, mas o e-mail não foi enviado porque o SMTP não está configurado."
        : (motivoEmail === "destinatario_invalido"
          ? " Confirmação registrada, mas seu e-mail cadastrado parece inválido."
          : " Confirmação registrada, mas não foi possível enviar o e-mail automaticamente."));

    setMensagem(`${mensagemBase}${avisoEmail}`);
    setAulasPendentes([]);
    setVersao((v) => v + 1);
  }

  return (
    <PageShell title="Preenchimento de horários" subtitle="Selecione a semana, a turma e a matéria para preencher a grade semanal.">
      <Card className="mb-6">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <InfoItem label="Semana" value={semanaSelecionada?.nome || "Nenhuma semana selecionada"} detail={semanaSelecionada ? formatarPeriodoBR(semanaSelecionada.inicio, semanaSelecionada.fim) : ""} detailEmphasis />
          <InfoItem label="Turma" value={turmaSelecionada?.nome || "Nenhuma turma selecionada"} />
          <InfoItem
            label="Carga horaria"
            value={cargaSelecionada ? `${cargaSelecionada.aulasLancadas}(${cargaSelecionada.cargaHoraria})` : "Selecione a matéria"}
            detail={cargaSelecionada ? "Aulas lançadas (CH total)" : `${materiasDaTurma.length} matéria(s) disponível(is)`}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <select
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={mesFiltro}
            onChange={(e) => alterarMes(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {opcoesMes.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={semanaId} onChange={(e) => alterarSemana(e.target.value)}>
            <option value="">Selecione a semana</option>
            {semanasFiltradas.map((semana) => <option key={semana.id} value={semana.id}>{semana.nome}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={turmaId} onChange={(e) => alterarTurma(e.target.value)}>
            <option value="">Selecione a turma</option>
            {turmas.map((turma) => <option key={turma.id} value={turma.id}>{turma.nome}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={materiaId} onChange={(e) => setMateriaId(e.target.value)} disabled={materiasDaTurma.length === 0}>
            <option value="">Selecione a matéria</option>
            {materiasDaTurma.map((materia) => {
              const carga = cargasMaterias[materia.id] || { aulasLancadas: 0, cargaHoraria: Number(materia.cargaHoraria || 0) };
              const cargaAtingida = ehInstrutor
                && Number(carga.cargaHoraria || 0) > 0
                && Number(carga.aulasLancadas || 0) >= Number(carga.cargaHoraria || 0);
              return (
                <option key={materia.id} value={materia.id} disabled={cargaAtingida}>
                  {materia.nome} - {carga.aulasLancadas}({carga.cargaHoraria}){cargaAtingida ? " - limite atingido" : ""}
                </option>
              );
            })}
          </select>
          <input
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Local da instrução (auto: CAEBM)"
            value={localInstrucao}
            onChange={(e) => setLocalInstrucao(e.target.value)}
          />
        </div>
        {semanas.length > 0 && semanasFiltradas.length === 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Não há semanas cadastradas para o mês selecionado.
          </div>
        )}
        <div className="mt-2 text-xs text-slate-500">Se deixar o local em branco, o sistema preenche automaticamente como CAEBM.</div>
        {cargaSelecionadaAtingida && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Carga horária da matéria selecionada atingida. Somente o gestor pode lançar novas aulas nessa matéria.
          </div>
        )}

        <label className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={prova} onChange={(e) => setProva(e.target.checked)} />
          Marcar aula como prova
        </label>

        <div className="mt-4 text-sm text-slate-600">Aulas preenchidas por você nesta semana/turma: <b className="text-blue-700">{contador}</b></div>
        <ResumoCargaHoraria materias={materiasDaTurma} cargasMaterias={cargasMaterias} materiaId={materiaId} />
        <AvisosPreparacao usuario={usuario} semanas={semanas} turmas={turmas} turmaId={turmaId} materiasDaTurma={materiasDaTurma} />
        {ehInstrutor && (
          <div className={`mt-3 rounded-xl border p-3 text-sm ${bloqueadoPorConfirmacao && !temAulasPendentes ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            <div className="font-semibold">
              {temAulasPendentes
                ? "Aulas aguardando confirmação"
                : (bloqueadoPorConfirmacao ? "Horários confirmados" : "Confirmação de horários")}
            </div>
            <div className="mt-1">
              {temAulasPendentes
                ? `${aulasPendentes.length} aula(s) ainda não confirmada(s). Elas só serão gravadas na grade quando você clicar em confirmar; se sair da página, as atualizações serão perdidas.`
                : (bloqueadoPorConfirmacao
                  ? `Confirmado em ${new Date(confirmacao.confirmadoEm).toLocaleString("pt-BR")}. As aulas já gravadas ficam bloqueadas para edição. Horários vazios continuam disponíveis para preenchimento.`
                  : "Quando terminar, confirme seus horários desta turma/semana. A confirmação bloqueia apenas as aulas já gravadas para edição direta.")}
            </div>
            <button
              type="button"
              className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={confirmarGrade}
              disabled={confirmando || !turmaId || !semanaId}
            >
              {confirmando
                ? "Confirmando..."
                : (temAulasPendentes
                  ? "Confirmar e gravar aulas desta turma/semana"
                  : (bloqueadoPorConfirmacao ? "Reconfirmar horários desta turma/semana" : "Confirmar horários desta turma/semana"))}
            </button>
          </div>
        )}
        {mensagem && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{mensagem}</div>}
      </Card>

      {ehInstrutor && (
        <Card className="mb-6">
          <div className="text-sm font-bold text-slate-950">Fale conosco!</div>
          <div className="mt-1 text-sm text-slate-600">
            Em caso de necessidade, utilize o canal oficial de contato direto com a STE.
          </div>
          <div className="mt-3">
            {linkWhatsappSte ? (
              <a
                href={linkWhatsappSte}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                WhatsApp da STE
              </a>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Contato de WhatsApp da STE ainda não cadastrado.
              </div>
            )}
          </div>
        </Card>
      )}

      {prontoParaPreencher ? (
        <Grade
          horarios={horariosVisiveis}
          usuario={usuario}
          semana={semanaSelecionada}
          onPreencher={preencher}
          onAtualizarLocal={atualizarLocal}
          onAtualizarProva={atualizarProva}
          onRemover={removerAula}
          onSolicitarAuxiliares={solicitarAuxiliares}
          mapaCargas={cargasPorHorario}
          isHorarioBloqueado={horarioTravadoPorConfirmacao}
        />
      ) : (
        <Card>
          <p className="text-sm text-slate-600">
            A grade semanal aparecerá aqui depois que houver semana, turma e matéria disponível para preenchimento.
          </p>
        </Card>
      )}
    </PageShell>
  );
}

function InfoItem({ label, value, detail = "", detailEmphasis = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
      {detail && (
        <div className={`mt-1 font-semibold text-slate-700 ${detailEmphasis ? "text-base" : "text-xs"}`}>
          {detail}
        </div>
      )}
    </div>
  );
}

function ResumoCargaHoraria({ materias, cargasMaterias, materiaId }) {
  if (materias.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {materias.map((materia) => {
        const carga = cargasMaterias[materia.id] || { aulasLancadas: 0, cargaHoraria: Number(materia.cargaHoraria || 0), saldo: 0 };
        const selecionada = materia.id === materiaId;
        const excedida = carga.cargaHoraria > 0 && carga.aulasLancadas > carga.cargaHoraria;
        const completa = carga.cargaHoraria > 0 && carga.aulasLancadas === carga.cargaHoraria;
        const classe = excedida
          ? "border-red-200 bg-red-50 text-red-700"
          : completa
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : selecionada
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-slate-50 text-slate-700";

        return (
          <span key={materia.id} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${classe}`}>
            <span>{materia.nome}</span>
            <b>{carga.aulasLancadas}({carga.cargaHoraria})</b>
          </span>
        );
      })}
    </div>
  );
}

function AvisosPreparacao({ usuario, semanas, turmas, turmaId, materiasDaTurma }) {
  const avisos = [];

  if (semanas.length === 0) {
    avisos.push(usuario.perfil === "gestor"
      ? "Nenhuma semana cadastrada. Cadastre em Página do Gestor > Criar semanas."
      : "Nenhuma semana foi cadastrada pelo gestor ainda.");
  }

  if (turmas.length === 0) {
    avisos.push(usuario.perfil === "gestor"
      ? "Nenhuma turma cadastrada. Cadastre em Página do Gestor > Matérias por turma."
      : "Nenhuma turma foi cadastrada pelo gestor ainda.");
  }

  if (turmaId && materiasDaTurma.length === 0) {
    avisos.push(usuario.perfil === "gestor"
      ? "A turma selecionada não possui matérias vinculadas."
      : "Nenhuma das suas matérias está vinculada à turma selecionada.");
  }

  if (avisos.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {avisos.map((aviso) => (
        <div key={aviso} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{aviso}</div>
      ))}
    </div>
  );
}

function rotuloDiaSemana(dia) {
  return dia === "Terca" ? "Terça" : dia;
}

function Grade({ horarios, usuario, semana, onPreencher, onAtualizarLocal, onAtualizarProva, onRemover, onSolicitarAuxiliares, mapaCargas, isHorarioBloqueado }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black">
      <table className="min-w-[900px] border-collapse bg-white text-[15px] md:min-w-full">
        <thead>
          <tr className="bg-slate-100 text-slate-700">
            <th className="w-36 border border-black p-3.5 text-left">Horario</th>
            {DIAS_SEMANA.map((dia, indice) => {
              const dataReferencia = formatarDataBR(dataComOffset(semana?.inicio, indice));
              return (
                <th key={dia} className="border border-black p-3.5 text-left">
                  <span>{rotuloDiaSemana(dia)}</span>
                  {dataReferencia && <span className="ml-2 text-xs font-semibold text-slate-500">{dataReferencia}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {SLOTS_AULA.map((slot) => (
            <tr key={slot.inicio} className={slot.intervalo ? "bg-slate-100" : ""}>
              <td className="border border-black p-3.5 font-semibold text-slate-700">{slot.inicio} - {slot.fim}</td>
              {DIAS_SEMANA.map((dia) => {
                const item = horarios.find((horario) => horario.dia === dia && horario.inicio === slot.inicio);
                const itemBloqueado = item ? Boolean(isHorarioBloqueado?.(item)) : false;
                if (slot.intervalo) return <td key={dia} className="border border-black p-3.5 text-center text-slate-500">{slot.rotulo || "Intervalo"}</td>;
                return (
                  <td key={dia} className="h-24 border border-black p-2.5 align-top">
                    {item ? (
                      <div className="rounded-xl border p-2.5 text-sm font-medium shadow-sm" style={getEstiloHorario(item)}>
                        <b>{montarTituloHorarioComCarga(item, mapaCargas)}</b><br />
                        <span>{item.texto ? "" : item.instrutorNome}</span>
                        <ProvaInfo horario={item} />
                        <LocalInstrucaoInfo horario={item} compacto />
                        <AuxiliaresInfo horario={item} compacto />
                        {item.pendente && (
                          <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            Aula ainda não confirmada
                          </div>
                        )}
                        {item.tipo === "aula" && item.instrutorId === usuario.id && !itemBloqueado && (
                          <>
                            <EditarLocalInstrucao
                              horario={item}
                              onSalvar={(novoLocal) => onAtualizarLocal(item, novoLocal)}
                            />
                            <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={Boolean(item.prova)}
                                onChange={(event) => onAtualizarProva(item, event.target.checked)}
                              />
                              Prova
                            </label>
                            <SolicitarAuxiliares
                              horario={item}
                              onSolicitar={(quantidade) => onSolicitarAuxiliares(item, quantidade)}
                            />
                            <button
                              type="button"
                              className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                              onClick={() => onRemover(item)}
                            >
                              Remover aula
                            </button>
                          </>
                        )}
                        {item.tipo === "aula" && item.instrutorId === usuario.id && itemBloqueado && (
                          <div className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            Aula confirmada (bloqueada). Somente o gestor pode atualizar os auxiliares.
                          </div>
                        )}
                      </div>
                    ) : (
                      <button className="h-full w-full rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-700" onClick={() => onPreencher(dia, slot)}>
                        + preencher
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
  );
}

function EditarLocalInstrucao({ horario, onSalvar }) {
  const [local, setLocal] = useState(horario.localInstrucao || "");

  useEffect(() => {
    setLocal(horario.localInstrucao || "");
  }, [horario.id, horario.localInstrucao]);

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <input
        className="h-8 min-w-0 flex-1 rounded-lg border border-white/70 bg-white/80 px-2 text-xs text-slate-900 outline-none focus:border-blue-400"
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        placeholder="Local"
      />
      <button
        type="button"
        className="h-8 rounded-lg bg-white/80 px-2 text-[11px] font-semibold text-blue-700 hover:bg-white"
        onClick={() => onSalvar(local)}
      >
        Salvar
      </button>
    </div>
  );
}

function SolicitarAuxiliares({ horario, onSolicitar }) {
  const [quantidade, setQuantidade] = useState(String(horario.auxiliaresSolicitados || ""));
  const valor = Number.parseInt(quantidade, 10);

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        max="20"
        className="h-8 w-20 rounded-lg border border-white/70 bg-white/80 px-2 text-xs text-slate-900 outline-none focus:border-blue-400"
        value={quantidade}
        onChange={(event) => setQuantidade(event.target.value)}
        placeholder="Qtd. aux."
        aria-label="Quantidade de auxiliares"
      />
      <button
        type="button"
        className="h-8 whitespace-nowrap rounded-lg bg-white/80 px-2 text-[11px] font-semibold text-blue-700 hover:bg-white"
        onClick={() => onSolicitar(Number.isFinite(valor) ? valor : 0)}
      >
        Solicitar auxiliares
      </button>
    </div>
  );
}

