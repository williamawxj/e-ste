// src/pages/PreencherHorarios.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const CORES_MATERIAS = [
  "bg-blue-300", "bg-green-300", "bg-red-300", "bg-yellow-300",
  "bg-purple-300", "bg-pink-300", "bg-indigo-300", "bg-teal-300",
];

function normalizarTexto(txt) {
  return (txt || "").toLowerCase().trim();
}

function ajustarParaSegunda(dataStr) {
  const data = new Date(dataStr);
  const diaSemana = data.getDay();
  const diff = (diaSemana === 0 ? -6 : 1) - diaSemana;
  data.setDate(data.getDate() + diff);
  return data.toISOString().split("T")[0];
}

export default function PreencherHorarios({ usuario }) {
  const [turmas, setTurmas] = useState([]);
  const [materiasInstrutor, setMateriasInstrutor] = useState([]);
  const [materiaSelecionada, setMateriaSelecionada] = useState("");
  const [grade, setGrade] = useState({});
  const [coresMateria, setCoresMateria] = useState({});

  const horarios = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:30 - 10:15",
    "10:15 - 11:00", "14:00 - 14:45", "14:45 - 15:30", "15:45 - 16:30",
    "16:30 - 17:15", "17:15 - 18:00",
  ];

  const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

  useEffect(() => {
    const t = JSON.parse(localStorage.getItem("turmas")) || [];
    const m = JSON.parse(localStorage.getItem("materias")) || [];
    const g = JSON.parse(localStorage.getItem("grade-horarios")) || {};

    setTurmas(t);
    setGrade(g);

    const instrutores = JSON.parse(localStorage.getItem("instrutores-aprovados")) || [];
    const instrutorAtual = instrutores.find(i => 
      normalizarTexto(i.email) === normalizarTexto(usuario.email)
    );

    if (instrutorAtual?.materias) {
      setMateriasInstrutor(instrutorAtual.materias);
    }

    const coresSalvas = JSON.parse(localStorage.getItem("cores-materias")) || {};
    const coresAtualizadas = { ...coresSalvas };
    m.forEach((materia, index) => {
      if (!coresAtualizadas[materia]) {
        coresAtualizadas[materia] = CORES_MATERIAS[index % CORES_MATERIAS.length];
      }
    });
    setCoresMateria(coresAtualizadas);
    localStorage.setItem("cores-materias", JSON.stringify(coresAtualizadas));
  }, [usuario]);

  function preencherCelula(dia, hora) {
    if (!materiaSelecionada || !usuario?.nome) return;
    const novaGrade = { ...grade };
    const chave = `${dia}-${hora}`;
    novaGrade[chave] = { materia: materiaSelecionada, instrutor: usuario.nome };
    setGrade(novaGrade);
    localStorage.setItem("grade-horarios", JSON.stringify(novaGrade));
  }

  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <div className="text-white p-4">
      <h1 className="text-xl font-bold mb-4">Preencher Horários</h1>

      <div className="mb-4 flex gap-4 flex-wrap">
        <label>
          Matéria:
          <select
            value={materiaSelecionada}
            onChange={e => setMateriaSelecionada(e.target.value)}
            className="text-black px-2 ml-2"
          >
            <option value="">Selecione</option>
            {materiasInstrutor.map(m => (
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
                  const cor = conteudo?.materia ? coresMateria[conteudo.materia] || "" : "";
                  return (
                    <td
                      key={dia}
                      className={`border border-slate-600 p-1 text-xs whitespace-pre-wrap cursor-pointer ${cor}`}
                      onClick={() => preencherCelula(dia, hora)}
                    >
                      {conteudo?.materia || ""}
                      {conteudo?.instrutor ? `\n${conteudo.instrutor}` : ""}
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
