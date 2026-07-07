import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import {
  getSemanas,
  getSolicitacoesModificacaoHorario,
  getTurmas,
  solicitarModificacaoHorario,
} from "../utils/academicoDB";
import {
  filtrarSemanasPorMes,
  formatarDataBR,
  formatarPeriodoBR,
  getMesAtualInput,
  listarMesesDasSemanas,
} from "../utils/dateUtils";

function corStatus(status) {
  if (status === "atendida") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "negada") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function textoStatus(status) {
  if (status === "atendida") return "Atendida";
  if (status === "negada") return "Negada";
  return "Pendente";
}

export default function SolicitarModificacaoSTE({ usuario }) {
  const [turmas, setTurmas] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [mesFormulario, setMesFormulario] = useState(getMesAtualInput());
  const [mesSolicitacoes, setMesSolicitacoes] = useState(getMesAtualInput());
  const [turmaId, setTurmaId] = useState("");
  const [semanaId, setSemanaId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const opcoesMes = useMemo(() => listarMesesDasSemanas(semanas), [semanas]);
  const semanasFiltradasFormulario = useMemo(
    () => filtrarSemanasPorMes(semanas, mesFormulario),
    [semanas, mesFormulario],
  );
  const turmaSelecionada = turmas.find((turma) => turma.id === turmaId);
  const semanaSelecionada = semanas.find((semana) => semana.id === semanaId);
  const podeSolicitar = usuario?.perfil === "instrutor";

  useEffect(() => {
    async function carregarBase() {
      const [listaTurmas, listaSemanas] = await Promise.all([
        getTurmas(),
        getSemanas(),
      ]);
      setTurmas(listaTurmas);
      setSemanas(listaSemanas);
      setTurmaId((atual) => atual || listaTurmas[0]?.id || "");
      const mesesDisponiveis = listarMesesDasSemanas(listaSemanas);
      const mesPadrao = mesesDisponiveis.some((item) => item.valor === getMesAtualInput())
        ? getMesAtualInput()
        : (mesesDisponiveis[mesesDisponiveis.length - 1]?.valor || getMesAtualInput());
      setMesFormulario(mesPadrao);
      setMesSolicitacoes(mesPadrao);
    }

    carregarBase().catch(() => {
      setTurmas([]);
      setSemanas([]);
      setSolicitacoes([]);
    });
  }, []);

  useEffect(() => {
    if (semanasFiltradasFormulario.length === 0) {
      setSemanaId("");
      return;
    }
    setSemanaId((atual) => (
      semanasFiltradasFormulario.some((semana) => semana.id === atual)
        ? atual
        : (semanasFiltradasFormulario[0]?.id || "")
    ));
  }, [semanasFiltradasFormulario]);

  async function recarregarSolicitacoes(mes = mesSolicitacoes) {
    try {
      setSolicitacoes(await getSolicitacoesModificacaoHorario({ mes }));
    } catch {
      setSolicitacoes([]);
    }
  }

  useEffect(() => {
    recarregarSolicitacoes(mesSolicitacoes);
  }, [mesSolicitacoes]);

  async function enviarSolicitacao(event) {
    event.preventDefault();
    if (!podeSolicitar) return;

    setMensagem("");
    setCarregando(true);
    const resultado = await solicitarModificacaoHorario({
      turmaId,
      semanaId,
      motivo,
    });
    setCarregando(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Não foi possível enviar a solicitação.");
      return;
    }

    setMensagem("Solicitação enviada para a STE com sucesso.");
    setMotivo("");
    await recarregarSolicitacoes(mesSolicitacoes);
  }

  return (
    <PageShell
      title="Solicitar modificação para STE"
      subtitle="Solicite alterações de horário para a STE. Depois da confirmação dos horários, ajustes só podem ser feitos pela equipe gestora."
    >
      {podeSolicitar && (
        <Card className="mb-6">
          <form onSubmit={enviarSolicitacao} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={mesFormulario}
                onChange={(event) => setMesFormulario(event.target.value)}
              >
                <option value="">Todos os meses</option>
                {opcoesMes.map((item) => (
                  <option key={item.valor} value={item.valor}>{item.rotulo}</option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={turmaId}
                onChange={(event) => setTurmaId(event.target.value)}
                required
              >
                <option value="">Selecione a turma</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>{turma.nome}</option>
                ))}
              </select>

              <select
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={semanaId}
                onChange={(event) => setSemanaId(event.target.value)}
                required
              >
                <option value="">Selecione a semana</option>
                {semanasFiltradasFormulario.map((semana) => (
                  <option key={semana.id} value={semana.id}>{semana.nome}</option>
                ))}
              </select>
            </div>
            {semanas.length > 0 && semanasFiltradasFormulario.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Não há semanas cadastradas para o mês selecionado.
              </div>
            )}

            {turmaSelecionada && semanaSelecionada && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                {turmaSelecionada.nome} | {semanaSelecionada.nome} ({formatarPeriodoBR(semanaSelecionada.inicio, semanaSelecionada.fim)})
              </div>
            )}

            <textarea
              className="h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Descreva o que precisa ser alterado e o motivo."
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              required
            />

            <Button type="submit" disabled={carregando || !turmaId || !semanaId || !motivo.trim()}>
              {carregando ? "Enviando..." : "Enviar solicitação"}
            </Button>
          </form>

          {mensagem && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              {mensagem}
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-bold text-slate-950">
            {podeSolicitar ? "Minhas solicitações" : "Solicitações de modificação"}
          </h2>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-56"
            value={mesSolicitacoes}
            onChange={(event) => setMesSolicitacoes(event.target.value)}
          >
            <option value="">Todos os meses</option>
            {opcoesMes.map((item) => (
              <option key={item.valor} value={item.valor}>{item.rotulo}</option>
            ))}
          </select>
        </div>
        {solicitacoes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Nenhuma solicitação registrada.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {solicitacoes.map((solicitacao) => (
              <div key={solicitacao.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${corStatus(solicitacao.status)}`}>
                    {textoStatus(solicitacao.status)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {formatarDataBR(solicitacao.criadoEm)}
                  </span>
                  {usuario?.perfil === "gestor" && (
                    <span className="text-xs font-semibold text-slate-700">
                      Instrutor: {solicitacao.instrutorNome || solicitacao.instrutorId}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {solicitacao.turmaNome} | {solicitacao.semanaNome}
                </div>
                <div className="mt-2 whitespace-pre-line text-sm text-slate-700">{solicitacao.motivo}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}

