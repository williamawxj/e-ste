// CadastroGestor.jsx (com proteção de acesso)
import { useState } from "react";
import Button from "../components/Button";
import { saveUsuario } from "../utils/usuariosDB";

export default function CadastroGestor({ usuario }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviado, setEnviado] = useState(false);

  if (!usuario || usuario.perfil !== "gestor") {
    return <div className="text-center mt-10 text-red-400">Acesso restrito!</div>;
  }

  function handleCadastro(e) {
    e.preventDefault();
    saveUsuario({ nome, email, senha, perfil: "gestor", aprovado: true });
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="text-green-400 text-center">
        Gestor cadastrado com sucesso!<br />
      </div>
    );
  }

  return (
    <form onSubmit={handleCadastro} className="w-full max-w-lg mx-auto bg-slate-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">Cadastro de Gestor</h2>
      <input
        className="w-full mb-3 p-2 rounded bg-slate-700 text-white"
        type="text"
        placeholder="Nome completo"
        value={nome}
        onChange={e => setNome(e.target.value)}
        required
      />
      <input
        className="w-full mb-3 p-2 rounded bg-slate-700 text-white"
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        className="w-full mb-6 p-2 rounded bg-slate-700 text-white"
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        required
      />
      <Button type="submit" className="w-full font-bold">Cadastrar Gestor</Button>
    </form>
  );
}
