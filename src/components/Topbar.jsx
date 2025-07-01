export default function Topbar({ nome, perfil, onLogout }) {
  return (
    <header className="fixed top-0 left-56 h-16 w-[calc(100%-14rem)] bg-slate-800 flex items-center px-8 z-20 shadow">
      <div className="ml-auto flex items-center gap-4">
        <span className="text-white text-sm">
          Usuário: <b>{nome}</b> | Perfil: <b>{perfil === "gestor" ? "Gestor" : "Instrutor"}</b>
        </span>
        <button
          onClick={onLogout}
          className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-white font-bold"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
