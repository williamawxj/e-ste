import { useEffect, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import PageShell from "../components/PageShell";
import { aprovarUsuario, getInstrutoresPendentes, rejeitarUsuario } from "../utils/usuariosDB";

export default function AprovacaoInstrutor() {
  const [pendentes, setPendentes] = useState([]);

  async function carregar() {
    const lista = await getInstrutoresPendentes();
    setPendentes(lista);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aprovar(id) {
    await aprovarUsuario(id);
    await carregar();
  }

  async function rejeitar(id) {
    if (confirm("Deseja rejeitar/remover este cadastro?")) {
      await rejeitarUsuario(id);
      await carregar();
    }
  }

  return (
    <PageShell title="Aprovação de instrutores" subtitle="Cadastros realizados pelo link público entram aqui como pendentes.">
      <div className="space-y-4">
        {pendentes.length === 0 && <Card><p className="text-emerald-700">Nenhum instrutor pendente no momento.</p></Card>}
        {pendentes.map((instrutor) => (
          <Card key={instrutor.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">{instrutor.nome}</h2>
              <p className="text-sm text-slate-600">{instrutor.email}</p>
              <p className="text-xs text-slate-500">Nome na grade: {instrutor.nomeGrade || instrutor.nome}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="success" onClick={() => aprovar(instrutor.id)}>Aprovar</Button>
              <Button variant="danger" onClick={() => rejeitar(instrutor.id)}>Rejeitar</Button>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
