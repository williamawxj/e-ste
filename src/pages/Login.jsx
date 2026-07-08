import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { autenticar } from "../utils/usuariosDB";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const resultado = await autenticar(email, senha);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }
    onLogin(resultado.usuario);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 px-4">
      <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-blue-50 px-4 py-2 text-3xl font-black tracking-wide text-blue-700">E-STE</div>
          <h1 className="text-xl font-bold text-slate-950">Acesso ao sistema</h1>
          <p className="mt-2 text-sm text-slate-600">Login único para gestores e instrutores.</p>
        </div>

        {erro && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">E-mail</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              name="este_usuario_manual"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Senha</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="password"
              name="este_senha_manual"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              autoComplete="new-password"
              required
            />
          </label>

          <div className="text-right text-sm">
            <Link to="/esqueci-senha" className="font-semibold text-blue-700 hover:text-blue-800">
              Esqueci minha senha
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Ainda não é cadastrado?{" "}
          <Link to="/cadastro-instrutor" className="font-semibold text-blue-700 hover:text-blue-800">
            Solicitar cadastro de instrutor
          </Link>
        </div>

        <div className="mt-3 text-center text-sm">
          <a href="/guia.html" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:text-blue-800">
            Guia de Uso do Sistema E-STE
          </a>
        </div>
      </div>
      </div>

      <footer className="pb-6 text-center text-xs text-slate-500">
        <p>© 2026 Todos os direitos reservados</p>
        <p>Cadete Adilson William Xavier Jargenboski</p>
      </footer>
    </div>
  );
}
