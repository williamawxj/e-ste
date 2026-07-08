import { useEffect, useMemo, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import { definirChefeMateria, getChefesMateria, getMaterias } from "../utils/academicoDB";
import { getInstrutores } from "../utils/usuariosDB";

function normalizarBusca(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .trim()
    .toLowerCase();
}

export default function ChefiaPastas() {
  const [materias, setMaterias] = useState([]);
  const [instrutores, setInstrutores] = useState([]);
  const [chefesMateria, setChefesMateria] = useState([]);
  const [statusChefia, setStatusChefia] = useState("");
  const [busca, setBusca] = useState("");

  const buscaNormalizada = normalizarBusca(busca);
  const materiasFiltradas = useMemo(() => {
    if (!buscaNormalizada) return materias;
    return materias.filter((materia) => normalizarBusca(materia.nome).includes(buscaNormalizada));
  }, [materias, buscaNormalizada]);

  async function recarregar() {
    const [listaMaterias, listaInstrutores, listaChefesMateria] = await Promise.all([
      getMaterias(),
      getInstrutores(),
      getChefesMateria(),
    ]);
    setMaterias(listaMaterias);
    setInstrutores(listaInstrutores);
    setChefesMateria(listaChefesMateria);
  }

  useEffect(() => {
    recarregar();
  }, []);

  function obterChefeMateria(materiaId) {
    return chefesMateria.find((item) => item.materiaId === materiaId) || null;
  }

  function obterInstrutoresDaMateria(materiaId) {
    return instrutores.filter((instrutor) => (instrutor.materias || []).includes(materiaId));
  }

  async function atualizarChefiaMateria(materiaId, instrutorId) {
    setStatusChefia("Atualizando chefia de pasta...");
    const resultado = await definirChefeMateria(materiaId, instrutorId);
    if (!resultado.ok) {
      setStatusChefia(resultado.mensagem || "Não foi possível atualizar a chefia da pasta.");
      return;
    }
    setStatusChefia(resultado.mensagem || "Chefia de pasta atualizada.");
    await recarregar();
  }

  return (
    <PageShell
      title="Chefia de pasta por matéria"
      subtitle="Cada matéria pode ter somente um chefe da pasta. Escolha abaixo o instrutor responsável por cada matéria."
    >
      <div className="space-y-4">
        <Card>
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              className="w-full text-slate-900 outline-none"
              placeholder="Buscar por nome da matéria"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>
          {buscaNormalizada && (
            <p className="mt-2 text-xs text-slate-600">
              {materiasFiltradas.length} matéria(s) encontrada(s).
            </p>
          )}
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <UsersRound size={16} />
            Matérias
          </h2>

          <div className="mt-4 space-y-3">
            {materiasFiltradas.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                {buscaNormalizada
                  ? "Nenhuma matéria encontrada para essa busca."
                  : "Nenhuma matéria cadastrada para definir chefia de pasta."}
              </div>
            )}

            {materiasFiltradas.map((materia) => {
              const candidatos = obterInstrutoresDaMateria(materia.id);
              const chefeAtual = obterChefeMateria(materia.id);

              return (
                <div key={materia.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_360px] md:items-center">
                  <div>
                    <div className="font-semibold text-slate-950">{materia.nome}</div>
                    <div className="text-xs text-slate-600">{candidatos.length} instrutor(es) vinculado(s)</div>
                  </div>
                  <select
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={chefeAtual?.instrutorId || ""}
                    onChange={(event) => atualizarChefiaMateria(materia.id, event.target.value)}
                    disabled={candidatos.length === 0}
                  >
                    <option value="">
                      {candidatos.length === 0 ? "Sem instrutor vinculado à matéria" : "Sem chefe da pasta definido"}
                    </option>
                    {candidatos.map((instrutor) => (
                      <option key={instrutor.id} value={instrutor.id}>
                        {instrutor.nomeGrade || instrutor.nome}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {statusChefia && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {statusChefia}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
