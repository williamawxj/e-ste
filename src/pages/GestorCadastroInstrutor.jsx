import { useEffect, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import Field from "../components/Field";
import MateriasDropdown from "../components/MateriasDropdown";
import PageShell from "../components/PageShell";
import { getMaterias } from "../utils/academicoDB";
import { cadastrarInstrutorPeloGestor } from "../utils/usuariosDB";

export default function GestorCadastroInstrutor() {
  const [form, setForm] = useState({ nome: "", nomeGrade: "", email: "", whatsapp: "", senha: "", confirmarSenha: "", materias: [] });
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [materias, setMaterias] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    getMaterias().then(setMaterias).catch(() => setMaterias([]));
  }, []);

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function alternarMateria(id) {
    setForm((f) => ({
      ...f,
      materias: f.materias.includes(id) ? f.materias.filter((m) => m !== id) : [...f.materias, id],
    }));
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
    const resultado = await cadastrarInstrutorPeloGestor(form);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }
    setMensagem("Instrutor cadastrado e aprovado com sucesso.");
    setForm({ nome: "", nomeGrade: "", email: "", whatsapp: "", senha: "", confirmarSenha: "", materias: [] });
  }

  return (
    <PageShell title="Cadastro de instrutor pelo gestor" subtitle="O instrutor cadastrado aqui já entra aprovado no sistema.">
      <Card className="max-w-xl">
        {erro && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
        {mensagem && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome completo">
            <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nome completo" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required />
          </Field>
          <Field label="Nome que aparecerá na grade">
            <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nome que aparecerá na grade" value={form.nomeGrade} onChange={(e) => atualizar("nomeGrade", e.target.value)} />
          </Field>
          <Field label="E-mail/login">
            <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="E-mail/login" value={form.email} onChange={(e) => atualizar("email", e.target.value)} required />
          </Field>
          <Field label="WhatsApp com DDD">
            <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="WhatsApp com DDD" value={form.whatsapp} onChange={(e) => atualizar("whatsapp", e.target.value)} />
          </Field>
          <Field label="Senha">
            <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="password" placeholder="Senha" value={form.senha} onChange={(e) => atualizar("senha", e.target.value)} autoComplete="new-password" required />
          </Field>
          <Field label="Confirmar senha">
            <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="password" placeholder="Confirmar senha" value={form.confirmarSenha} onChange={(e) => atualizar("confirmarSenha", e.target.value)} autoComplete="new-password" required />
          </Field>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Matérias que leciona</p>
            <MateriasDropdown
              materias={materias}
              selecionadas={form.materias}
              onAlternar={alternarMateria}
              emptyText="Cadastre matérias antes em Turmas e matérias."
            />
          </div>

          <Button type="submit" disabled={carregando}>
            {carregando ? "Cadastrando..." : "Cadastrar instrutor"}
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
