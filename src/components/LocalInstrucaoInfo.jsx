export default function LocalInstrucaoInfo({ horario, compacto = false }) {
  const local = String(horario?.localInstrucao || "").trim();
  if (!local) return null;

  return (
    <div className={`mt-2 rounded-lg bg-white/65 p-2 leading-snug text-slate-700 ${compacto ? "text-[11px]" : "text-xs"}`}>
      <b>Local:</b> {local}
    </div>
  );
}
