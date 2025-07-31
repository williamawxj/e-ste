// src/pages/AprovacaoInstrutor.jsx
import { useState, useEffect } from "react";
import { getInstrutoresPendentes, updateUsuario, getUsuarios } from "../utils/usuariosDB";
import Button from "../components/Button";
import { Navigate } from "react-router-dom";

export default function AprovacaoInstrutor({ usuario }) {
  const [pendentes, setPendentes] = useState([]);

  useEffect(() => {
    setPendentes(getInstrutoresPendentes());
  }, []);

  function aprovar(email) {
    updateUsuario(email, { aprovado: true });

    // Atualiza a lista no estado
    const novosPendentes = getInstrutoresPendentes();
    setPendentes(novosPendentes);

    // Atualiza o localStorage com a nova lista de instrutores aprovados
    const todos = getUsuarios();
    const aprovados = todos.filter(u => u.perfil === "instrutor" && u.aprovado);
    localStorage.setItem("instrutores-aprovados", JSON.stringify(aprovados));
  }

  if (!usuario || usuario.perfil !== "gestor") {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-blue-400 text-center">Aprovação de Instrutores</h2>
      {pendentes.length === 0 && (
        <div className="text-green-400 text-center">Nenhum instrutor pendente!</div>
      )}
      {pendentes.map(instrutor => (
        <div
          key={instrutor.email}
          className="flex items-center justify-between bg-slate-800 rounded px-4 py-3 mb-4"
        >
          <div>
            <b>{instrutor.nome}</b> — {instrutor.email}
          </div>
          <Button variant="primary" onClick={() => aprovar(instrutor.email)}>
            Aprovar
          </Button>
        </div>
      ))}
    </div>
  );
}
