import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import { getSemanas, removerSemana, salvarSemana } from "../utils/academicoDB";
import {
  filtrarSemanasPorMes,
  formatarPeriodoBR,
  getMesAtualInput,
  listarMesesDasSemanas,
} from "../utils/dateUtils";

export default function Semanas() {
  const [semanas, setSemanas] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(getMesAtualInput());
  const [form, setForm] = useState({ nome: "", inicio: "", fim: "" });
  const opcoesMes = useMemo(() => listarMesesDasSemanas(semanas), [semanas]);
  const semanasFiltradas = useMemo(
    () => filtrarSemanasPorMes(semanas, mesFiltro),
    [semanas, mesFiltro],
  );

  async function carregar() {
    const lista = await getSemanas();
    setSemanas(lista);
    const mesesDisponiveis = listarMesesDasSemanas(lista);
    setMesFiltro((atual) => (
      mesesDisponiveis.some((item) => item.valor === atual)
        ? atual
        : (mesesDisponiveis[mesesDisponiveis.length - 1]?.valor || getMesAtualInput())
    ));
  }

  useEffect(() => {
    carregar();
  }, []);

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await salvarSemana(form);
    setForm({ nome: "", inicio: "", fim: "" });
    await carregar();
  }

  async function excluirSemana(semana) {
    if (!semana?.id) return;
    if (!confirm(`Deseja excluir a semana ${semana.nome}? Horários já lançados nessa semana também serão removidos.`)) return;
    await removerSemana(semana.id);
    await carregar();
  }

  return (
    <PageShell title="Criação de semanas" subtitle="Cadastre as semanas que serão usadas para preenchimento e visualização da grade.">
      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
          <input className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nome da semana. Ex.: Semana 01" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required />
          <input className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="date" value={form.inicio} onChange={(e) => atualizar("inicio", e.target.value)} required />
          <input className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="date" value={form.fim} onChange={(e) => atualizar("fim", e.target.value)} required />
          <Button type="submit">Criar</Button>
        </form>
      </Card>

      <Card className="mt-4 max-w-3xl">
        <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
          <select
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={mesFiltro}
            onChange={(event) => setMesFiltro(event.target.value)}
          >
            <option value="">Todos os meses</option>
            {opcoesMes.map((item) => (
              <option key={item.valor} value={item.valor}>{item.rotulo}</option>
            ))}
          </select>
          <div className="text-sm text-slate-600">
            Mostrando <b>{semanasFiltradas.length}</b> semana(s) no filtro atual.
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {semanasFiltradas.map((s) => (
          <Card key={s.id}>
            <h2 className="font-bold text-slate-950">{s.nome}</h2>
            <p className="mt-1 text-sm text-slate-600">{formatarPeriodoBR(s.inicio, s.fim)}</p>
            <Button className="mt-4" variant="danger" onClick={() => excluirSemana(s)}>Remover</Button>
          </Card>
        ))}
      </div>
      {semanas.length > 0 && semanasFiltradas.length === 0 && (
        <Card className="mt-4 max-w-3xl">
          <p className="text-sm text-slate-600">Não há semanas cadastradas para o mês selecionado.</p>
        </Card>
      )}
    </PageShell>
  );
}

