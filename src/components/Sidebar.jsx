import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ClipboardList,
  Database,
  GraduationCap,
  Home,
  Mail,
  Settings,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";

const linkBase = "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition";
const linkClass = ({ isActive }) => `${linkBase} ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`;

function MenuGroup({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        <span className="flex items-center gap-3">
          <Icon size={18} />
          {title}
        </span>
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-1 space-y-1 pl-3">{children}</div>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-4 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </div>
  );
}

export default function Sidebar({ perfil, visivel = true, onNavigate }) {
  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen w-72 max-w-[86vw] flex-col border-r border-slate-200 bg-white text-slate-900 shadow-sm transition-transform duration-200 md:w-64 md:max-w-none ${visivel ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <div className="rounded-xl bg-blue-50 px-3 py-1 text-2xl font-black tracking-wide text-blue-700">E-STE</div>
        </div>

        <nav
          className="mt-4 space-y-2"
          onClick={(event) => {
            if (event.target?.closest?.("a")) onNavigate?.();
          }}
        >
          <div className="px-3">
            <NavLink to="/" className={linkClass} end>
              <Home size={18} /> Home
            </NavLink>
          </div>

          <MenuGroup icon={UserRound} title="Área do Instrutor" defaultOpen>
            <NavLink to="/preenchimento-horarios" className={linkClass}>Preencher horários</NavLink>
            {perfil !== "gestor" && (
              <NavLink to="/solicitar-modificacao-ste" className={linkClass}><ClipboardList size={16} /> Solicitar modificação STE</NavLink>
            )}
            <NavLink to="/horarios-por-turma" className={linkClass}>Visualizar horários</NavLink>
            <NavLink to="/horas-aula" className={linkClass}><BarChart3 size={16} /> Horas/aula</NavLink>
            <NavLink to="/minhas-materias" className={linkClass}><BookOpenCheck size={16} /> Minhas matérias</NavLink>
            <NavLink to="/perfil" className={linkClass}>Editar perfil</NavLink>
          </MenuGroup>

          {perfil === "gestor" && (
            <MenuGroup icon={Settings} title="Área do Gestor" defaultOpen>
              <SectionLabel>Pessoas</SectionLabel>
              <NavLink to="/aprovacao" className={linkClass}><ClipboardList size={16} /> Aprovar instrutores</NavLink>
              <NavLink to="/cadastrar-instrutor" className={linkClass}><GraduationCap size={16} /> Cadastrar instrutor</NavLink>
              <NavLink to="/editar-instrutores" className={linkClass}><UsersRound size={16} /> Alterar instrutores/gestores</NavLink>
              <NavLink to="/chefia-pastas" className={linkClass}><UsersRound size={16} /> Chefia de pasta</NavLink>
              <NavLink to="/cadastrar-gestor" className={linkClass}><UsersRound size={16} /> Cadastrar gestor</NavLink>

              <SectionLabel>Planejamento</SectionLabel>
              <NavLink to="/semanas" className={linkClass}><CalendarPlus size={16} /> Criar semanas</NavLink>
              <NavLink to="/turmas-materias" className={linkClass}><GraduationCap size={16} /> Matérias por turma</NavLink>

              <SectionLabel>Operação</SectionLabel>
              <NavLink to="/modificar-horarios" className={linkClass}><CalendarDays size={16} /> Modificar horários</NavLink>
              <NavLink to="/auxiliares-pendentes" className={linkClass}><UserPlus size={16} /> Auxiliares pendentes</NavLink>
              <NavLink to="/solicitar-modificacao-ste" className={linkClass}><ClipboardList size={16} /> Solicitações de modificação</NavLink>
              <NavLink to="/carga-horaria" className={linkClass}><BarChart3 size={16} /> Carga horária</NavLink>
              <NavLink to="/comunicacoes-gestor" className={linkClass}><Mail size={16} /> Comunicações</NavLink>
              <NavLink to="/banco-dados" className={linkClass}><Database size={16} /> Banco e backup</NavLink>

              <SectionLabel>Conta</SectionLabel>
              <NavLink to="/editar-perfil-gestor" className={linkClass}>Editar perfil gestor</NavLink>
            </MenuGroup>
          )}
        </nav>
      </div>

      <div className="shrink-0 border-t border-slate-200 p-4 text-xs text-slate-500">
        (c) {new Date().getFullYear()} E-STE
      </div>
    </aside>
  );
}
