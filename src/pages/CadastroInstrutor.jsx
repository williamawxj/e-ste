import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { cadastrarInstrutor } from "../utils/usuariosDB";

export default function CadastroInstrutor() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: "", nomeGrade: "", email: "", whatsapp: "", senha: "" });
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setCarregando(true);
    const resultado = await cadastrarInstrutor(form);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }
    setMensagem("Cadastro enviado com sucesso. Aguarde a aprovação de um gestor para conseguir acessar o sistema.");
    setForm({ nome: "", nomeGrade: "", email: "", whatsapp: "", senha: "" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-blue-700">Cadastro de instrutor</h1>
        <p className="mt-2 text-sm text-slate-600">Após o envio, o cadastro ficará pendente até aprovação do gestor.</p>

        {erro && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
        {mensagem && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nome completo" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nome que aparecerá na grade" value={form.nomeGrade} onChange={(e) => atualizar("nomeGrade", e.target.value)} />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="E-mail de acesso" value={form.email} onChange={(e) => atualizar("email", e.target.value)} required />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="WhatsApp com DDD" value={form.whatsapp} onChange={(e) => atualizar("whatsapp", e.target.value)} />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="password" placeholder="Senha" value={form.senha} onChange={(e) => atualizar("senha", e.target.value)} required />
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={carregando}>
              {carregando ? "Enviando..." : "Enviar cadastro"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/login")}>Voltar</Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Já tem cadastro aprovado? <Link to="/login" className="text-blue-700">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
