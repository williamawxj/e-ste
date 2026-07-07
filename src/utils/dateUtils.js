export function formatarDataBR(valor) {
  if (!valor) return "";

  if (typeof valor === "string") {
    const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

export function formatarPeriodoBR(inicio, fim) {
  const inicioFormatado = formatarDataBR(inicio);
  const fimFormatado = formatarDataBR(fim);
  if (!inicioFormatado && !fimFormatado) return "";
  if (!fimFormatado) return inicioFormatado;
  if (!inicioFormatado) return fimFormatado;
  return `${inicioFormatado} a ${fimFormatado}`;
}

export function dataComOffset(inicio, offset) {
  if (!inicio) return "";
  const match = String(inicio).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const data = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + offset));
  return data.toISOString().slice(0, 10);
}

export function getMesAtualInput() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

export function formatarMesAnoBR(mes) {
  const match = String(mes || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return mes || "";
  return `${match[2]}/${match[1]}`;
}

export function extrairMesInput(valorData) {
  if (!valorData) return "";
  const texto = String(valorData);
  const match = texto.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;

  const data = valorData instanceof Date ? valorData : new Date(valorData);
  if (Number.isNaN(data.getTime())) return "";
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function listarMesesDasSemanas(semanas = []) {
  const meses = Array.from(
    new Set((semanas || []).map((semana) => extrairMesInput(semana?.inicio)).filter(Boolean))
  ).sort();

  return meses.map((mes) => ({
    valor: mes,
    rotulo: formatarMesAnoBR(mes),
  }));
}

export function filtrarSemanasPorMes(semanas = [], mes = "") {
  if (!mes) return semanas || [];
  return (semanas || []).filter((semana) => extrairMesInput(semana?.inicio) === mes);
}
