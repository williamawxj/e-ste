import { useEffect, useState } from "react";

export default function GestorTurmasMaterias() {
  const [turmas, setTurmas] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [turmaNova, setTurmaNova] = useState("");
  const [materiaNova, setMateriaNova] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [materiaSelecionada, setMateriaSelecionada] = useState("");
  const [associacoes, setAssociacoes] = useState([]);

  useEffect(() => {
    const turmasSalvas = JSON.parse(localStorage.getItem("turmas")) || [];
    const materiasSalvas = JSON.parse(localStorage.getItem("materias")) || [];
    const associacoesSalvas = JSON.parse(localStorage.getItem("turmaMaterias")) || [];
    setTurmas(turmasSalvas);
    setMaterias(materiasSalvas);
    setAssociacoes(associacoesSalvas);
  }, []);

  function salvarTurmas(t) {
    setTurmas(t);
    localStorage.setItem("turmas", JSON.stringify(t));
  }

  function salvarMaterias(m) {
    setMaterias(m);
    localStorage.setItem("materias", JSON.stringify(m));
  }

  function salvarAssociacoes(a) {
    setAssociacoes(a);
    localStorage.setItem("turmaMaterias", JSON.stringify(a));
  }

  function adicionarTurma() {
    if (turmaNova && !turmas.includes(turmaNova)) {
      const novas = [...turmas, turmaNova];
      salvarTurmas(novas);
      setTurmaNova("");
    }
  }

  function adicionarMateria() {
    if (materiaNova && !materias.includes(materiaNova)) {
      const novas = [...materias, materiaNova];
      salvarMaterias(novas);
      setMateriaNova("");
    }
  }

  function associarMateriaTurma() {
    if (!turmaSelecionada || !materiaSelecionada) return;
    const novaLista = [...associacoes];
    const idx = novaLista.findIndex((a) => a.turma === turmaSelecionada);
    if (idx >= 0) {
      if (!novaLista[idx].materias.includes(materiaSelecionada)) {
        novaLista[idx].materias.push(materiaSelecionada);
      }
    } else {
      novaLista.push({ turma: turmaSelecionada, materias: [materiaSelecionada] });
    }
    salvarAssociacoes(novaLista);
  }

  return (
    <div className="text-white max-w-3xl mx-auto">
      <h1 className="text-2xl mb-4 font-bold">Gerenciar Turmas e Matérias</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold">Cadastrar nova turma</h2>
        <input
          className="text-black px-2 py-1 mr-2"
          value={turmaNova}
          onChange={(e) => setTurmaNova(e.target.value)}
          placeholder="Ex: Turma A"
        />
        <button className="bg-blue-600 px-4 py-1 rounded" onClick={adicionarTurma}>
          Adicionar Turma
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold">Cadastrar nova matéria</h2>
        <input
          className="text-black px-2 py-1 mr-2"
          value={materiaNova}
          onChange={(e) => setMateriaNova(e.target.value)}
          placeholder="Ex: Matemática"
        />
        <button className="bg-blue-600 px-4 py-1 rounded" onClick={adicionarMateria}>
          Adicionar Matéria
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold">Associar matéria à turma</h2>
        <select
          className="text-black px-2 py-1 mr-2"
          value={turmaSelecionada}
          onChange={(e) => setTurmaSelecionada(e.target.value)}
        >
          <option value="">Selecione a turma</option>
          {turmas.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          className="text-black px-2 py-1 mr-2"
          value={materiaSelecionada}
          onChange={(e) => setMateriaSelecionada(e.target.value)}
        >
          <option value="">Selecione a matéria</option>
          {materias.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <button className="bg-green-600 px-4 py-1 rounded" onClick={associarMateriaTurma}>
          Associar
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Associações existentes</h2>
        {associacoes.map((a) => (
          <div key={a.turma} className="mb-1">
            <span className="font-bold">{a.turma}:</span> {a.materias.join(", ")}
          </div>
        ))}
      </div>
    </div>
  );
}
