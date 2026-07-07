export default function ProvaInfo({ horario }) {
  if (!horario?.prova) return null;

  return (
    <span className="mt-2 flex w-fit rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase text-red-700">
      Prova
    </span>
  );
}
