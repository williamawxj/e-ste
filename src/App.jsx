import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ErrorBoundary from "./components/ErrorBoundary";
import { subscribeApiLoading } from "./utils/apiClient";
import { atualizarSessaoDoServidor, encerrarSessao, getSessao } from "./utils/usuariosDB";

const Login = lazy(() => import("./pages/Login"));
const CadastroInstrutor = lazy(() => import("./pages/CadastroInstrutor"));
const GestorDashboard = lazy(() => import("./pages/GestorDashboard"));
const CadastroGestor = lazy(() => import("./pages/CadastroGestor"));
const AprovacaoInstrutor = lazy(() => import("./pages/AprovacaoInstrutor"));
const PerfilInstrutor = lazy(() => import("./pages/PerfilInstrutor"));
const GestorCadastroInstrutor = lazy(() => import("./pages/GestorCadastroInstrutor"));
const EditarInstrutores = lazy(() => import("./pages/EditarInstrutores"));
const TurmasMaterias = lazy(() => import("./pages/TurmasMaterias"));
const Semanas = lazy(() => import("./pages/Semanas"));
const ModificarHorarios = lazy(() => import("./pages/ModificarHorarios"));
const PreenchimentoHorarios = lazy(() => import("./pages/PreenchimentoHorarios"));
const HorariosPorTurma = lazy(() => import("./pages/HorariosPorTurma"));
const EditarPerfilGestor = lazy(() => import("./pages/EditarPerfilGestor"));
const HorasAulaMensal = lazy(() => import("./pages/HorasAulaMensal"));
const MinhasMaterias = lazy(() => import("./pages/MinhasMaterias"));
const CargaHorariaTurmas = lazy(() => import("./pages/CargaHorariaTurmas"));
const SolicitarModificacaoSTE = lazy(() => import("./pages/SolicitarModificacaoSTE"));
const BancoDadosGestao = lazy(() => import("./pages/BancoDadosGestao"));
const ComunicacoesGestor = lazy(() => import("./pages/ComunicacoesGestor"));

function RotaProtegida({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RotaGestor({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.perfil !== "gestor") return <Navigate to="/preenchimento-horarios" replace />;
  return children;
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [ehDesktop, setEhDesktop] = useState(() => (
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 768px)").matches
  ));
  const [sidebarVisivel, setSidebarVisivel] = useState(() => (
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 768px)").matches
  ));
  const [carregandoApi, setCarregandoApi] = useState(false);
  const [mostrarTelaCarregando, setMostrarTelaCarregando] = useState(false);
  const [sufixoCarregando, setSufixoCarregando] = useState(".");

  useEffect(() => {
    const sessao = getSessao();
    if (sessao) setUsuario(sessao);
    if (sessao) {
      atualizarSessaoDoServidor()
        .then(setUsuario)
        .catch(() => setUsuario(null));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeApiLoading(({ carregando }) => {
      setCarregandoApi(carregando);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    function atualizarLayout(event) {
      setEhDesktop(event.matches);
      setSidebarVisivel(event.matches);
    }

    setEhDesktop(mediaQuery.matches);
    setSidebarVisivel(mediaQuery.matches);
    mediaQuery.addEventListener("change", atualizarLayout);
    return () => mediaQuery.removeEventListener("change", atualizarLayout);
  }, []);

  useEffect(() => {
    if (!carregandoApi) {
      setMostrarTelaCarregando(false);
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setMostrarTelaCarregando(true);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [carregandoApi]);

  useEffect(() => {
    if (!mostrarTelaCarregando) {
      setSufixoCarregando(".");
      return undefined;
    }

    const estados = [".", "..", "..."];
    let indice = 0;
    const timer = window.setInterval(() => {
      indice = (indice + 1) % estados.length;
      setSufixoCarregando(estados[indice]);
    }, 350);

    return () => window.clearInterval(timer);
  }, [mostrarTelaCarregando]);

  async function handleLogout() {
    await encerrarSessao();
    setUsuario(null);
  }

  return (
    <BrowserRouter>
      {usuario && (
        <>
          <Sidebar
            perfil={usuario.perfil}
            visivel={sidebarVisivel}
            onNavigate={() => {
              if (!ehDesktop) setSidebarVisivel(false);
            }}
          />
          {sidebarVisivel && !ehDesktop && (
            <button
              type="button"
              className="fixed inset-0 z-20 bg-slate-950/45 backdrop-blur-[1px]"
              aria-label="Fechar menu lateral"
              onClick={() => setSidebarVisivel(false)}
            />
          )}
        </>
      )}
      {usuario && (
        <Topbar
          nome={usuario.nome}
          perfil={usuario.perfil}
          onLogout={handleLogout}
          sidebarVisivel={sidebarVisivel}
          sidebarFixo={ehDesktop}
          onAlternarSidebar={() => setSidebarVisivel((valorAtual) => !valorAtual)}
        />
      )}

      <main className={usuario
        ? `${sidebarVisivel && ehDesktop ? "md:ml-64" : "md:ml-0"} pt-16 min-h-screen bg-slate-50 text-slate-900 transition-[margin] duration-200`
        : "min-h-screen bg-slate-50 text-slate-900"}
      >
        <ErrorBoundary>
        <Suspense fallback={null}>
        <Routes>
          <Route
            path="/login"
            element={usuario ? <Navigate to="/" replace /> : <Login onLogin={setUsuario} />}
          />
          <Route
            path="/cadastro-instrutor"
            element={<CadastroInstrutor />}
          />

          <Route
            path="/"
            element={
              <RotaProtegida usuario={usuario}>
                {usuario?.perfil === "gestor" ? (
                  <GestorDashboard usuario={usuario} />
                ) : (
                  <Navigate to="/preenchimento-horarios" replace />
                )}
              </RotaProtegida>
            }
          />

          <Route path="/perfil" element={<RotaProtegida usuario={usuario}><PerfilInstrutor usuario={usuario} onUsuarioAtualizado={setUsuario} /></RotaProtegida>} />
          <Route path="/minhas-materias" element={<RotaProtegida usuario={usuario}><MinhasMaterias usuario={usuario} onUsuarioAtualizado={setUsuario} /></RotaProtegida>} />
          <Route path="/preenchimento-horarios" element={<RotaProtegida usuario={usuario}><PreenchimentoHorarios usuario={usuario} /></RotaProtegida>} />
          <Route path="/solicitar-modificacao-ste" element={<RotaProtegida usuario={usuario}><SolicitarModificacaoSTE usuario={usuario} /></RotaProtegida>} />
          <Route path="/horarios-por-turma" element={<RotaProtegida usuario={usuario}><HorariosPorTurma usuario={usuario} /></RotaProtegida>} />
          <Route path="/horas-aula" element={<RotaProtegida usuario={usuario}><HorasAulaMensal usuario={usuario} /></RotaProtegida>} />

          <Route path="/cadastrar-instrutor" element={<RotaGestor usuario={usuario}><GestorCadastroInstrutor usuario={usuario} /></RotaGestor>} />
          <Route path="/cadastrar-gestor" element={<RotaGestor usuario={usuario}><CadastroGestor usuario={usuario} /></RotaGestor>} />
          <Route path="/aprovacao" element={<RotaGestor usuario={usuario}><AprovacaoInstrutor usuario={usuario} /></RotaGestor>} />
          <Route path="/editar-instrutores" element={<RotaGestor usuario={usuario}><EditarInstrutores usuario={usuario} /></RotaGestor>} />
          <Route path="/turmas-materias" element={<RotaGestor usuario={usuario}><TurmasMaterias usuario={usuario} /></RotaGestor>} />
          <Route path="/carga-horaria" element={<RotaGestor usuario={usuario}><CargaHorariaTurmas usuario={usuario} /></RotaGestor>} />
          <Route path="/modificar-horarios" element={<RotaGestor usuario={usuario}><ModificarHorarios usuario={usuario} /></RotaGestor>} />
          <Route path="/semanas" element={<RotaGestor usuario={usuario}><Semanas usuario={usuario} /></RotaGestor>} />
          <Route path="/banco-dados" element={<RotaGestor usuario={usuario}><BancoDadosGestao usuario={usuario} /></RotaGestor>} />
          <Route path="/comunicacoes-gestor" element={<RotaGestor usuario={usuario}><ComunicacoesGestor usuario={usuario} /></RotaGestor>} />
          <Route path="/editar-perfil-gestor" element={<RotaGestor usuario={usuario}><EditarPerfilGestor usuario={usuario} onUsuarioAtualizado={setUsuario} /></RotaGestor>} />

          <Route path="*" element={<Navigate to={usuario ? "/" : "/login"} replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>

      {mostrarTelaCarregando && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 backdrop-blur-[1.5px]"
          role="status"
          aria-live="polite"
          aria-label="Carregando"
        >
          <div className="rounded-md border border-blue-500/85 bg-slate-800/82 px-4 py-2 text-center shadow-lg shadow-blue-950/35">
            <div className="text-sm font-semibold tracking-wide text-blue-100">Carregando{sufixoCarregando}</div>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}
