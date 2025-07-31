import { useState } from "react";
import { autentica } from "../utils/usuariosDB";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = () => {
    const usuario = autentica(email, senha);

    if (!usuario) {
      setErro("E-mail ou senha inválidos, ou o cadastro ainda não foi aprovado.");
      return;
    }

    onLogin(usuario);
  };

  return (
    <div className="text-white max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Login</h1>

      {erro && <p className="text-red-400 mb-2">{erro}</p>}

      <input
        className="block border mb-2 p-2 w-full text-black"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="block border mb-2 p-2 w-full text-black"
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        onClick={handleLogin}
      >
        Entrar
      </button>

      <p className="mt-4 text-sm text-center">
        Ainda não tem cadastro?{" "}
        <a
          href="/cadastro-instrutor"
          className="text-blue-400 underline hover:text-blue-600"
        >
          Clique aqui para se cadastrar como instrutor
        </a>
      </p>
    </div>
  );
}
