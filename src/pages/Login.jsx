import { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = () => {
    const usuario = {
      nome: "Primeiro Gestor",
      email,
      perfil: "gestor",
    };
    onLogin(usuario);
  };

  return (
    <div className="text-white">
      <h1 className="text-2xl mb-4">Login</h1>
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
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleLogin}
      >
        Entrar
      </button>
    </div>
  );
}