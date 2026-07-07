import { useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import { cadastrarGestor } from "../utils/usuariosDB";

export default function CadastroGestor() {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", chefeSte: false });
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
    const resultado = await cadastrarGestor(form);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }
    setMensagem("Gestor cadastrado com sucesso.");
    setForm({ nome: "", email: "", senha: "", chefeSte: false });
  }

  return (
    <PageShell title="Cadastro de gestor" subtitle="Somente gestores já cadastrados podem criar novos gestores.">
      <Card className="max-w-xl">
        {erro && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
        {mensagem && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nome completo" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="E-mail ou login" value={form.email} onChange={(e) => atualizar("email", e.target.value)} required />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="password" placeholder="Senha" value={form.senha} onChange={(e) => atualizar("senha", e.target.value)} required />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={form.chefeSte} onChange={(e) => atualizar("chefeSte", e.target.checked)} />
            Chefe da STE
          </label>
          <Button type="submit" disabled={carregando}>
            {carregando ? "Cadastrando..." : "Cadastrar gestor"}
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
