import { Link } from "react-router-dom";
import { BarChart3, CalendarPlus, CheckCircle2, ClipboardList, Database, FileSpreadsheet, GraduationCap, Mail, PencilRuler, UsersRound } from "lucide-react";
import Card from "../components/Card";
import PageShell from "../components/PageShell";

const cards = [
  { to: "/aprovacao", icon: CheckCircle2, title: "Aprovar instrutores", desc: "Avaliar solicitações de cadastro enviadas pelos instrutores." },
  { to: "/cadastrar-gestor", icon: UsersRound, title: "Cadastrar gestores", desc: "Adicionar novos gestores ao sistema. Somente gestores podem fazer isso." },
  { to: "/semanas", icon: CalendarPlus, title: "Criar semanas", desc: "Cadastrar as semanas usadas no preenchimento da grade." },
  { to: "/turmas-materias", icon: GraduationCap, title: "Matérias por turma", desc: "Criar matérias, turmas e associar matérias às turmas." },
  { to: "/carga-horaria", icon: BarChart3, title: "Carga horária", desc: "Verificar aulas lançadas, saldos e excedentes da carga horária." },
  { to: "/modificar-horarios", icon: PencilRuler, title: "Modificar horários", desc: "Editar grades, feriados, missões, aulas à disposição e textos livres." },
  { to: "/horarios-por-turma", icon: ClipboardList, title: "Visualizar horários", desc: "Consultar grades por turma e semana." },
  { to: "/horas-aula", icon: BarChart3, title: "Horas/aula", desc: "Acompanhar horas/aula mensais de cada instrutor." },
  { to: "/modificar-horarios", icon: FileSpreadsheet, title: "Exportar grade", desc: "Exportar a grade por turma em PDF ou Excel." },
  { to: "/comunicacoes-gestor", icon: Mail, title: "Comunicações", desc: "Disparar e-mails por matéria e solicitar apoio de outro gestor por período." },
  { to: "/banco-dados", icon: Database, title: "Banco e backup", desc: "Acompanhar uso do banco, fazer backup e esvaziar grades preenchidas." },
];

export default function GestorDashboard({ usuario }) {
  return (
    <PageShell
      title="Painel do Gestor"
      subtitle={`Bem-vindo, ${usuario.nome}. Use os atalhos abaixo para administrar o sistema E-STE.`}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ to, icon: Icon, title, desc }) => (
          <Link key={title} to={to} title={desc}>
            <Card className="h-full transition hover:-translate-y-1 hover:border-blue-500/60 hover:bg-blue-50">
              <Icon className="mb-4 text-blue-700" size={28} />
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

