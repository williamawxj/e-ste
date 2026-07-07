import { useEffect, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import { atualizarAuxiliaresHorario, getAuxiliaresPendentes } from "../utils/academicoDB";

export default function AuxiliaresPendentes() {
  const [pendentes, setPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [quantidades, setQuantidades] = useState({});
  const [statusPorId, setStatusPorId] = useState({});

  async function carregar() {
    setCarregando(true);
    try {
      const lista = await getAuxiliaresPendentes();
      setPendentes(lista);
      setQuantidades(Object.fromEntries(lista.map((item) => [item.id, String(item.auxiliaresAutorizados || "")])));
    } catch {
      setPendentes([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function autorizar(item) {
    const quantidade = Number.parseInt(quantidades[item.id], 10);
    setStatusPorId((atual) => ({ ...atual, [item.id]: "Salvando..." }));

    const resultado = await atualizarAuxiliaresHorario(item.id, {
      auxiliares: item.auxiliares,
      auxiliaresAutorizados: Number.isFinite(quantidade) ? quantidade : 0,
      localInstrucao: item.localInstrucao,
      prova: item.prova,
      aulaCorrente: item.aulaCorrente,
    });

    if (!resultado.ok) {
      setStatusPorId((atual) => ({ ...atual, [item.id]: resultado.mensagem || "Não foi possível autorizar." }));
      return;
    }

    setPendentes((atual) => atual.filter((pendente) => pendente.id !== item.id));
  }

  return (
    <PageShell
      title="Auxiliares pendentes"
      subtitle="Aulas com pedido de auxiliares feito pelo instrutor, aguardando autorização do gestor."
    >
      {carregando ? (
        <Card>
          <p className="text-sm text-slate-600">Carregando...</p>
        </Card>
      ) : pendentes.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">Nenhum pedido de auxiliares pendente de autorização.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendentes.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-950">
                    {item.turmaNome} | {item.semanaNome}
                  </div>
                  <div className="text-sm text-slate-700">
                    {item.dia}, {item.inicio} - {item.fim} | {item.materiaNome || "Aula"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Instrutor: {item.instrutorNome || "-"}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-amber-700">
                    Solicitados: {item.auxiliaresSolicitados}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    className="h-10 w-24 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={quantidades[item.id] ?? ""}
                    onChange={(event) => setQuantidades((atual) => ({ ...atual, [item.id]: event.target.value }))}
                    aria-label="Quantidade de auxiliares autorizados"
                  />
                  <Button type="button" onClick={() => autorizar(item)}>
                    Autorizar
                  </Button>
                </div>
              </div>
              {statusPorId[item.id] && (
                <div className="mt-2 text-xs font-semibold text-blue-700">{statusPorId[item.id]}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
