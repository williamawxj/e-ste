import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, UserRound, UsersRound } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import MateriasDropdown from "../components/MateriasDropdown";
import PageShell from "../components/PageShell";
import { getMaterias } from "../utils/academicoDB";
import { atualizarMateriasUsuario, atualizarUsuario, getGestores, getInstrutores, removerUsuario } from "../utils/usuariosDB";

function normalizarBusca(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .trim()
    .toLowerCase();
}

export default function EditarInstrutores({ usuario }) {
  const [instrutores, setInstrutores] = useState([]);
  const [gestores, setGestores] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [statusMaterias, setStatusMaterias] = useState({});
  const [instrutorAbertoId, setInstrutorAbertoId] = useState("");
  const [gestorAbertoId, setGestorAbertoId] = useState("");
  const [busca, setBusca] = useState("");

  const buscaNormalizada = normalizarBusca(busca);
  const instrutoresFiltrados = useMemo(() => {
    if (!buscaNormalizada) return instrutores;
    return instrutores.filter((instrutor) => (
      normalizarBusca(instrutor.nome).includes(buscaNormalizada)
      || normalizarBusca(instrutor.nomeGrade).includes(buscaNormalizada)
      || normalizarBusca(instrutor.email).includes(buscaNormalizada)
    ));
  }, [instrutores, buscaNormalizada]);
  const gestoresFiltrados = useMemo(() => {
    if (!buscaNormalizada) return gestores;
    return gestores.filter((gestor) => (
      normalizarBusca(gestor.nome).includes(buscaNormalizada)
      || normalizarBusca(gestor.nomeGrade).includes(buscaNormalizada)
      || normalizarBusca(gestor.email).includes(buscaNormalizada)
    ));
  }, [gestores, buscaNormalizada]);

  async function recarregar() {
    const [listaInstrutores, listaGestores, listaMaterias] = await Promise.all([
      getInstrutores(),
      getGestores(),
      getMaterias(),
    ]);
    setInstrutores(listaInstrutores);
    setGestores(listaGestores);
    setMaterias(listaMaterias);
    setInstrutorAbertoId((atual) => (
      listaInstrutores.some((instrutor) => instrutor.id === atual) ? atual : ""
    ));
    setGestorAbertoId((atual) => (
      listaGestores.some((gestor) => gestor.id === atual) ? atual : ""
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

  async function atualizarCampoGestor(id, campo, valor) {
    setGestores((atuais) => atuais.map((gestor) =>
      gestor.id === id ? { ...gestor, [campo]: valor } : gestor
    ));
    await atualizarUsuario(id, { [campo]: valor });
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

  function textoMateriasChefe(instrutor) {
    const nomes = (instrutor.materiasChefe || []).map((item) => item.materiaNome).filter(Boolean);
    if (nomes.length === 0) return "";
    return nomes.join(", ");
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
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              className="w-full text-slate-900 outline-none"
              placeholder="Buscar por nome ou e-mail (instrutor ou gestor)"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>
          {buscaNormalizada && (
            <p className="mt-2 text-xs text-slate-600">
              {instrutoresFiltrados.length} instrutor(es) e {gestoresFiltrados.length} gestor(es) encontrados.
            </p>
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

        {instrutoresFiltrados.length === 0 && (
          <Card>
            <p className="text-slate-600">
              {buscaNormalizada ? "Nenhum instrutor encontrado para essa busca." : "Nenhum instrutor aprovado cadastrado."}
            </p>
          </Card>
        )}

        {instrutoresFiltrados.map((instrutor) => (
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
          <p className="mt-1 text-sm text-slate-600">
            Clique no nome do gestor para editar os dados de perfil, incluindo o e-mail cadastrado.
          </p>

          {gestoresFiltrados.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              {buscaNormalizada ? "Nenhum gestor encontrado para essa busca." : "Nenhum gestor cadastrado."}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {gestoresFiltrados.map((gestor) => (
                <div key={gestor.id} className="rounded-xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
                    onClick={() => setGestorAbertoId((atual) => atual === gestor.id ? "" : gestor.id)}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-950">{gestor.nome}</div>
                      <div className="text-xs text-slate-600">
                        {gestor.email} {gestor.chefeSte ? "| Chefe STE" : "| Gestor"}
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-slate-600 transition ${gestorAbertoId === gestor.id ? "rotate-180 text-blue-700" : ""}`}
                    />
                  </button>

                  {gestorAbertoId === gestor.id && (
                    <div className="border-t border-slate-200 px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          value={gestor.nome}
                          placeholder="Nome"
                          onChange={(e) => atualizarCampoGestor(gestor.id, "nome", e.target.value)}
                        />
                        <input
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          value={gestor.nomeGrade || ""}
                          placeholder="Nome de aparição na grade"
                          onChange={(e) => atualizarCampoGestor(gestor.id, "nomeGrade", e.target.value)}
                        />
                        <input
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          value={gestor.email}
                          placeholder="E-mail/login"
                          onChange={(e) => atualizarCampoGestor(gestor.id, "email", e.target.value)}
                        />
                        <input
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          value={gestor.whatsapp || ""}
                          placeholder="WhatsApp"
                          onChange={(e) => atualizarCampoGestor(gestor.id, "whatsapp", e.target.value)}
                        />
                      </div>

                      <label className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(gestor.chefeSte)}
                          onChange={(e) => atualizarCampoGestor(gestor.id, "chefeSte", e.target.checked)}
                        />
                        Chefe da STE
                      </label>

                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => excluirGestor(gestor)}
                          disabled={gestor.id === "master" || gestor.id === usuario?.id}
                        >
                          Excluir gestor
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

