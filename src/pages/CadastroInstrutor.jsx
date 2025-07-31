// src/pages/CadastroInstrutor.jsx
import { useState } from "react";
import Button from "../components/Button";
import { saveUsuario } from "../utils/usuariosDB";

function normalizarEmail(email) {
  return (email || "").trim().toLowerCase();
}

export default function CadastroInstrutor({ onVoltar }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviado, setEnviado] = useState(false);

  function handleCadastro(e) {
    e.preventDefault();

    const emailNormalizado = normalizarEmail(email);

    const novoInstrutor = {
      nome: nome.trim(),
      email: emailNormalizado,
      senha,
      perfil: "instrutor",
      aprovado: false,
      materias: [], // Preparado para armazenar matérias no perfil
    };

    saveUsuario(novoInstrutor);

    // Atualiza a lista de instrutores aprovados no localStorage
    const todosUsuarios = JSON.parse(localStorage.getItem("usuarios-e-ste")) || [];
    const instrutoresAprovados = todosUsuarios.filter(
      (u) => u.perfil === "instrutor" && u.aprovado
    );
    localStorage.setItem("instrutores-aprovados", JSON.stringify(instrutoresAprovados));

    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="text-green-400 text-center">
        Cadastro enviado! Aguarde aprovação do gestor.<br />
        <button className="mt-4 text-blue-400 underline" onClick={onVoltar}>Voltar ao login</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCadastro} className="w-full max-w-lg mx-auto bg-slate-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">Cadastro de Instrutor</h2>

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

      <Button type="submit" className="w-full font-bold">Enviar cadastro</Button>

      <button type="button" className="w-full mt-2 text-blue-400 underline" onClick={onVoltar}>
        Voltar ao login
      </button>
    </form>
  );
}
