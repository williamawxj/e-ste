import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Home, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Button from "./Button";
import { formatarDataBR } from "../utils/dateUtils";
import { getMensagens, marcarMensagemComoLida, marcarMensagensComoLidas } from "../utils/mensagensDB";

const topbarIconClass = "h-8 w-8 sm:h-7 sm:w-7";

const ROTA_POR_TIPO_MENSAGEM = {
  cadastro_instrutor_pendente: "/aprovacao",
  solicitacao_modificacao_horario: "/solicitar-modificacao-ste",
  confirmacao_horario: "/modificar-horarios",
  cancelamento_aula: "/horarios-por-turma",
  confirmacao_qts: "/horarios-por-turma",
  solicitacao_gestor_aulas: "/comunicacoes-gestor",
  solicitacao_auxiliares: "/auxiliares-pendentes",
};

export default function Topbar({
  nome,
  perfil,
  onLogout,
  sidebarVisivel = true,
  sidebarFixo = true,
  onAlternarSidebar,
}) {
  const navigate = useNavigate();
  const [mensagens, setMensagens] = useState([]);
  const [aberto, setAberto] = useState(false);
  const mensagensNaoLidas = mensagens.filter((mensagem) => !mensagem.lida);
  const naoLidas = mensagensNaoLidas.length;

  useEffect(() => {
    let ativo = true;

    async function carregarMensagens() {
      try {
        const lista = await getMensagens();
        if (ativo) setMensagens(lista);
      } catch {
        if (ativo) setMensagens([]);
      }
    }

    carregarMensagens();
    const timer = window.setInterval(carregarMensagens, 60000);
    return () => {
      ativo = false;
      window.clearInterval(timer);
    };
  }, []);

  async function marcarComoLida(id) {
    const atualizada = await marcarMensagemComoLida(id);
    setMensagens((atuais) => atuais.map((mensagem) => (
      mensagem.id === id ? { ...mensagem, ...atualizada } : mensagem
    )));
  }

  function abrirNotificacao(mensagem) {
    marcarComoLida(mensagem.id);
    setAberto(false);
    const rota = ROTA_POR_TIPO_MENSAGEM[mensagem.tipo];
    if (rota) navigate(rota);
  }

  async function marcarTodasComoLidas() {
    await marcarMensagensComoLidas();
    const lista = await getMensagens();
    setMensagens(lista);
  }

  return (
    <header
      className={`fixed top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/95 px-3 shadow-sm backdrop-blur transition-[left,width] duration-200 sm:px-4 md:px-8 ${
        sidebarVisivel && sidebarFixo ? "left-0 w-full md:left-64 md:w-[calc(100%-16rem)]" : "left-0 w-full"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-12 shrink-0 px-0"
          onClick={onAlternarSidebar}
          aria-label={sidebarVisivel ? "Ocultar menu lateral" : "Exibir menu lateral"}
          title={sidebarVisivel ? "Ocultar menu lateral" : "Exibir menu lateral"}
        >
          {sidebarVisivel
            ? <PanelLeftClose className={topbarIconClass} />
            : <PanelLeftOpen className={topbarIconClass} />}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-12 shrink-0 px-0"
          onClick={() => navigate("/")}
          aria-label="Home"
          title="Home"
        >
          <Home className={topbarIconClass} />
        </Button>
        <div className="hidden truncate text-sm text-slate-600 sm:block">Secao de Treinamento e Ensino</div>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            className="relative h-12 w-12 px-0"
            onClick={() => setAberto((valor) => !valor)}
            aria-label="Mensagens"
            title="Mensagens"
          >
            <Bell className={topbarIconClass} />
            {naoLidas > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            )}
          </Button>

          {aberto && (
            <div className="fixed left-3 right-3 top-16 max-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-950">Mensagens</div>
                {naoLidas > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    onClick={marcarTodasComoLidas}
                  >
                    <CheckCheck size={14} /> Marcar todas
                  </button>
                )}
              </div>

              <div className="max-h-[calc(100vh-9rem)] overflow-y-auto sm:max-h-96">
                {mensagensNaoLidas.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-500">Nenhuma mensagem nova.</div>
                ) : (
                  mensagensNaoLidas.map((mensagem) => {
                    const temAcao = Boolean(ROTA_POR_TIPO_MENSAGEM[mensagem.tipo]);
                    return (
                      <div key={mensagem.id} className="border-b border-slate-100 bg-blue-50 px-4 py-3 last:border-0">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            className={`min-w-0 flex-1 text-left ${temAcao ? "cursor-pointer" : "cursor-default"}`}
                            onClick={() => abrirNotificacao(mensagem)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold text-slate-950">{mensagem.titulo}</div>
                              <span className="h-2 w-2 rounded-full bg-blue-600" />
                            </div>
                            <div className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">{mensagem.texto}</div>
                            <div className="mt-2 text-[11px] font-semibold text-slate-400">{formatarDataBR(mensagem.criadoEm)}</div>
                            {temAcao && (
                              <div className="mt-1 text-[11px] font-semibold text-blue-700">Clique para abrir</div>
                            )}
                          </button>
                          <button
                            type="button"
                            className="mt-0.5 shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-blue-200 hover:text-blue-700"
                            onClick={() => marcarComoLida(mensagem.id)}
                            aria-label="Marcar como lida"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden min-w-0 text-right text-sm sm:block">
          <div className="font-semibold text-slate-950">{nome}</div>
          <div className="text-xs text-slate-600">{perfil === "gestor" ? "Gestor" : "Instrutor"}</div>
        </div>
        <Button variant="secondary" onClick={onLogout} className="h-10 gap-2 px-3 sm:h-12 sm:px-4">
          <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
