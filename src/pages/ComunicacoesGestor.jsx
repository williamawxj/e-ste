import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import {
  enviarComunicacaoChefeMateria,
  enviarConvocacaoPorMateria,
  getMaterias,
  getStatusNotificacaoEmail,
} from "../utils/academicoDB";

function erroPareceIndisponibilidade(error) {
  const status = Number(error?.status || 0);
  return !status || status >= 500;
}

async function executarComRetry(tarefa, { tentativas = 3, esperaMs = 700 } = {}) {
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    try {
      return await tarefa();
    } catch (error) {
      ultimoErro = error;
      if (tentativa < tentativas) {
        await new Promise((resolve) => window.setTimeout(resolve, esperaMs * tentativa));
      }
    }
  }
  throw ultimoErro;
}

export default function ComunicacoesGestor({ usuario }) {
  const [materias, setMaterias] = useState([]);
  const [statusEmail, setStatusEmail] = useState({ configurado: false, mensagem: "", indisponivel: false, validado: false });
  const [mensagem, setMensagem] = useState("");
  const [enviandoMateria, setEnviandoMateria] = useState(false);
  const [enviandoChefeMateria, setEnviandoChefeMateria] = useState(false);
  const [formMateria, setFormMateria] = useState({
    materiaId: "",
    periodoInicio: "",
    periodoFim: "",
    observacao: "",
  });
  const [formChefeMateria, setFormChefeMateria] = useState({
    materiaId: "",
    periodoInicio: "",
    periodoFim: "",
    observacao: "",
  });

  useEffect(() => {
    async function carregar() {
      const [materiasRes, emailRes] = await Promise.allSettled([
        getMaterias(),
        getStatusNotificacaoEmail(),
      ]);
      if (materiasRes.status === "rejected") throw materiasRes.reason;

      const listaMaterias = materiasRes.value || [];
      const email = emailRes.status === "fulfilled"
        ? emailRes.value
        : {
            configurado: false,
            mensagem: emailRes.reason?.message || "Status de e-mail indisponível.",
            indisponivel: erroPareceIndisponibilidade(emailRes.reason),
            validado: false,
          };

      setMaterias(listaMaterias || []);
      setStatusEmail(email || {
        configurado: false,
        mensagem: "Status de e-mail indisponível.",
        indisponivel: true,
        validado: false,
      });
      setFormMateria((atual) => ({
        ...atual,
        materiaId: atual.materiaId || listaMaterias?.[0]?.id || "",
      }));
      setFormChefeMateria((atual) => ({
        ...atual,
        materiaId: atual.materiaId || listaMaterias?.[0]?.id || "",
      }));
    }

    executarComRetry(carregar, { tentativas: 3, esperaMs: 750 }).catch((error) => {
      setMaterias([]);
      setStatusEmail({
        configurado: false,
        mensagem: error?.message || "Não foi possível validar o status de e-mail.",
        indisponivel: erroPareceIndisponibilidade(error),
        validado: false,
      });
      setMensagem(
        erroPareceIndisponibilidade(error)
          ? "Não foi possível acessar a API/banco de dados no momento."
          : (error?.message || "Não foi possível carregar os dados da tela."),
      );
    });
  }, [usuario]);

  function periodoValido(inicio, fim) {
    if (!inicio || !fim) return false;
    const ini = Date.parse(inicio);
    const end = Date.parse(fim);
    return Number.isFinite(ini) && Number.isFinite(end) && ini <= end;
  }

  async function enviarMateria(event) {
    event.preventDefault();
    if (!periodoValido(formMateria.periodoInicio, formMateria.periodoFim)) {
      setMensagem("Informe um período válido para a convocação por matéria.");
      return;
    }

    setEnviandoMateria(true);
    const resultado = await enviarConvocacaoPorMateria(formMateria);
    setEnviandoMateria(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Não foi possível enviar a convocação.");
      return;
    }

    setMensagem(resultado.mensagem);
  }

  async function enviarChefeMateria(event) {
    event.preventDefault();
    if (!periodoValido(formChefeMateria.periodoInicio, formChefeMateria.periodoFim)) {
      setMensagem("Informe um período válido para comunicar o chefe da pasta.");
      return;
    }

    setEnviandoChefeMateria(true);
    const resultado = await enviarComunicacaoChefeMateria(formChefeMateria);
    setEnviandoChefeMateria(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Não foi possível enviar a comunicação ao chefe da pasta.");
      return;
    }

    setMensagem(resultado.mensagem);
  }

  return (
    <PageShell
      title="Comunicações de escala"
      subtitle="Dispare e-mails por matéria para instrutores e chefes da pasta."
    >
      <div className="space-y-4">
        {statusEmail.indisponivel && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Não foi possível consultar o status de e-mail porque a API/banco está indisponível. {statusEmail.mensagem || ""}
          </div>
        )}
        {!statusEmail.indisponivel && statusEmail.validado && !statusEmail.configurado && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            E-mail automático desativado. Configure SMTP_HOST, SMTP_FROM, SMTP_USER e SMTP_PASS no .env para liberar os disparos.
          </div>
        )}

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <Mail size={16} />
            Disparar apoio por matéria
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Envia mensagem para todos os instrutores da matéria selecionada. Gestores não são comunicados, exceto quando forem instrutores/chefes vinculados à matéria.
          </p>

          <form className="mt-4 grid gap-3" onSubmit={enviarMateria}>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={formMateria.materiaId}
                onChange={(event) => setFormMateria((atual) => ({ ...atual, materiaId: event.target.value }))}
                required
              >
                <option value="">Selecione a matéria</option>
                {materias.map((materia) => (
                  <option key={materia.id} value={materia.id}>{materia.nome}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={formMateria.periodoInicio}
                onChange={(event) => setFormMateria((atual) => ({ ...atual, periodoInicio: event.target.value }))}
                required
              />
              <input
                type="datetime-local"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={formMateria.periodoFim}
                onChange={(event) => setFormMateria((atual) => ({ ...atual, periodoFim: event.target.value }))}
                required
              />
            </div>

            <textarea
              className="h-20 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Observação opcional para o e-mail"
              value={formMateria.observacao}
              onChange={(event) => setFormMateria((atual) => ({ ...atual, observacao: event.target.value }))}
            />

            <div>
              <Button type="submit" variant="success" disabled={enviandoMateria || materias.length === 0}>
                <Send size={16} className="mr-2" />
                {enviandoMateria ? "Enviando..." : "Disparar mensagem de apoio"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <Mail size={16} />
            Disparar somente para chefe da pasta
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Envia comunicação apenas para o chefe da pasta da matéria selecionada.
          </p>

          <form className="mt-4 grid gap-3" onSubmit={enviarChefeMateria}>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={formChefeMateria.materiaId}
                onChange={(event) => setFormChefeMateria((atual) => ({ ...atual, materiaId: event.target.value }))}
                required
              >
                <option value="">Selecione a matéria</option>
                {materias.map((materia) => (
                  <option key={materia.id} value={materia.id}>{materia.nome}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={formChefeMateria.periodoInicio}
                onChange={(event) => setFormChefeMateria((atual) => ({ ...atual, periodoInicio: event.target.value }))}
                required
              />
              <input
                type="datetime-local"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={formChefeMateria.periodoFim}
                onChange={(event) => setFormChefeMateria((atual) => ({ ...atual, periodoFim: event.target.value }))}
                required
              />
            </div>

            <textarea
              className="h-20 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Observação opcional para o chefe da pasta"
              value={formChefeMateria.observacao}
              onChange={(event) => setFormChefeMateria((atual) => ({ ...atual, observacao: event.target.value }))}
            />

            <div>
              <Button type="submit" variant="secondary" disabled={enviandoChefeMateria || materias.length === 0}>
                <Send size={16} className="mr-2" />
                {enviandoChefeMateria ? "Enviando..." : "Disparar e-mail para chefe da pasta"}
              </Button>
            </div>
          </form>
        </Card>

        {mensagem && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {mensagem}
          </div>
        )}
      </div>
    </PageShell>
  );
}

