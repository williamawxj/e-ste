import { Link } from "react-router-dom";

export default function Sidebar({ perfil, setDescricaoPainel }) {
  return (
    <div className="fixed top-0 left-0 h-full w-56 bg-slate-800 text-white pt-16 shadow-lg z-10">
      <ul className="flex flex-col gap-4 p-4 text-sm">
        {perfil === "gestor" && (
          <>
            <li>
              <Link
                to="/"
                onMouseEnter={() => setDescricaoPainel("Painel do Gestor")}
                className="hover:text-yellow-300"
              >
                Painel do Gestor
              </Link>
            </li>
            <li>
              <Link
                to="/cadastrar-gestor"
                onMouseEnter={() => setDescricaoPainel("Cadastro de Gestores")}
                className="hover:text-yellow-300"
              >
                Cadastro de Gestores
              </Link>
            </li>
            <li>
              <Link
                to="/aprovacao"
                onMouseEnter={() => setDescricaoPainel("Aprovação de Instrutores")}
                className="hover:text-yellow-300"
              >
                Aprovação de Instrutores
              </Link>
            </li>
          </>
        )}

        {perfil === "instrutor" && (
          <>
            <li>
              <Link
                to="/preencher-horarios"
                onMouseEnter={() => setDescricaoPainel("Preencher Horários")}
                className="hover:text-yellow-300"
              >
                Preencher Horários
              </Link>
            </li>
            <li>
              <Link
                to="/visualizar-horarios"
                onMouseEnter={() => setDescricaoPainel("Visualizar Horários")}
                className="hover:text-yellow-300"
              >
                Visualizar Horários
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
