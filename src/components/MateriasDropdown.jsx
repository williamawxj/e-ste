import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function MateriasDropdown({
  materias = [],
  selecionadas = [],
  onAlternar,
  emptyText = "Nenhuma materia cadastrada.",
  placeholder = "Selecione as materias",
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const materiasSelecionadas = materias.filter((materia) => selecionadas.includes(materia.id));
  const resumo = materiasSelecionadas.slice(0, 2).map((materia) => materia.nome).join(", ");
  const quantidadeExtra = Math.max(materiasSelecionadas.length - 2, 0);

  useEffect(() => {
    function fecharAoClicarFora(event) {
      if (!ref.current || ref.current.contains(event.target)) return;
      setAberto(false);
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  if (materias.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-800 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        onClick={() => setAberto((valor) => !valor)}
      >
        <span className="min-w-0">
          <span className="block font-semibold">
            {materiasSelecionadas.length > 0
              ? `${materiasSelecionadas.length} materia(s) selecionada(s)`
              : placeholder}
          </span>
          {materiasSelecionadas.length > 0 && (
            <span className="block truncate text-xs text-slate-500">
              {resumo}{quantidadeExtra > 0 ? ` +${quantidadeExtra}` : ""}
            </span>
          )}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${aberto ? "rotate-180 text-blue-700" : ""}`} />
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-72 overflow-y-auto">
            {materias.map((materia) => {
              const marcada = selecionadas.includes(materia.id);

              return (
                <label
                  key={materia.id}
                  className={`flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 text-sm transition last:border-0 ${
                    marcada
                      ? "bg-blue-50 text-blue-900"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={marcada}
                    onChange={() => onAlternar?.(materia.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{materia.nome}</span>
                    {materia.cargaHoraria ? (
                      <span className="text-xs text-slate-500">{materia.cargaHoraria}h cadastradas</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
