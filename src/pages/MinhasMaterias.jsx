import { useEffect, useState } from "react";
import { BookOpenCheck, Save } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import MateriasDropdown from "../components/MateriasDropdown";
import PageShell from "../components/PageShell";
import { getMaterias } from "../utils/academicoDB";
import { atualizarMateriasUsuario, getUsuarioPorId, salvarSessao } from "../utils/usuariosDB";

export default function MinhasMaterias({ usuario, onUsuarioAtualizado }) {
  const [materias, setMaterias] = useState([]);
  const [selecionadas, setSelecionadas] = useState(usuario.materias || []);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const [listaMaterias, usuarioAtual] = await Promise.all([
        getMaterias(),
        getUsuarioPorId(usuario.id),
      ]);
      setMaterias(listaMaterias);
      setSelecionadas(usuarioAtual?.materias || usuario.materias || []);
    }

    carregar().catch(() => setMaterias([]));
  }, [usuario]);

  function alternarMateria(id) {
    setMensagem("");
    setErro("");
    setSelecionadas((atuais) =>
      atuais.includes(id) ? atuais.filter((materiaId) => materiaId !== id) : [...atuais, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMensagem("");
    setErro("");

    const materiasExistentes = new Set(materias.map((materia) => materia.id));
    const materiasValidas = selecionadas.filter((id) => materiasExistentes.has(id));
    const atualizado = await atualizarMateriasUsuario(usuario.id, materiasValidas);

    if (!atualizado) {
      setErro("Não foi possível atualizar as matérias deste perfil.");
      return;
    }

    salvarSessao(atualizado);
    const usuarioSemSenha = { ...atualizado };
    delete usuarioSemSenha.senha;
    onUsuarioAtualizado?.(usuarioSemSenha);
    setSelecionadas(atualizado.materias || []);
    setMensagem("Matérias atualizadas com sucesso.");
  }

  return (
    <PageShell
      title="Minhas Matérias"
      subtitle="Registre as matérias que fazem parte do seu perfil para que o preenchimento de horários use essa seleção."
    >
      <Card className="max-w-3xl">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <BookOpenCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">{usuario.nome}</h2>
            <p className="text-sm text-slate-600">{selecionadas.length} matéria(s) selecionada(s)</p>
          </div>
        </div>

        {erro && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
        {mensagem && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensagem}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <MateriasDropdown
            materias={materias}
            selecionadas={selecionadas}
            onAlternar={alternarMateria}
            emptyText="Ainda não há matérias cadastradas pelo gestor."
          />

          <Button type="submit" className="gap-2" disabled={materias.length === 0}>
            <Save size={16} /> Salvar matérias
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
