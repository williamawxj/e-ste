import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { autentica } from "../utils/usuariosDB";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const user = autentica(email, senha);
    if (user) {
      onLogin(user);
    } else {
      setErro("Usuário/senha inválidos ou cadastro ainda não aprovado.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow max-w-xs w-full">
        <h2 className="text-2xl mb-6 font-bold text-blue-400 text-center">Login E-STE</h2>
        {erro && <div className="text-red-500 mb-3">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <input
            className="w-full mb-3 p-2 rounded bg-slate-700 text-white"
            type="text"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="w-full mb-6 p-2 rounded bg-slate-700 text-white"
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
          />
          <Button type="submit" className="w-full">Entrar</Button>
        </form>
        <div className="text-sm text-center mt-4">
          <Link
            className="text-blue-400 hover:underline"
            to="/cadastro-instrutor"
          >
            Sou instrutor, quero me cadastrar
          </Link>
        </div>
      </div>
    </div>
  );
}
