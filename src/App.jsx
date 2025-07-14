// App.jsx (com proteção aprimorada por perfil)
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import CadastroInstrutor from "./pages/CadastroInstrutor";
import GestorDashboard from "./pages/GestorDashboard";
import CadastroGestor from "./pages/CadastroGestor";
import AprovacaoInstrutor from "./pages/AprovacaoInstrutor";
import GestorTurmasMaterias from "./pages/GestorTurmasMaterias";
import InstrutorPerfil from "./pages/InstrutorPerfil";
import PreencherHorarios from "./pages/PreencherHorarios";
import SelecionarMateriasDesejadas from "./pages/SelecionarMateriasDesejadas";



function ProtectedGestor({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.perfil !== "gestor") return <Navigate to="/perfil-instrutor" replace />;
  return children;
}

function ProtectedInstrutor({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.perfil !== "instrutor") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [descricaoPainel, setDescricaoPainel] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem("usuario");
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
    }
  }, []);

  function handleLogin(usuarioLogado) {
    localStorage.setItem("usuario", JSON.stringify(usuarioLogado));
    setUsuario(usuarioLogado);
    if (usuarioLogado.perfil === "gestor") {
      navigate("/");
    } else if (usuarioLogado.perfil === "instrutor") {
      navigate("/perfil-instrutor");
    }
  }

  function handleLogout() {
    localStorage.removeItem("usuario");
    setUsuario(null);
    navigate("/login");
  }

  

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {usuario && (
        <Topbar
          nome={usuario.nome}
          perfil={usuario.perfil}
          onLogout={handleLogout}
        />
      )}

      <div className="flex pt-16">
        {usuario && (
          <Sidebar
            perfil={usuario.perfil}
            setDescricaoPainel={setDescricaoPainel}
          />
        )}

        <main className={`flex-1 p-8 ${usuario ? "ml-56" : ""}`}>
          {usuario && descricaoPainel && (
            <div className="mb-4 text-slate-300 italic text-sm border-b border-slate-600 pb-2">
              {descricaoPainel}
            </div>
          )}

          <Routes>
            <Route
              path="/"
              element={
                <ProtectedGestor usuario={usuario}>
                  <GestorDashboard usuario={usuario} />
                </ProtectedGestor>
              }
            />
            <Route
              path="/selecionar-materias-desejadas"
              element={
                <ProtectedInstrutor usuario={usuario}>
                  <SelecionarMateriasDesejadas usuario={usuario} />
                </ProtectedInstrutor>
              }
            />


            <Route
              path="/preencher-horarios"
              element={
              usuario?.perfil === "gestor" || usuario?.perfil === "instrutor" ? (
            <PreencherHorarios usuario={usuario} />
              ) : (
            <Navigate to="/login" replace />
              )
              }
            />


            <Route
              path="/cadastrar-gestor"
              element={
                <ProtectedGestor usuario={usuario}>
                  <CadastroGestor usuario={usuario} />
                </ProtectedGestor>
              }
            />

            <Route
              path="/aprovacao"
              element={
                <ProtectedGestor usuario={usuario}>
                  <AprovacaoInstrutor usuario={usuario} />
                </ProtectedGestor>
              }
            />

            <Route
              path="/gestor-turmas-materias"
              element={
                <ProtectedGestor usuario={usuario}>
                  <GestorTurmasMaterias usuario={usuario} />
                </ProtectedGestor>
              }
            />

            <Route
              path="/perfil-instrutor"
              element={
                <ProtectedInstrutor usuario={usuario}>
                  <InstrutorPerfil usuario={usuario} onUpdate={setUsuario} />
                </ProtectedInstrutor>
              }
            />

            <Route
              path="/login"
              element={
                usuario ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              }
            />

            <Route
              path="/cadastro-instrutor"
              element={
                <CadastroInstrutor onVoltar={() => navigate("/login")} />
              }
            />

            <Route
              path="*"
              element={<Navigate to={usuario ? "/" : "/login"} replace />}
            />
          </Routes>

          
        </main>
      </div>
    </div>
  );
}
