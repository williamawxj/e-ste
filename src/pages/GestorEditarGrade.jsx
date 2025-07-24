// src/pages/GestorEditarGrade.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Dialog } from "@headlessui/react";

const CORES_MATERIAS = [
  "bg-blue-300", "bg-green-300", "bg-red-300", "bg-yellow-300",
  "bg-purple-300", "bg-pink-300", "bg-indigo-300", "bg-teal-300",
];

function obterSegundaDaSemana(dataStr) {
  const data = new Date(dataStr);
  const diaSemana = data.getDay();
  const diff = (diaSemana === 0 ? -6 : 1) - diaSemana;
  data.setDate(data.getDate() + diff);
  return data.toISOString().split("T")[-1];
}

export default function GestorEditarGrade({ usuario }) {
  const [materias, setMaterias] = useState([]);
  const [grade, setGrade] = useState({});
  const [coresMateria, setCoresMateria] = useState({});
  const [cargaHorariaTotal, setCargaHorariaTotal] = useState({});
  const [dataSemana, setDataSemana] = useState(obterSegundaDaSemana(new Date()));
  const [turmas, setTurmas] = useState([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [edicaoAtual, setEdicaoAtual] = useState(null);

  const horarios = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:30 - 10:15",
    "10:15 - 11:00", "14:00 - 14:45", "14:45 - 15:30", "15:45 - 16:30",
    "16:30 - 17:15", "17:15 - 18:00",
  ];

  const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

  useEffect(() => {
    const m = JSON.parse(localStorage.getItem("materias")) || [];
    const t = JSON.parse(localStorage.getItem("turmas")) || [];
    const ch = JSON.parse(localStorage.getItem("carga-horaria-total")) || {};
    const coresSalvas = JSON.parse(localStorage.getItem("cores-materias")) || {};
    const coresAtualizadas = { ...coresSalvas };
    m.forEach((materia, index) => {
      if (!coresAtualizadas[materia]) {
        coresAtualizadas[materia] = CORES_MATERIAS[index % CORES_MATERIAS.length];
      }
    });
    const g = JSON.parse(localStorage.getItem(`grade-horarios-${dataSemana}`)) || {};
    setMaterias(m);
    setTurmas(t);
    setGrade(g);
    setCargaHorariaTotal(ch);
    setCoresMateria(coresAtualizadas);
    localStorage.setItem("cores-materias", JSON.stringify(coresAtualizadas));
  }, [dataSemana]);

  function abrirEdicao(dia, hora) {
    const chave = `${dia}-${hora}`;
    const conteudo = grade[chave] || {};
    setEdicaoAtual({ chave, dia, hora, ...conteudo });
    setModalAberto(true);
  }

  function salvarEdicao() {
    const novaGrade = { ...grade, [edicaoAtual.chave]: edicaoAtual };
    setGrade(novaGrade);
    localStorage.setItem(`grade-horarios-${dataSemana}`, JSON.stringify(novaGrade));

    if (edicaoAtual.materia && edicaoAtual.cargaHoraria) {
      const novaCH = { ...cargaHorariaTotal, [edicaoAtual.materia]: edicaoAtual.cargaHoraria };
      setCargaHorariaTotal(novaCH);
      localStorage.setItem("carga-horaria-total", JSON.stringify(novaCH));
    }
    setModalAberto(false);
  }

  function excluirCelula(dia, hora) {
    const chave = `${dia}-${hora}`;
    const novaGrade = { ...grade };
    delete novaGrade[chave];
    setGrade(novaGrade);
    localStorage.setItem(`grade-horarios-${dataSemana}`, JSON.stringify(novaGrade));
  }

  if (!usuario || usuario.perfil !== "gestor") return <Navigate to="/login" replace />;

  return (
    <div className="text-white p-4">
      <h1 className="text-xl font-bold mb-4">Editar Grade (Gestor)</h1>

      <div className="mb-4 flex gap-4 flex-wrap items-center">
        <label>
          Semana:
          <input
            type="date"
            value={dataSemana}
            onChange={e => setDataSemana(obterSegundaDaSemana(e.target.value))}
            className="text-black ml-2"
          />
        </label>

        <label>
          Filtrar por Turma:
          <select
            value={turmaSelecionada}
            onChange={e => setTurmaSelecionada(e.target.value)}
            className="text-black ml-2"
          >
            <option value="">Todas</option>
            {turmas.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-auto border border-slate-600 mt-6">
        <table className="table-auto border-collapse w-full">
          <thead>
            <tr>
              <th className="border border-slate-600 px-2">Horário</th>
              {diasSemana.map(dia => (
                <th key={dia} className="border border-slate-600 px-2">{dia}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horarios.map((hora) => (
              <tr key={hora}>
                <td className="border border-slate-600 px-2 text-sm font-bold">{hora}</td>
                {diasSemana.map((dia) => {
                  const chave = `${dia}-${hora}`;
                  const conteudo = grade[chave];
                  if (turmaSelecionada && conteudo?.turma !== turmaSelecionada) return <td key={dia}></td>;

                  const cor = conteudo?.materia ? coresMateria[conteudo.materia] || "" : "";
                  const aulaAtual = conteudo?.numeroAula || "";
                  const chTotal = conteudo?.materia ? cargaHorariaTotal[conteudo.materia] || "--" : "";

                  return (
                    <td
                      key={dia}
                      className={`border border-slate-600 p-1 text-xs whitespace-pre-wrap cursor-pointer ${cor}`}
                      onClick={() => abrirEdicao(dia, hora)}
                      onDoubleClick={() => excluirCelula(dia, hora)}
                      title="Clique para editar, duplo clique para excluir"
                    >
                      {conteudo?.materia && (
                        <>
                          <strong className="block">{aulaAtual} - {conteudo.materia}</strong>
                          <span className="block text-sm">Instrutor: {conteudo.instrutor}</span>
                          <span className="block text-red-500">Local: {conteudo.local || ""}</span>
                          <span className="block font-semibold">Carga Horária: ({chTotal})</span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && edicaoAtual && (
        <Dialog open={modalAberto} onClose={() => setModalAberto(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white text-black rounded-lg shadow p-6 max-w-md w-full">
              <Dialog.Title className="text-lg font-bold mb-4">Editar Célula</Dialog.Title>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Matéria"
                  value={edicaoAtual.materia || ""}
                  onChange={e => setEdicaoAtual({ ...edicaoAtual, materia: e.target.value })}
                  className="w-full border p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="Número da Aula"
                  value={edicaoAtual.numeroAula || ""}
                  onChange={e => setEdicaoAtual({ ...edicaoAtual, numeroAula: e.target.value })}
                  className="w-full border p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="Instrutor"
                  value={edicaoAtual.instrutor || ""}
                  onChange={e => setEdicaoAtual({ ...edicaoAtual, instrutor: e.target.value })}
                  className="w-full border p-2 rounded"
                />
                <input
                  type="text"
                  placeholder="Local"
                  value={edicaoAtual.local || ""}
                  onChange={e => setEdicaoAtual({ ...edicaoAtual, local: e.target.value })}
                  className="w-full border p-2 rounded"
                />
                <input
                  type="number"
                  placeholder="Carga Horária Total"
                  value={edicaoAtual.cargaHoraria || ""}
                  onChange={e => setEdicaoAtual({ ...edicaoAtual, cargaHoraria: e.target.value })}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={salvarEdicao} className="bg-blue-600 text-white px-4 py-2 rounded">Salvar</button>
                <button onClick={() => setModalAberto(false)} className="bg-gray-400 text-black px-4 py-2 rounded">Cancelar</button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
}
