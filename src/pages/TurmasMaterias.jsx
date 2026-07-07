import { useEffect, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import {
  atualizarMateriasTurma,
  getMaterias,
  getTurmas,
  removerMateria,
  removerTurma,
  salvarMateria,
  salvarTurma,
} from "../utils/academicoDB";

export default function TurmasMaterias() {
  const [materias, setMaterias] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [nomeMateria, setNomeMateria] = useState("");
  const [cargaHoraria, setCargaHoraria] = useState("");
  const [nomeTurma, setNomeTurma] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function recarregar() {
    const [listaMaterias, listaTurmas] = await Promise.all([getMaterias(), getTurmas()]);
    setMaterias(listaMaterias);
    setTurmas(listaTurmas);
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function criarMateria(event) {
    event.preventDefault();
    if (!nomeMateria.trim()) return;
    await salvarMateria({ nome: nomeMateria, cargaHoraria });
    setNomeMateria("");
    setCargaHoraria("");
    setMensagem("Matéria cadastrada com sucesso.");
    await recarregar();
  }

  async function criarTurma(event) {
    event.preventDefault();
    if (!nomeTurma.trim()) return;
    await salvarTurma({ nome: nomeTurma, materias: [] });
    setNomeTurma("");
    setMensagem("Turma cadastrada com sucesso.");
    await recarregar();
  }

  async function alternarMateriaTurma(turma, materiaId) {
    const atuais = turma.materias || [];
    const materiasAtualizadas = atuais.includes(materiaId)
      ? atuais.filter((id) => id !== materiaId)
      : [...atuais, materiaId];

    await atualizarMateriasTurma(turma.id, materiasAtualizadas);
    setMensagem("Matérias da turma atualizadas.");
    await recarregar();
  }

  async function excluirTurma(turma) {
    if (!turma?.id) return;
    if (!confirm(`Deseja excluir a turma ${turma.nome}?`)) return;
    await removerTurma(turma.id);
    setMensagem("Turma excluída com sucesso.");
    await recarregar();
  }

  function contarMateriasDaTurma(turma) {
    return materias.filter((materia) => (turma.materias || []).includes(materia.id)).length;
  }

  return (
    <PageShell
      title="Turmas e matérias"
      subtitle="Cadastre disciplinas, turmas e selecione exatamente quais matérias pertencem a cada turma."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-950">Criar matéria</h2>
          <form onSubmit={criarMateria} className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
            <input
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Nome da matéria"
              value={nomeMateria}
              onChange={(event) => setNomeMateria(event.target.value)}
            />
            <input
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="number"
              placeholder="CH total"
              value={cargaHoraria}
              onChange={(event) => setCargaHoraria(event.target.value)}
            />
            <Button type="submit">Criar</Button>
          </form>

          <div className="mt-4 space-y-2">
            {materias.length === 0 && <p className="text-sm text-slate-500">Nenhuma matéria cadastrada.</p>}
            {materias.map((materia) => (
              <div key={materia.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <span>
                  {materia.nome} {materia.cargaHoraria ? <span className="text-slate-500">({materia.cargaHoraria}h)</span> : null}
                </span>
                <Button variant="danger" onClick={async () => { await removerMateria(materia.id); await recarregar(); }}>
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-950">Criar turma</h2>
          <form onSubmit={criarTurma} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Nome da turma"
              value={nomeTurma}
              onChange={(event) => setNomeTurma(event.target.value)}
            />
            <Button type="submit">Criar</Button>
          </form>

          <div className="mt-4 space-y-2">
            {turmas.length === 0 && <p className="text-sm text-slate-500">Nenhuma turma cadastrada.</p>}
            {turmas.map((turma) => (
              <div key={turma.id} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-950">{turma.nome}</h3>
                  <p className="text-xs text-slate-500">{contarMateriasDaTurma(turma)} matéria(s) vinculada(s)</p>
                </div>
                <Button variant="danger" onClick={() => excluirTurma(turma)}>Excluir turma</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-950">Matérias por turma</h2>
          <p className="text-sm text-slate-600">
            Marque APH em CFO3, por exemplo, e deixe desmarcada nas turmas que não terão essa matéria.
          </p>
        </div>

        {mensagem && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</div>}

        {(turmas.length === 0 || materias.length === 0) && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Cadastre pelo menos uma turma e uma matéria para fazer os vínculos.
          </div>
        )}

        <div className="space-y-4">
          {turmas.map((turma) => (
            <div key={turma.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-slate-950">{turma.nome}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{contarMateriasDaTurma(turma)} de {materias.length} matéria(s)</span>
                  <Button type="button" variant="danger" onClick={() => excluirTurma(turma)}>
                    Excluir turma
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {materias.map((materia) => (
                  <label key={materia.id} className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={(turma.materias || []).includes(materia.id)}
                      onChange={() => alternarMateriaTurma(turma, materia.id)}
                    />
                    {materia.nome}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}

