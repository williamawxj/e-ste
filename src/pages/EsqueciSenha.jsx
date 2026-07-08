import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Field from "../components/Field";
import { solicitarRedefinicaoSenha } from "../utils/usuariosDB";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setCarregando(true);
    const resultado = await solicitarRedefinicaoSenha(email);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }
    setEnviado(true);
    setMensagem(resultado.mensagem || "Se o e-mail informado estiver cadastrado, enviaremos um link para redefinição de senha.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-blue-50 px-4 py-2 text-3xl font-black tracking-wide text-blue-700">E-STE</div>
          <h1 className="text-xl font-bold text-slate-950">Esqueci minha senha</h1>
          <p className="mt-2 text-sm text-slate-600">Informe o e-mail cadastrado para receber o link de redefinição.</p>
        </div>

        {erro && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
        {mensagem && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</div>}

        {!enviado && (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <Field label="E-mail ou usuário cadastrado">
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="master ou e-mail cadastrado"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                required
              />
            </Field>

            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
