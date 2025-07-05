import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { updateUsuario } from "../utils/usuariosDB";

export default function InstrutorPerfil({ usuario, onUpdate }) {
  const [nomeCompleto, setNomeCompleto] = useState(usuario.nomeCompleto || "");
  const [nomeGrade, setNomeGrade] = useState(usuario.nome || "");
  const [email, setEmail] = useState(usuario.email || "");
  const [senha, setSenha] = useState(usuario.senha || "");
  const [materias, setMaterias] = useState(usuario.materias || []);

  const [materiasDisponiveis, setMateriasDisponiveis] = useState([]);
  const [materiaSelecionada, setMateriaSelecionada] = useState("");

  useEffect(() => {
    const lista = JSON.parse(localStorage.getItem("materias")) || [];
    setMateriasDisponiveis(lista);
  }, []);

  if (usuario.perfil !== "instrutor") {
    return <Navigate to="/" />;
  }

  function salvarAlteracoes() {
    const atualizado = {
      ...usuario,
      nome: nomeGrade,
      nomeCompleto,
      email,
      senha,
      materias,
    };

    updateUsuario(usuario.email, atualizado);
    localStorage.setItem("usuario", JSON.stringify(atualizado));
    onUpdate(atualizado);
    alert("Perfil atualizado com sucesso!");
  }

  function adicionarMateria() {
    if (materiaSelecionada && !materias.includes(materiaSelecionada)) {
      setMaterias([...materias, materiaSelecionada]);
      setMateriaSelecionada("");
    }
  }

  return (
    <div className="text-white max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Meu Perfil</h1>

      <label className="block mb-2">
        Nome completo:
        <input
          className="block w-full text-black px-2 py-1"
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
        />
      </label>

      <label className="block mb-2">
        Nome na grade (Exemplo: TEN FULANO):
        <input
          className="block w-full text-black px-2 py-1"
          value={nomeGrade}
          onChange={(e) => setNomeGrade(e.target.value)}
        />
      </label>

      <label className="block mb-2">
        Email:
        <input
          className="block w-full text-black px-2 py-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="block mb-2">
        Senha:
        <input
          className="block w-full text-black px-2 py-1"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </label>

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Minhas Matérias</h2>
        <ul className="list-disc list-inside text-sm mb-2">
          {materias.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>

        {materiasDisponiveis.length > 0 ? (
          <>
            <select
              className="text-black px-2 py-1 mr-2"
              value={materiaSelecionada}
              onChange={(e) => setMateriaSelecionada(e.target.value)}
            >
              <option value="">Selecione uma matéria</option>
              {materiasDisponiveis
                .filter((m) => !materias.includes(m))
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </select>
            <button
              className="bg-green-600 px-3 py-1 rounded"
              onClick={adicionarMateria}
            >
              Adicionar
            </button>
          </>
        ) : (
          <p className="text-sm text-yellow-300">
            Nenhuma matéria cadastrada pelo gestor ainda.
          </p>
        )}
      </div>

      <button
        className="bg-blue-600 px-4 py-2 rounded"
        onClick={salvarAlteracoes}
      >
        Salvar Alterações
      </button>
    </div>
  );
}
