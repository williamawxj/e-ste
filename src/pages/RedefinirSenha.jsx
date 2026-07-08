import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import Field from "../components/Field";
import { redefinirSenhaComToken, validarTokenRedefinicaoSenha } from "../utils/usuariosDB";

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState("verificando");
  const [erroToken, setErroToken] = useState("");
  const [form, setForm] = useState({ senha: "", confirmarSenha: "" });
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalido");
      setErroToken("Link de redefinição incompleto. Solicite um novo link.");
      return;
    }

    let ativo = true;
    validarTokenRedefinicaoSenha(token).then((resultado) => {
      if (!ativo) return;
      if (!resultado.ok) {
        setStatus("invalido");
        setErroToken(resultado.mensagem || "Link inválido ou expirado. Solicite um novo link.");
        return;
      }
      setStatus("valido");
    });
    return () => {
      ativo = false;
    };
  }, [token]);

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (form.senha !== form.confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    const resultado = await redefinirSenhaComToken(token, form.senha);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }
    setConcluido(true);
    setMensagem(resultado.mensagem || "Senha redefinida com sucesso.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-blue-50 px-4 py-2 text-3xl font-black tracking-wide text-blue-700">E-STE</div>
          <h1 className="text-xl font-bold text-slate-950">Redefinir senha</h1>
          <p className="mt-2 text-sm text-slate-600">Escolha uma nova senha de acesso.</p>
        </div>

        {status === "verificando" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Verificando link de redefinição...
          </div>
        )}

        {status === "invalido" && (
          <>
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erroToken}</div>
            <div className="mt-6 text-center text-sm text-slate-600">
              <Link to="/esqueci-senha" className="font-semibold text-blue-700 hover:text-blue-800">
                Solicitar novo link
              </Link>
            </div>
          </>
        )}

        {status === "valido" && !concluido && (
          <>
            {erro && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <Field label="Nova senha">
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  type="password"
                  value={form.senha}
                  onChange={(e) => atualizar("senha", e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label="Confirmar nova senha">
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  type="password"
                  value={form.confirmarSenha}
                  onChange={(e) => atualizar("confirmarSenha", e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>

              <Button type="submit" className="w-full" disabled={carregando}>
                {carregando ? "Salvando..." : "Redefinir senha"}
              </Button>
            </form>
          </>
        )}

        {concluido && (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</div>
            <div className="mt-6 text-center text-sm text-slate-600">
              <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">
                Ir para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
