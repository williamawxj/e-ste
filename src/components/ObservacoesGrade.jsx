import { OBSERVACOES_GRADE } from "../utils/observacoesGrade";

export default function ObservacoesGrade() {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-relaxed text-slate-700 shadow-sm">
      {OBSERVACOES_GRADE.map((observacao) => (
        <p key={observacao}>{observacao}</p>
      ))}
    </div>
  );
}
