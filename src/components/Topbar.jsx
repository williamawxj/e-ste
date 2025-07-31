export default function Topbar({ nome, onLogout }) {
  return (
    <div className="fixed top-1 left-1 w-full h-16 bg-slate-700 text-white flex items-center justify-between px-6 shadow z-20">
      <div className="text-lg font-semibold">E-STE</div>
      <div className="flex items-center gap-6">
        <span className="text-sm italic">Logado como: {nome}</span>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1 rounded"
        >
          Trocar de usuário
        </button>
      </div>
    </div>
  );
}
