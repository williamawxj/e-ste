import { useEffect, useMemo, useState } from "react";
import AuxiliaresInfo from "../components/AuxiliaresInfo";
import Button from "../components/Button";
import Card from "../components/Card";
import LocalInstrucaoInfo from "../components/LocalInstrucaoInfo";
import PageShell from "../components/PageShell";
import ProvaInfo from "../components/ProvaInfo";
import {
  DIAS_SEMANA,
  getHorariosPorTurma,
  getHorariosPorTurmaSemana,
  getMateriasDaTurma,
  getSemanas,
  getTurmas,
  SLOTS_AULA,
} from "../utils/academicoDB";
import {
  criarMapaCargaAulasPorHorario,
  montarTituloHorarioComCarga,
} from "../utils/cargaHorariaProgressao";
import { exportarGradeExcel, exportarGradePDF } from "../utils/exportUtils";
import { getEstiloHorario } from "../utils/gradeColors";
import { filtrarSemanasPorMes, getMesAtualInput, listarMesesDasSemanas } from "../utils/dateUtils";

export default function HorariosPorTurma({ usuario }) {
  const [turmas, setTurmas] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(getMesAtualInput());
  const [horarios, setHorarios] = useState([]);
  const [horariosDaTurma, setHorariosDaTurma] = useState([]);
  const [materiasDaTurma, setMateriasDaTurma] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [semanaId, setSemanaId] = useState("");
  const opcoesMes = useMemo(() => listarMesesDasSemanas(semanas), [semanas]);
  const semanasFiltradas = useMemo(
    () => filtrarSemanasPorMes(semanas, mesFiltro),
    [semanas, mesFiltro],
  );
  const turma = turmas.find((item) => item.id === turmaId);
  const semana = semanas.find((item) => item.id === semanaId);
  const cargasPorHorario = useMemo(
    () => criarMapaCargaAulasPorHorario({
      horarios: horariosDaTurma,
      materias: materiasDaTurma,
      semanas,
    }),
    [horariosDaTurma, materiasDaTurma, semanas],
  );

  useEffect(() => {
    async function carregarBase() {
      const [listaTurmas, listaSemanas] = await Promise.all([getTurmas(), getSemanas()]);
      setTurmas(listaTurmas);
      setSemanas(listaSemanas);
      setTurmaId((atual) => atual || listaTurmas[0]?.id || "");
      const mesesDisponiveis = listarMesesDasSemanas(listaSemanas);
      setMesFiltro((atual) => (
        mesesDisponiveis.some((item) => item.valor === atual)
          ? atual
          : (mesesDisponiveis[mesesDisponiveis.length - 1]?.valor || getMesAtualInput())
      ));
    }

    carregarBase().catch(() => {
      setTurmas([]);
      setSemanas([]);
    });
  }, []);

  useEffect(() => {
    if (semanasFiltradas.length === 0) {
      setSemanaId("");
      return;
    }
    setSemanaId((atual) => (
      semanasFiltradas.some((semana) => semana.id === atual)
        ? atual
        : (semanasFiltradas[0]?.id || "")
    ));
  }, [semanasFiltradas]);

  useEffect(() => {
    async function carregarHorarios() {
      setHorarios(await getHorariosPorTurmaSemana(turmaId, semanaId));
    }

    if (turmaId && semanaId) {
      carregarHorarios().catch(() => setHorarios([]));
    } else {
      setHorarios([]);
    }
  }, [turmaId, semanaId]);

  useEffect(() => {
    async function carregarDadosTurma() {
      const [todosHorarios, materias] = await Promise.all([
        getHorariosPorTurma(turmaId),
        getMateriasDaTurma(turmaId),
      ]);
      setHorariosDaTurma(todosHorarios);
      setMateriasDaTurma(materias);
    }

    if (turmaId) {
      carregarDadosTurma().catch(() => {
        setHorariosDaTurma([]);
        setMateriasDaTurma([]);
      });
    } else {
      setHorariosDaTurma([]);
      setMateriasDaTurma([]);
    }
  }, [turmaId, semanaId]);

  function exportarExcel() {
    exportarGradeExcel({
      horarios,
      nomeArquivo: `grade-${turma?.nome || "turma"}.csv`,
      cargaAulasPorHorario: cargasPorHorario,
    });
  }

  async function exportarPDF() {
    await exportarGradePDF({
      horarios,
      titulo: `Grade - ${turma?.nome || "Turma"} - ${semana?.nome || "Semana"}`,
      nomeArquivo: `grade-${turma?.nome || "turma"}.pdf`,
      cargaAulasPorHorario: cargasPorHorario,
      assinaturaTexto: `${String(usuario?.nome || "STE").trim().toUpperCase()} - ${usuario?.chefeSte ? "Chefe da STE CAEBMAEBM" : "Seção de Treinamento e Ensino - STE"}`,
    });
  }

  return (
    <PageShell
      title="Visualização de horários por turma"
      subtitle="Selecione turma e semana para consultar a grade. Gestores podem exportar em PDF ou Excel."
      actions={usuario.perfil === "gestor" && <><Button variant="secondary" onClick={exportarPDF}>Exportar PDF</Button><Button variant="secondary" onClick={exportarExcel}>Exportar Excel</Button></>}
    >
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {opcoesMes.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={semanaId} onChange={(e) => setSemanaId(e.target.value)}>
            <option value="">Selecione a semana</option>
            {semanasFiltradas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            <option value="">Selecione a turma</option>
            {turmas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </div>
        {semanas.length > 0 && semanasFiltradas.length === 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Não há semanas cadastradas para o mês selecionado.
          </div>
        )}
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-black">
        <table className="min-w-[900px] border-collapse bg-white text-[15px] md:min-w-full">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="w-36 border border-black p-3.5 text-left">Horario</th>
              {DIAS_SEMANA.map((dia) => <th key={dia} className="border border-black p-3.5 text-left">{dia}</th>)}
            </tr>
          </thead>
          <tbody>
            {SLOTS_AULA.map((slot) => (
              <tr key={slot.inicio} className={slot.intervalo ? "bg-slate-100" : ""}>
                <td className="border border-black p-3.5 font-semibold text-slate-700">{slot.inicio} - {slot.fim}</td>
                {DIAS_SEMANA.map((dia) => {
                  const item = horarios.find((horario) => horario.dia === dia && horario.inicio === slot.inicio);
                  if (slot.intervalo) return <td key={dia} className="border border-black p-3.5 text-center text-slate-500">{slot.rotulo || "Intervalo"}</td>;
                  return (
                    <td key={dia} className="h-24 border border-black p-2.5 align-top">
                      {item ? (
                        <div className="rounded-xl border p-2.5 text-sm font-medium shadow-sm" style={getEstiloHorario(item)}>
                          <b>{montarTituloHorarioComCarga(item, cargasPorHorario)}</b><br />
                          <span>{item.texto ? "" : item.instrutorNome}</span>
                          <ProvaInfo horario={item} />
                          <LocalInstrucaoInfo horario={item} compacto />
                          <AuxiliaresInfo horario={item} compacto />
                        </div>
                      ) : <span className="text-xs text-slate-600">Livre</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

