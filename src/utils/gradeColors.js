const PALETA_MATERIAS = [
  { bg: "#dbeafe", border: "#60a5fa", text: "#1e3a8a" },
  { bg: "#dcfce7", border: "#4ade80", text: "#14532d" },
  { bg: "#fef3c7", border: "#fbbf24", text: "#78350f" },
  { bg: "#fce7f3", border: "#f472b6", text: "#831843" },
  { bg: "#ede9fe", border: "#a78bfa", text: "#4c1d95" },
  { bg: "#ccfbf1", border: "#2dd4bf", text: "#134e4a" },
  { bg: "#ffedd5", border: "#fb923c", text: "#7c2d12" },
  { bg: "#e0e7ff", border: "#818cf8", text: "#312e81" },
  { bg: "#d9f99d", border: "#84cc16", text: "#365314" },
  { bg: "#fee2e2", border: "#f87171", text: "#7f1d1d" },
];

const COR_ESPECIAL = { bg: "#f1f5f9", border: "#94a3b8", text: "#334155" };
const COR_FERIADO = { bg: "#fee2e2", border: "#ef4444", text: "#7f1d1d" };
const COR_MISSAO = { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" };
const COR_DISPOSICAO = { bg: "#e0f2fe", border: "#38bdf8", text: "#075985" };

function hashTexto(valor) {
  return String(valor || "").split("").reduce((hash, char) => {
    const proximo = (hash << 5) - hash + char.charCodeAt(0);
    return proximo | 0;
  }, 0);
}

function corEspecial(item) {
  const texto = String(item?.texto || item?.tipo || "").toUpperCase();
  if (texto.includes("FERIADO")) return COR_FERIADO;
  if (texto.includes("MISSAO") || texto.includes("MISSÃO")) return COR_MISSAO;
  if (texto.includes("DISPOSICAO") || texto.includes("DISPOSIÇÃO")) return COR_DISPOSICAO;
  return COR_ESPECIAL;
}

export function getCorHorario(item) {
  if (!item) return COR_ESPECIAL;
  if (item.texto || (item.tipo && item.tipo !== "aula")) return corEspecial(item);

  const chave = item.materiaId || item.materiaNome || item.tipo || "";
  const indice = Math.abs(hashTexto(chave)) % PALETA_MATERIAS.length;
  return PALETA_MATERIAS[indice];
}

export function getEstiloHorario(item) {
  const cor = getCorHorario(item);
  return {
    backgroundColor: cor.bg,
    borderColor: "#000000",
    color: cor.text,
  };
}
