export default function AuxiliaresInfo({ horario, compacto = false }) {
  const solicitados = Number(horario?.auxiliaresSolicitados || 0);
  const autorizados = Number(horario?.auxiliaresAutorizados || 0);
  const auxiliares = String(horario?.auxiliares || "").trim();

  if (!solicitados && !autorizados && !auxiliares) return null;

  return (
    <div className={`mt-2 rounded-lg bg-white/65 p-2 ${compacto ? "text-[11px]" : "text-xs"}`}>
      <div className="flex flex-wrap gap-1.5">
        {solicitados > 0 && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
            Solicitados: {solicitados}
          </span>
        )}
        {autorizados > 0 && (
          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
            Autorizados: {autorizados}
          </span>
        )}
      </div>
      {auxiliares && (
        <div className="mt-1 leading-snug text-slate-700">
          <b>Auxiliares:</b> {auxiliares}
        </div>
      )}
    </div>
  );
}
