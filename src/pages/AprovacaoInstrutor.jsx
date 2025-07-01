import { useState, useEffect } from "react";
import { getInstrutoresPendentes, updateUsuario } from "../utils/usuariosDB";
import Button from "../components/Button";

export default function AprovacaoInstrutor({ usuario }) {
  const [pendentes, setPendentes] = useState([]);

  useEffect(() => {
    setPendentes(getInstrutoresPendentes());
  }, []);

  function aprovar(email) {
    updateUsuario(email, { aprovado: true });
    setPendentes(getInstrutoresPendentes());
  }

  if (usuario.perfil !== "gestor") {
    return <div className="text-center mt-10 text-red-400">Acesso restrito!</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-blue-400 text-center">Aprovação de Instrutores</h2>
      {pendentes.length === 0 && (
        <div className="text-green-400 text-center">Nenhum instrutor pendente!</div>
      )}
      {pendentes.map(instrutor => (
        <div key={instrutor.email} className="flex items-center justify-between bg-slate-800 rounded px-4 py-3 mb-4">
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
