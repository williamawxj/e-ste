export default function Sidebar({ perfil, setDescricaoPainel }) {
  return (
    <aside className="fixed top-16 left-0 h-full w-56 bg-slate-800 text-white p-4">
      <h2 className="text-lg font-bold mb-4">Menu</h2>
      <ul className="space-y-2">
        <li>
          <a href="/" onMouseEnter={() => setDescricaoPainel("Painel do Gestor")}>
            Painel
          </a>
        </li>
        <li>
          <a href="/cadastrar-gestor" onMouseEnter={() => setDescricaoPainel("Cadastrar Gestor")}>
            Cadastrar Gestor
          </a>
        </li>
        <li>
          <a href="/aprovacao" onMouseEnter={() => setDescricaoPainel("Aprovação de Instrutores")}>
            Aprovação
          </a>
        </li>
      </ul>
    </aside>
  );
}
