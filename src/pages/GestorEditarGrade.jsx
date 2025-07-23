// src/pages/GestorEditarGrade.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const CORES_MATERIAS = [
  "bg-blue-300", "bg-green-300", "bg-red-300", "bg-yellow-300",
  "bg-purple-300", "bg-pink-300", "bg-indigo-300", "bg-teal-300",
];

function normalizarTexto(txt) {
  return (txt || "").toLowerCase().trim();
}

function obterSegundaDaSemana(dataStr) {
  const data = new Date(dataStr);
  const diaSemana = data.getDay();
  const diff = (diaSemana === 0 ? -6 : 1) - diaSemana;
  data.setDate(data.getDate() + diff);
  return data.toISOString().split("T")[0];
}

export default function GestorEditarGrade({ usuario }) {
  const [materias, setMaterias] = useState([]);
  const [materiaSelecionada, setMateriaSelecionada] = useState("");
  const [grade, setGrade] = useState({});
  const [coresMateria, setCoresMateria] = useState({});
  const [cargaHorariaTotal, setCargaHorariaTotal] = useState({});
  const [dataSemana, setDataSemana] = useState(obterSegundaDaSemana(new Date()));
  const [filtroMateria, setFiltroMateria] = useState("");

  const horarios = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:30 - 10:15",
    "10:15 - 11:00", "14:00 - 14:45", "14:45 - 15:30", "15:45 - 16:30",
    "16:30 - 17:15", "17:15 - 18:00",
  ];

  const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

  useEffect(() => {
    const m = JSON.parse(localStorage.getItem("materias")) || [];
    const g = JSON.parse(localStorage.getItem(`grade-horarios-${dataSemana}`)) || {};
    const ch = JSON.parse(localStorage.getItem("carga-horaria-total")) || {};
    const coresSalvas = JSON.parse(localStorage.getItem("cores-materias")) || {};
    const coresAtualizadas = { ...coresSalvas };
    m.forEach((materia, index) => {
      if (!coresAtualizadas[materia]) {
        coresAtualizadas[materia] = CORES_MATERIAS[index % CORES_MATERIAS.length];
      }
    });
    setMaterias(m);
    setGrade(g);
    setCargaHorariaTotal(ch);
    setCoresMateria(coresAtualizadas);
    localStorage.setItem("cores-materias", JSON.stringify(coresAtualizadas));
  }, [dataSemana]);

  function preencherCelula(dia, hora) {
    const texto = prompt("Digite o conteúdo da célula (matéria ou texto especial):");
    if (!texto) return;

    const chave = `${dia}-${hora}`;
    const gradeAtual = JSON.parse(localStorage.getItem(`grade-horarios-${dataSemana}`)) || {};
    const novaGrade = { ...gradeAtual, ...grade };

    const numeroAula = prompt("Número da aula:", "1");
    const local = prompt("Local da aula:", "");

    novaGrade[chave] = {
      materia: texto,
      instrutor: "GESTOR",
      numeroAula,
      local,
      data: dataSemana
    };

    setGrade(novaGrade);
    localStorage.setItem(`grade-horarios-${dataSemana}`, JSON.stringify(novaGrade));
  }

  function excluirCelula(dia, hora) {
    const chave = `${dia}-${hora}`;
    const gradeAtual = JSON.parse(localStorage.getItem(`grade-horarios-${dataSemana}`)) || {};
    const novaGrade = { ...gradeAtual };
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
          Filtrar por Matéria:
          <select
            value={filtroMateria}
            onChange={e => setFiltroMateria(e.target.value)}
            className="text-black ml-2"
          >
            <option value="">Todas</option>
            {materias.map(m => (
              <option key={m} value={m}>{m}</option>
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
                  if (filtroMateria && conteudo?.materia !== filtroMateria) return <td key={dia}></td>;

                  const cor = conteudo?.materia ? coresMateria[conteudo.materia] || "" : "";
                  const aulaAtual = conteudo?.numeroAula || "";
                  const chTotal = conteudo?.materia ? cargaHorariaTotal[conteudo.materia] || "--" : "";

                  return (
                    <td
                      key={dia}
                      className={`border border-slate-600 p-1 text-xs whitespace-pre-wrap cursor-pointer ${cor}`}
                      onClick={() => preencherCelula(dia, hora)}
                      onDoubleClick={() => excluirCelula(dia, hora)}
                    >
                      {conteudo?.materia && (
                        <>
                          <strong className="block">{aulaAtual} - {conteudo.materia}</strong>
                          <span className="block text-sm">{conteudo.instrutor}</span>
                          <span className="block text-red-500">{conteudo.local || ""}</span>
                          <span className="block font-semibold">({chTotal})</span>
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
    </div>
  );
}
