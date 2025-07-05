import { Link } from "react-router-dom";

export default function Sidebar({ perfil, setDescricaoPainel }) {
  return (
    <aside className="fixed top-16 left-0 h-full w-56 bg-slate-800 text-white p-4">
      <h2 className="text-lg font-bold mb-4">Menu</h2>
      <ul className="space-y-2">
        {perfil === "gestor" && (
          <>
            <li>
              <Link to="/" onMouseEnter={() => setDescricaoPainel("Painel do Gestor")}>
                Painel
              </Link>
            </li>
            <li>
              <Link to="/cadastrar-gestor" onMouseEnter={() => setDescricaoPainel("Cadastrar Gestor")}>
                Cadastrar Gestor
              </Link>
            </li>
            <li>
              <Link to="/aprovacao" onMouseEnter={() => setDescricaoPainel("Aprovação de Instrutores")}>
                Aprovação
              </Link>
            </li>
            <li>
              <Link to="/gestor-turmas-materias" onMouseEnter={() => setDescricaoPainel("Gerenciar Turmas e Matérias")}>
                Gerenciar Turmas e Matérias
              </Link>
            </li>
          </>
        )}

        {perfil === "instrutor" && (
          <li>
            <Link to="/perfil-instrutor" onMouseEnter={() => setDescricaoPainel("Perfil do Instrutor")}>
              Meu Perfil
            </Link>
          </li>
        )}
      </ul>
    </aside>
  );
}
