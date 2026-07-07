import { useEffect, useState } from "react";
import { ChevronDown, UserRound, UsersRound } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import MateriasDropdown from "../components/MateriasDropdown";
import PageShell from "../components/PageShell";
import { definirChefeMateria, getChefesMateria, getMaterias } from "../utils/academicoDB";
import { atualizarMateriasUsuario, atualizarUsuario, getGestores, getInstrutores, removerUsuario } from "../utils/usuariosDB";

export default function EditarInstrutores({ usuario }) {
  const [instrutores, setInstrutores] = useState([]);
  const [gestores, setGestores] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [chefesMateria, setChefesMateria] = useState([]);
  const [statusMaterias, setStatusMaterias] = useState({});
  const [instrutorAbertoId, setInstrutorAbertoId] = useState("");
  const [statusChefia, setStatusChefia] = useState("");

  async function recarregar() {
    const [listaInstrutores, listaGestores, listaMaterias, listaChefesMateria] = await Promise.all([
      getInstrutores(),
      getGestores(),
      getMaterias(),
      getChefesMateria(),
    ]);
    setInstrutores(listaInstrutores);
    setGestores(listaGestores);
    setMaterias(listaMaterias);
    setChefesMateria(listaChefesMateria);
    setInstrutorAbertoId((atual) => (
      listaInstrutores.some((instrutor) => instrutor.id === atual) ? atual : ""
    ));
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function atualizarCampo(id, campo, valor) {
    setInstrutores((atuais) => atuais.map((instrutor) =>
      instrutor.id === id ? { ...instrutor, [campo]: valor } : instrutor
    ));
    await atualizarUsuario(id, { [campo]: valor });
  }

  function atualizarMateriasLocais(instrutorId, materiasAtualizadas) {
    setInstrutores((lista) => lista.map((instrutor) =>
      instrutor.id === instrutorId ? { ...instrutor, materias: materiasAtualizadas } : instrutor
    ));
    setStatusMaterias((status) => ({ ...status, [instrutorId]: "" }));
  }

  function alternarMateria(instrutor, materiaId) {
    const atuais = instrutor.materias || [];
    const materiasAtualizadas = atuais.includes(materiaId)
      ? atuais.filter((id) => id !== materiaId)
      : [...atuais, materiaId];

    atualizarMateriasLocais(instrutor.id, materiasAtualizadas);
  }

  function selecionarTodas(instrutorId) {
    atualizarMateriasLocais(instrutorId, materias.map((materia) => materia.id));
  }

  function limparMaterias(instrutorId) {
    atualizarMateriasLocais(instrutorId, []);
  }

  async function salvarMaterias(instrutor) {
    setStatusMaterias((status) => ({ ...status, [instrutor.id]: "Salvando..." }));

    try {
      const atualizado = await atualizarMateriasUsuario(instrutor.id, instrutor.materias || []);
      setInstrutores((lista) => lista.map((item) =>
        item.id === instrutor.id ? atualizado : item
      ));
      setStatusMaterias((status) => ({ ...status, [instrutor.id]: "Matérias atualizadas." }));
    } catch (error) {
      setStatusMaterias((status) => ({
        ...status,
        [instrutor.id]: error.message || "Não foi possível salvar as matérias.",
      }));
    }
  }

  async function excluir(id) {
    if (confirm("Deseja remover este instrutor?")) {
      await removerUsuario(id);
      await recarregar();
    }
  }

  async function excluirGestor(gestor) {
    if (!gestor?.id) return;
    if (gestor.id === "master") {
      alert("O gestor master não pode ser removido.");
      return;
    }
    if (gestor.id === usuario?.id) {
      alert("Você não pode remover seu próprio usuário enquanto estiver logado.");
      return;
    }
    if (!confirm(`Deseja remover o gestor ${gestor.nome}?`)) return;
    await removerUsuario(gestor.id);
    await recarregar();
  }

  function obterChefeMateria(materiaId) {
    return chefesMateria.find((item) => item.materiaId === materiaId) || null;
  }

  function obterInstrutoresDaMateria(materiaId) {
    return instrutores.filter((instrutor) => (instrutor.materias || []).includes(materiaId));
  }

  function textoMateriasChefe(instrutor) {
    const nomes = (instrutor.materiasChefe || []).map((item) => item.materiaNome).filter(Boolean);
    if (nomes.length === 0) return "";
    return nomes.join(", ");
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
      title="Instrutores e gestores cadastrados"
      subtitle="Clique no nome do instrutor para abrir as opções. Abaixo, confira todos os gestores cadastrados."
    >
      <div className="space-y-4">
        <Card className="bg-slate-50">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserRound size={16} />
                Instrutores cadastrados
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">{instrutores.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UsersRound size={16} />
                Gestores cadastrados
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">{gestores.length}</div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <UsersRound size={16} />
            Chefia de pasta por matéria
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cada matéria pode ter somente um chefe da pasta. Escolha abaixo o instrutor responsável por cada matéria.
          </p>

          <div className="mt-4 space-y-3">
            {materias.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma matéria cadastrada para definir chefia de pasta.
              </div>
            )}

            {materias.map((materia) => {
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

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <UserRound size={16} />
            Lista de instrutores
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Selecione um instrutor para abrir os campos de edição e as matérias.
          </p>
        </Card>

        {instrutores.length === 0 && (
          <Card>
            <p className="text-slate-600">Nenhum instrutor aprovado cadastrado.</p>
          </Card>
        )}

        {instrutores.map((instrutor) => (
          <Card key={instrutor.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
              onClick={() => setInstrutorAbertoId((atual) => atual === instrutor.id ? "" : instrutor.id)}
            >
              <div>
                <div className="text-sm font-bold text-slate-950">{instrutor.nomeGrade || instrutor.nome}</div>
                <div className="text-xs text-slate-600">
                  {instrutor.email} | {(instrutor.materias || []).length} matéria(s) associada(s)
                  {textoMateriasChefe(instrutor) ? ` | Chefe da pasta em: ${textoMateriasChefe(instrutor)}` : ""}
                </div>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-600 transition ${instrutorAbertoId === instrutor.id ? "rotate-180 text-blue-700" : ""}`}
              />
            </button>

            {instrutorAbertoId === instrutor.id && (
              <div className="mt-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={instrutor.nome}
                    onChange={(e) => atualizarCampo(instrutor.id, "nome", e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={instrutor.nomeGrade || ""}
                    onChange={(e) => atualizarCampo(instrutor.id, "nomeGrade", e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={instrutor.email}
                    onChange={(e) => atualizarCampo(instrutor.id, "email", e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={instrutor.whatsapp || ""}
                    onChange={(e) => atualizarCampo(instrutor.id, "whatsapp", e.target.value)}
                    placeholder="WhatsApp"
                  />
                </div>
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-950">Matérias que pode dar aula</h2>
                      <p className="text-sm text-slate-600">
                        Selecione as matérias que ficarão disponíveis para este instrutor no preenchimento de horários.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => selecionarTodas(instrutor.id)} disabled={materias.length === 0}>
                        Selecionar todas
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => limparMaterias(instrutor.id)} disabled={materias.length === 0}>
                        Limpar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <MateriasDropdown
                      materias={materias}
                      selecionadas={instrutor.materias || []}
                      onAlternar={(materiaId) => alternarMateria(instrutor, materiaId)}
                      emptyText={'Nenhuma matéria cadastrada. Cadastre matérias em "Matérias por turma" antes de associá-las ao instrutor.'}
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600">
                      {(instrutor.materias || []).length} matéria(s) associada(s)
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {statusMaterias[instrutor.id] && (
                        <span className="text-sm font-semibold text-blue-700">{statusMaterias[instrutor.id]}</span>
                      )}
                      <Button type="button" onClick={() => salvarMaterias(instrutor)} disabled={materias.length === 0}>
                        Salvar matérias
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Button variant="danger" onClick={() => excluir(instrutor.id)}>Excluir instrutor</Button>
                </div>
              </div>
            )}
          </Card>
        ))}

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <UsersRound size={16} />
            Gestores cadastrados
          </h2>
          {gestores.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Nenhum gestor cadastrado.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {gestores.map((gestor) => (
                <div
                  key={gestor.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
                >
                  <div>
                    <div className="font-semibold text-slate-950">{gestor.nome}</div>
                    <div className="text-xs text-slate-600">
                      {gestor.email} {gestor.chefeSte ? "| Chefe STE" : "| Gestor"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => excluirGestor(gestor)}
                    disabled={gestor.id === "master" || gestor.id === usuario?.id}
                  >
                    Excluir gestor
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

