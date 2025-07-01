export default function GestorDashboard({ usuario }) {
  if (usuario.perfil !== "gestor") {
    return <div className="text-center mt-10 text-red-400">Acesso restrito!</div>;
  }

  return (
    <div className="text-white text-center mt-20">
      <h2 className="text-2xl">Selecione uma funcionalidade no menu lateral</h2>
    </div>
  );
}
