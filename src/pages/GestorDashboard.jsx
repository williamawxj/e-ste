export default function GestorDashboard({ usuario }) {
  if (usuario.perfil !== "gestor") {
    return <div className="text-center mt-10 text-red-400">Acesso restrito!</div>;
  }

  return (
    <div className="text-white text-center mt-20">
      <h2 className="text-2xl mb-6">Selecione uma funcionalidade no menu lateral</h2>

      <div className="space-y-4">
        <a
          href="/gestor-editar-grade"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Editar Grade de Horários
        </a>
      </div>
    </div>
  );
}
