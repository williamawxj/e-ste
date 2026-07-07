import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import { getRelatorioCargaHoraria, getSemanas, getTurmas } from "../utils/academicoDB";
import { getMesAtualInput, listarMesesDasSemanas } from "../utils/dateUtils";

export default function CargaHorariaTurmas() {
  const [turmas, setTurmas] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [mes, setMes] = useState(getMesAtualInput());
  const [turmaId, setTurmaId] = useState("");
  const [relatorio, setRelatorio] = useState({ itens: [], totalCargaHoraria: 0, totalAulasLancadas: 0, totalSaldo: 0 });
  const [carregando, setCarregando] = useState(true);
  const opcoesMes = useMemo(() => listarMesesDasSemanas(semanas), [semanas]);

  useEffect(() => {
    async function carregarBase() {
      const [listaTurmas, listaSemanas] = await Promise.all([getTurmas(), getSemanas()]);
      setTurmas(listaTurmas);
      setSemanas(listaSemanas);
      const mesesDisponiveis = listarMesesDasSemanas(listaSemanas);
      setMes((atual) => (
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
    async function carregarRelatorio() {
      setCarregando(true);
      try {
        setRelatorio(await getRelatorioCargaHoraria(turmaId, mes));
      } catch {
        setRelatorio({ itens: [], totalCargaHoraria: 0, totalAulasLancadas: 0, totalSaldo: 0 });
      } finally {
        setCarregando(false);
      }
    }

    carregarRelatorio();
  }, [turmaId, mes]);

  const grupos = useMemo(() => {
    return relatorio.itens.reduce((mapa, item) => {
      if (!mapa[item.turmaId]) {
        mapa[item.turmaId] = {
          turmaId: item.turmaId,
          turmaNome: item.turmaNome,
          itens: [],
          carga: 0,
          lancadas: 0,
          saldo: 0,
        };
      }

      mapa[item.turmaId].itens.push(item);
      mapa[item.turmaId].carga += item.cargaHoraria;
      mapa[item.turmaId].lancadas += item.aulasLancadas;
      mapa[item.turmaId].saldo += item.saldo;
      return mapa;
    }, {});
  }, [relatorio.itens]);

  const turmasRelatorio = Object.values(grupos);

  return (
    <PageShell
      title="Carga horária das turmas"
      subtitle="Confira quanto da carga horária cadastrada já foi lançado na grade. Cada aula marcada vale 1 hora/aula."
    >
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-[220px_1fr_180px_180px_180px]">
          <select
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={mes}
            onChange={(event) => setMes(event.target.value)}
          >
            <option value="">Todos os meses</option>
            {opcoesMes.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={turmaId}
            onChange={(event) => setTurmaId(event.target.value)}
          >
            <option value="">Todas as turmas</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>{turma.nome}</option>
            ))}
          </select>

          <Resumo label="Carga total" valor={relatorio.totalCargaHoraria} />
          <Resumo label="Aulas lançadas" valor={relatorio.totalAulasLancadas} />
          <Resumo label="Saldo" valor={relatorio.totalSaldo} destaque={relatorio.totalSaldo < 0 ? "negativo" : "positivo"} />
        </div>
      </Card>

      {carregando ? (
        <Card>
          <p className="text-sm text-slate-600">Carregando carga horária...</p>
        </Card>
      ) : turmasRelatorio.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Nenhuma matéria vinculada à turma foi encontrada. Cadastre matérias, informe a carga horária e vincule-as às turmas.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {turmasRelatorio.map((grupo) => (
            <Card key={grupo.turmaId}>
              <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{grupo.turmaNome}</h2>
                  <p className="text-sm text-slate-600">
                    {grupo.lancadas} de {grupo.carga} hora(s)/aula lançadas
                  </p>
                </div>
                <span className={`rounded-xl px-3 py-2 text-sm font-bold ${grupo.saldo < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {grupo.saldo < 0 ? `${Math.abs(grupo.saldo)} excedente(s)` : `${grupo.saldo} restante(s)`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[720px] border-collapse text-sm md:min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="py-3 pr-4">Matéria</th>
                      <th className="py-3 pr-4">CH cadastrada</th>
                      <th className="py-3 pr-4">Lançadas</th>
                      <th className="py-3 pr-4">Saldo</th>
                      <th className="py-3 pr-4">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.itens.map((item) => (
                      <tr key={`${item.turmaId}-${item.materiaId}`} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4 font-semibold text-slate-950">{item.materiaNome}</td>
                        <td className="py-3 pr-4 text-slate-700">{item.cargaHoraria}</td>
                        <td className="py-3 pr-4 text-slate-700">{item.aulasLancadas}</td>
                        <td className={`py-3 pr-4 font-semibold ${item.saldo < 0 ? "text-red-700" : "text-emerald-700"}`}>
                          {item.saldo < 0 ? `-${item.excedente}` : item.saldo}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex min-w-48 items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${item.saldo < 0 ? "bg-red-500" : "bg-blue-600"}`}
                                style={{ width: `${item.percentual}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs font-semibold text-slate-600">{item.percentual}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function Resumo({ label, valor, destaque = "" }) {
  const classe = destaque === "negativo"
    ? "text-red-700"
    : destaque === "positivo"
      ? "text-emerald-700"
      : "text-blue-700";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${classe}`}>{valor}</div>
    </div>
  );
}
