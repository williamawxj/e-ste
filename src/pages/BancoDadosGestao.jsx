import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, Download, RefreshCw, Trash2, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import { baixarBackupGrades, esvaziarGradesPreenchidas, getStatusBancoDados } from "../utils/academicoDB";

export default function BancoDadosGestao() {
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [backupAndamento, setBackupAndamento] = useState(false);
  const [limpezaAndamento, setLimpezaAndamento] = useState(false);
  const [backupFeitoAgora, setBackupFeitoAgora] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function carregarStatus() {
    try {
      const dados = await getStatusBancoDados();
      setStatus(dados);
    } catch (error) {
      setMensagem(error.message || "Não foi possível carregar o uso do banco.");
      setStatus(null);
    }
  }

  useEffect(() => {
    carregarStatus()
      .finally(() => setCarregando(false));
  }, []);

  const percentualUso = useMemo(() => {
    const valor = Number(status?.percentualUso || 0);
    if (!Number.isFinite(valor)) return 0;
    return Math.max(0, Math.min(100, valor));
  }, [status]);

  async function atualizarStatus() {
    setAtualizando(true);
    await carregarStatus();
    setAtualizando(false);
  }

  async function fazerBackup() {
    setBackupAndamento(true);
    const resultado = await baixarBackupGrades();
    setBackupAndamento(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Não foi possível fazer o backup.");
      return;
    }

    setBackupFeitoAgora(true);
    setMensagem(`Backup gerado com sucesso (${resultado.arquivo}).`);
  }

  async function limparGrades() {
    if (!backupFeitoAgora) {
      setMensagem("Realize o backup antes de esvaziar as grades preenchidas.");
      return;
    }

    const confirmou = confirm(
      "Esta ação vai remover TODAS as grades preenchidas (horários, confirmações e solicitações de modificação). Instrutores e gestores serão mantidos. Deseja continuar?"
    );
    if (!confirmou) return;

    setLimpezaAndamento(true);
    const resultado = await esvaziarGradesPreenchidas();
    setLimpezaAndamento(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Não foi possível esvaziar as grades.");
      return;
    }

    setBackupFeitoAgora(false);
    setStatus(resultado.status || null);
    const removidos = resultado.removidos || {};
    setMensagem(
      `Grades esvaziadas com sucesso. Removidos: horários ${removidos.horarios || 0}, confirmações ${removidos.confirmacoes || 0}, solicitações ${removidos.solicitacoes || 0}.`
    );
  }

  return (
    <PageShell
      title="Banco de dados e backup"
      subtitle="Acompanhe o espaço ocupado no banco, gere backup das grades preenchidas e limpe as grades quando necessário."
      actions={(
        <Button type="button" variant="secondary" onClick={atualizarStatus} disabled={atualizando || carregando}>
          <RefreshCw size={16} className="mr-2" />
          {atualizando ? "Atualizando..." : "Atualizar uso"}
        </Button>
      )}
    >
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Database size={16} />
                Uso do banco de dados
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">
                {carregando ? "Carregando..." : (status?.usadoFormatado || "-")}
              </div>
              <div className="text-sm text-slate-600">
                Limite configurado: {status?.limiteFormatado || "1.50 GB"}
              </div>
            </div>

            <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${status?.alertaLimite ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {status?.alertaLimite ? "Alerta de limite" : "Uso dentro do limite"}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Ocupação</span>
              <span>{Number(status?.percentualUso || 0).toFixed(2)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${status?.alertaLimite ? "bg-red-500" : "bg-blue-600"}`}
                style={{ width: `${percentualUso}%` }}
              />
            </div>
          </div>

          <div className={`mt-4 rounded-xl border p-3 text-sm ${status?.alertaLimite ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
            {status?.alertaLimite ? (
              <span className="inline-flex items-center gap-2 font-semibold">
                <AlertTriangle size={16} />
                O banco atingiu 1,5 GB ou mais. Faça backup e esvazie as grades preenchidas.
              </span>
            ) : (
              "Quando o banco chegar a 1,5 GB, este aviso fica em destaque para o gestor."
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-slate-950">Resumo da base</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ResumoItem label="Horários registrados" value={status?.totais?.horarios} />
            <ResumoItem label="Aulas registradas" value={status?.totais?.aulas} />
            <ResumoItem label="Confirmações de horário" value={status?.totais?.confirmacoes} />
            <ResumoItem label="Solicitações de modificação" value={status?.totais?.solicitacoes} />
            <ResumoItem label="Instrutores ativos" value={status?.totais?.instrutores} />
            <ResumoItem label="Gestores ativos" value={status?.totais?.gestores} />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-slate-950">Backup e limpeza das grades</h2>
          <p className="mt-1 text-sm text-slate-600">
            Primeiro, gere o backup de todas as grades preenchidas. Depois disso, o botão de esvaziar grades fica disponível.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="success" onClick={fazerBackup} disabled={backupAndamento || limpezaAndamento}>
              <Download size={16} className="mr-2" />
              {backupAndamento ? "Gerando backup..." : "Fazer backup das grades"}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={limparGrades}
              disabled={!backupFeitoAgora || limpezaAndamento || backupAndamento}
            >
              <Trash2 size={16} className="mr-2" />
              {limpezaAndamento ? "Esvaziando..." : "Esvaziar grades preenchidas"}
            </Button>
          </div>
          {!backupFeitoAgora && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              O esvaziamento só é liberado após gerar o backup nesta sessão.
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-slate-950">Exclusão de usuários</h2>
          <p className="mt-1 text-sm text-slate-600">
            A limpeza das grades não exclui instrutores e gestores. Para excluir usuários, use o botão separado abaixo.
          </p>
          <Link
            to="/editar-instrutores"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
          >
            <UsersRound size={16} />
            Ir para alterar instrutores/gestores
          </Link>
        </Card>

        {mensagem && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {mensagem}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function ResumoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-950">{Number(value || 0)}</div>
    </div>
  );
}

