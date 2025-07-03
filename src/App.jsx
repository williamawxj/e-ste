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

function Protected({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [descricaoPainel, setDescricaoPainel] = useState("");
  const navigate = useNavigate();

  // Mantém o usuário logado mesmo após recarregar
  useEffect(() => {
    const usuarioSalvo = localStorage.getItem("usuario");
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
    }
  }, []);

  function handleLogin(usuarioLogado) {
    localStorage.setItem("usuario", JSON.stringify(usuarioLogado));
    setUsuario(usuarioLogado);
    navigate("/"); // Redireciona para a tela inicial após login
  }

  function handleLogout() {
    localStorage.removeItem("usuario");
    setUsuario(null);
    navigate("/login"); // Redireciona para o login após logout
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
          <Sidebar perfil={usuario.perfil} setDescricaoPainel={setDescricaoPainel} />
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
                <Protected usuario={usuario}>
                  <GestorDashboard usuario={usuario} />
                </Protected>
              }
            />
            <Route
              path="/cadastrar-gestor"
              element={
                <Protected usuario={usuario}>
                  <CadastroGestor usuario={usuario} />
                </Protected>
              }
            />
            <Route
              path="/aprovacao"
              element={
                <Protected usuario={usuario}>
                  <AprovacaoInstrutor usuario={usuario} />
                </Protected>
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
                <CadastroInstrutor
                  onVoltar={() => navigate("/login")}
                />
              }
            />
            <Route
              path="/gestor-turmas-materias"
              element={
                <Protected usuario={usuario}>
                  <GestorTurmasMaterias />
                </Protected>
              }
            />
            <Route
              path="*"
              element={
                <Navigate to={usuario ? "/" : "/login"} replace />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
