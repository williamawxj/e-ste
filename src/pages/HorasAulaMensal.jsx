import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import { getHorasAulaMensal } from "../utils/academicoDB";
import { formatarMesAnoBR, getMesAtualInput } from "../utils/dateUtils";

function pluralizarHoraAula(valor) {
  return `${valor} ${valor === 1 ? "hora/aula" : "horas/aula"}`;
}

export default function HorasAulaMensal({ usuario }) {
  const [mes, setMes] = useState(getMesAtualInput());
  const [dados, setDados] = useState({ total: 0, itens: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const tituloTotal = usuario.perfil === "gestor" ? "Total geral do mes" : "Seu total no mes";
  const maiorValor = useMemo(
    () => Math.max(1, ...dados.itens.map((item) => item.horasAula || 0)),
    [dados.itens]
  );

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const response = await getHorasAulaMensal(mes);
        setDados({ total: response.total || 0, itens: response.itens || [] });
      } catch (error) {
        setErro(error.message || "Não foi possível carregar as horas/aula.");
        setDados({ total: 0, itens: [] });
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [mes]);

  return (
    <PageShell
      title="Horas/aula por mes"
      subtitle={usuario.perfil === "gestor"
        ? "Acompanhe as horas/aula mensais de todos os instrutores."
        : "Acompanhe suas horas/aula mensais."}
    >
      <Card className="mb-6">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr_220px] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Mes</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="month"
              value={mes}
              onChange={(event) => setMes(event.target.value)}
            />
          </label>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="text-xs font-semibold uppercase text-blue-700">{tituloTotal}</div>
            <div className="mt-1 text-3xl font-bold text-blue-950">{pluralizarHoraAula(dados.total)}</div>
            <div className="mt-1 text-sm text-blue-800">Periodo: {formatarMesAnoBR(mes)}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase text-slate-500">Referencia</div>
            <div className="mt-1 text-lg font-bold text-slate-950">45 min = 1 hora/aula</div>
          </div>
        </div>
      </Card>

      {erro && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <Card>
        {carregando ? (
          <p className="text-sm text-slate-600">Carregando horas/aula...</p>
        ) : dados.itens.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma hora/aula encontrada para este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[620px] text-sm md:min-w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4">Instrutor</th>
                  <th className="py-3 pr-4">Nome na grade</th>
                  <th className="w-44 py-3 pr-4 text-right">Horas/aula</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((item) => {
                  const percentual = Math.round(((item.horasAula || 0) / maiorValor) * 100);

                  return (
                    <tr key={item.instrutorId} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 pr-4 font-semibold text-slate-950">{item.nome}</td>
                      <td className="py-4 pr-4 text-slate-600">{item.nomeGrade || item.nome}</td>
                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${percentual}%` }} />
                          </div>
                          <span className="min-w-16 font-bold text-slate-950">{item.horasAula}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}

