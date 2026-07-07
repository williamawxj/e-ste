import { useEffect, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import MateriasDropdown from "../components/MateriasDropdown";
import PageShell from "../components/PageShell";
import { getContatoSte, getContatoSteGestao, getMaterias, salvarContatoSteGestao } from "../utils/academicoDB";
import { atualizarUsuario, salvarSessao } from "../utils/usuariosDB";

function normalizarNumeroWhatsapp(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("55")) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

export default function PerfilInstrutor({ usuario, onUsuarioAtualizado }) {
  const [materias, setMaterias] = useState([]);
  const [contatoSte, setContatoSte] = useState({ nome: "STE", whatsapp: "", email: "" });
  const [whatsappSteGestao, setWhatsappSteGestao] = useState("");
  const [form, setForm] = useState({
    nome: usuario.nome || "",
    nomeGrade: usuario.nomeGrade || usuario.nome || "",
    email: usuario.email || "",
    whatsapp: usuario.whatsapp || "",
    senha: "",
    materias: usuario.materias || [],
    chefeSte: Boolean(usuario.chefeSte),
  });
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    getMaterias().then(setMaterias).catch(() => setMaterias([]));
  }, []);

  useEffect(() => {
    if (usuario.perfil !== "instrutor") return;
    getContatoSte()
      .then((contato) => setContatoSte(contato))
      .catch(() => setContatoSte({ nome: "STE", whatsapp: "", email: "" }));
  }, [usuario.perfil]);

  useEffect(() => {
    if (usuario.perfil !== "gestor") return;
    getContatoSteGestao()
      .then((contato) => setWhatsappSteGestao(contato.whatsapp || ""))
      .catch(() => setWhatsappSteGestao(""));
  }, [usuario.perfil]);

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function alternarMateria(id) {
    setForm((f) => ({ ...f, materias: f.materias.includes(id) ? f.materias.filter((m) => m !== id) : [...f.materias, id] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const dados = { nome: form.nome, nomeGrade: form.nomeGrade, email: form.email, whatsapp: form.whatsapp, materias: form.materias };
    if (usuario.perfil === "gestor") dados.chefeSte = form.chefeSte;
    if (form.senha.trim()) dados.senha = form.senha;
    const atualizado = await atualizarUsuario(usuario.id, dados);
    salvarSessao(atualizado);
    const semSenha = { ...atualizado };
    delete semSenha.senha;
    onUsuarioAtualizado(semSenha);
    setMensagem("Perfil atualizado com sucesso.");
  }

  async function salvarContatoSte(event) {
    event.preventDefault();
    const resultado = await salvarContatoSteGestao({ whatsapp: whatsappSteGestao });
    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Nao foi possivel atualizar o contato da STE.");
      return;
    }
    setWhatsappSteGestao(resultado.contato?.whatsapp || "");
    setMensagem(resultado.mensagem || "Contato da STE atualizado com sucesso.");
  }

  const numeroSte = normalizarNumeroWhatsapp(contatoSte.whatsapp);
  const linkWhatsappSte = numeroSte
    ? `https://wa.me/${numeroSte}?text=${encodeURIComponent(`Olá, STE. Sou ${usuario.nomeGrade || usuario.nome} e preciso de apoio.`)}`
    : "";

  return (
    <PageShell title={usuario.perfil === "gestor" ? "Perfil" : "Perfil do instrutor"} subtitle="Atualize seus dados de acesso e informações usadas na grade.">
      <Card className="max-w-xl">
        {mensagem && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nome completo" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nome de aparição na grade" value={form.nomeGrade} onChange={(e) => atualizar("nomeGrade", e.target.value)} />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="E-mail/login" value={form.email} onChange={(e) => atualizar("email", e.target.value)} required />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="WhatsApp com DDD" value={form.whatsapp} onChange={(e) => atualizar("whatsapp", e.target.value)} />
          <input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="password" placeholder="Nova senha (deixe em branco para manter)" value={form.senha} onChange={(e) => atualizar("senha", e.target.value)} />

          {usuario.perfil === "gestor" && (
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.chefeSte} onChange={(e) => atualizar("chefeSte", e.target.checked)} />
              Chefe da STE
            </label>
          )}

          {(usuario.perfil === "instrutor" || usuario.perfil === "gestor") && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                {usuario.perfil === "gestor" ? "Matérias que também leciona" : "Matérias que leciona"}
              </p>
              <MateriasDropdown
                materias={materias}
                selecionadas={form.materias}
                onAlternar={alternarMateria}
                emptyText="Ainda não há matérias cadastradas pelo gestor."
              />
            </div>
          )}

          <Button type="submit">Salvar alterações</Button>
        </form>
      </Card>
      {usuario.perfil === "instrutor" && (
        <Card className="mt-6 max-w-xl">
          <div className="text-sm font-bold text-slate-950">Fale conosco!</div>
          <div className="mt-1 text-sm text-slate-600">
            Use o canal oficial para solicitar apoio ou tirar duvidas sobre a grade.
          </div>
          <div className="mt-3">
            {linkWhatsappSte ? (
              <a
                href={linkWhatsappSte}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                WhatsApp da STE
              </a>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Contato de WhatsApp da STE ainda não cadastrado.
              </div>
            )}
          </div>
        </Card>
      )}
      {usuario.perfil === "gestor" && (
        <Card className="mt-6 max-w-xl">
          <div className="text-sm font-bold text-slate-950">Contato da STE</div>
          <div className="mt-1 text-sm text-slate-600">
            Cadastre o WhatsApp da STE para os instrutores usarem no botao "Fale conosco!".
          </div>
          <form onSubmit={salvarContatoSte} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="WhatsApp da STE com DDD"
              value={whatsappSteGestao}
              onChange={(event) => setWhatsappSteGestao(event.target.value)}
            />
            <Button type="submit">Salvar contato STE</Button>
          </form>
        </Card>
      )}
    </PageShell>
  );
}

