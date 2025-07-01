import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import CadastroInstrutor from "./pages/CadastroInstrutor";
import GestorDashboard from "./pages/GestorDashboard";
import CadastroGestor from "./pages/CadastroGestor";
import AprovacaoInstrutor from "./pages/AprovacaoInstrutor";

function Protected({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [descricaoPainel, setDescricaoPainel] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {usuario && (
        <Topbar
          nome={usuario.nome}
          perfil={usuario.perfil}
          onLogout={() => setUsuario(null)}
        />
      )}

      <div className="flex flex-1 pt-16">
        {usuario && (
          <Sidebar perfil={usuario.perfil} setDescricaoPainel={setDescricaoPainel} />
        )}

        <main className="flex-1 p-8">
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
                  <Navigate to="/" />
                ) : (
                  <Login onLogin={(user) => setUsuario(user)} />
                )
              }
            />
            <Route
              path="/cadastro-instrutor"
              element={<CadastroInstrutor onVoltar={() => (window.location.href = "/login")} />}
            />
            <Route path="*" element={<Navigate to={usuario ? "/" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
