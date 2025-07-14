// src/pages/SelecionarMateriasDesejadas.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

// Função para normalizar e comparar e-mails
function normalizarEmail(email) {
  return (email || "").trim().toLowerCase();
}

export default function SelecionarMateriasDesejadas({ usuario }) {
  const [materiasPerfil, setMateriasPerfil] = useState([]);
  const [materiasSelecionadas, setMateriasSelecionadas] = useState([]);

  useEffect(() => {
    if (!usuario || usuario.perfil !== "instrutor") return;

    const instrutores = JSON.parse(localStorage.getItem("instrutores-aprovados")) || [];

    const emailNormalizado = normalizarEmail(usuario.email);
    const instrutorAtual = instrutores.find(
      (i) => normalizarEmail(i.email) === emailNormalizado
    );

    if (instrutorAtual?.materias) {
      setMateriasPerfil(instrutorAtual.materias);

      const salvas = JSON.parse(
        localStorage.getItem(`materias-desejadas-${emailNormalizado}`)
      ) || [];

      setMateriasSelecionadas(salvas);
    }
  }, [usuario]);

  function alternarMateria(materia) {
    const emailNormalizado = normalizarEmail(usuario.email);

    let atualizadas;
    if (materiasSelecionadas.includes(materia)) {
      atualizadas = materiasSelecionadas.filter((m) => m !== materia);
    } else {
      atualizadas = [...materiasSelecionadas, materia];
    }

    setMateriasSelecionadas(atualizadas);
    localStorage.setItem(
      `materias-desejadas-${emailNormalizado}`,
      JSON.stringify(atualizadas)
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.perfil !== "instrutor") return <Navigate to="/" replace />;

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl font-bold mb-4">Selecionar Matérias Desejadas</h1>
      <p className="mb-4">Selecione as matérias que você deseja lecionar:</p>

      <ul className="space-y-2">
        {materiasPerfil.map((materia) => (
          <li key={materia} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={materiasSelecionadas.includes(materia)}
              onChange={() => alternarMateria(materia)}
              className="w-4 h-4"
            />
            <span>{materia}</span>
          </li>
        ))}
      </ul>

      {materiasPerfil.length === 0 && (
        <p className="mt-4 text-yellow-400">
          Nenhuma matéria cadastrada no seu perfil.
        </p>
      )}
    </div>
  );
}
