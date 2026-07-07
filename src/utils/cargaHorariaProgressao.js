const DIA_ORDEM = {
  segunda: 0,
  terca: 1,
  quarta: 2,
  quinta: 3,
  sexta: 4,
};

const SEMANA_DESCONHECIDA = Number.MAX_SAFE_INTEGER;

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function chaveMateriaPorNome(nome) {
  const normalizado = normalizarTexto(nome);
  return normalizado ? `nome:${normalizado}` : "";
}

function chaveMateriaHorario(horario) {
  if (!horario || horario.tipo !== "aula") return "";
  if (horario.materiaId) return horario.materiaId;
  return chaveMateriaPorNome(horario.materiaNome);
}

function timestampSemana(inicio) {
  const valor = String(inicio || "");
  const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return SEMANA_DESCONHECIDA;

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
}

function ordemDia(dia) {
  const chave = normalizarTexto(dia);
  return Object.prototype.hasOwnProperty.call(DIA_ORDEM, chave)
    ? DIA_ORDEM[chave]
    : 99;
}

function ordenarAulas(a, b, semanasPorId) {
  const semanaA = semanasPorId.get(a.semanaId) ?? SEMANA_DESCONHECIDA;
  const semanaB = semanasPorId.get(b.semanaId) ?? SEMANA_DESCONHECIDA;
  if (semanaA !== semanaB) return semanaA - semanaB;

  const diaA = ordemDia(a.dia);
  const diaB = ordemDia(b.dia);
  if (diaA !== diaB) return diaA - diaB;

  const inicioA = String(a.inicio || "");
  const inicioB = String(b.inicio || "");
  if (inicioA !== inicioB) return inicioA.localeCompare(inicioB, "pt-BR");

  const fimA = String(a.fim || "");
  const fimB = String(b.fim || "");
  if (fimA !== fimB) return fimA.localeCompare(fimB, "pt-BR");

  return String(a.id || "").localeCompare(String(b.id || ""), "pt-BR");
}

export function calcularCargasMaterias(materias = [], horarios = [], semanas = []) {
  const semanasPorId = new Map(
    (semanas || []).map((semana) => [semana.id, timestampSemana(semana.inicio)]),
  );
  const aulasPorMateria = new Map();

  horarios.forEach((horario) => {
    const chave = chaveMateriaHorario(horario);
    if (!chave) return;
    if (!aulasPorMateria.has(chave)) aulasPorMateria.set(chave, []);
    aulasPorMateria.get(chave).push(horario);
  });

  return materias.reduce((mapa, materia) => {
    const cargaHoraria = Number(materia.cargaHoraria || 0);
    const chavePorNome = chaveMateriaPorNome(materia.nome);
    const listaAulas = aulasPorMateria.get(materia.id)
      ?? aulasPorMateria.get(chavePorNome)
      ?? [];
    const aulasOrdenadas = [...listaAulas].sort((a, b) => ordenarAulas(a, b, semanasPorId));
    let progressoAtual = 0;
    aulasOrdenadas.forEach((aula) => {
      const manual = Number.parseInt(aula.aulaCorrente, 10);
      const atual = Number.isFinite(manual) && manual > 0
        ? manual
        : (progressoAtual + 1);
      progressoAtual = atual;
    });

    mapa[materia.id] = {
      materiaId: materia.id,
      materiaNome: materia.nome,
      cargaHoraria,
      aulasLancadas: progressoAtual,
      saldo: cargaHoraria - progressoAtual,
    };
    return mapa;
  }, {});
}

export function criarMapaCargaAulasPorHorario({ horarios = [], materias = [], semanas = [] }) {
  const cargaHorariaPorMateria = new Map();
  materias.forEach((materia) => {
    const cargaHoraria = Number(materia.cargaHoraria || 0);
    if (materia.id && !cargaHorariaPorMateria.has(materia.id)) {
      cargaHorariaPorMateria.set(materia.id, cargaHoraria);
    }

    const chavePorNome = chaveMateriaPorNome(materia.nome);
    if (chavePorNome && !cargaHorariaPorMateria.has(chavePorNome)) {
      cargaHorariaPorMateria.set(chavePorNome, cargaHoraria);
    }
  });

  const semanasPorId = new Map(
    (semanas || []).map((semana) => [semana.id, timestampSemana(semana.inicio)]),
  );

  const aulasPorMateria = new Map();
  horarios.forEach((horario) => {
    const chave = chaveMateriaHorario(horario);
    if (!chave) return;

    if (!aulasPorMateria.has(chave)) aulasPorMateria.set(chave, []);
    aulasPorMateria.get(chave).push(horario);
  });

  const mapa = {};
  aulasPorMateria.forEach((listaAulas, chave) => {
    const aulasOrdenadas = [...listaAulas].sort((a, b) => ordenarAulas(a, b, semanasPorId));
    const chavePorNome = chaveMateriaPorNome(aulasOrdenadas[0]?.materiaNome);
    const total = cargaHorariaPorMateria.get(chave)
      ?? cargaHorariaPorMateria.get(chavePorNome)
      ?? 0;
    let sequencial = 0;

    aulasOrdenadas.forEach((aula) => {
      if (!aula?.id) return;
      const manual = Number.parseInt(aula.aulaCorrente, 10);
      const atual = Number.isFinite(manual) && manual > 0
        ? manual
        : (sequencial + 1);
      sequencial = atual;
      mapa[aula.id] = {
        atual,
        total,
        texto: `${atual}(${total})`,
      };
    });
  });

  return mapa;
}

export function getIndicadorCargaHorario(horario, mapaCargas = {}) {
  if (!horario || horario.tipo !== "aula") return "";
  const carga = mapaCargas?.[horario.id];
  if (!carga) return "";
  if (carga.texto) return carga.texto;

  const atual = Number(carga.atual || 0);
  const total = Number(carga.total || 0);
  return `${atual}(${total})`;
}

export function montarTituloHorarioComCarga(horario, mapaCargas = {}) {
  const base = horario?.texto || horario?.materiaNome || horario?.tipo || "";
  if (!base) return "";
  if (!horario || horario.tipo !== "aula" || horario.texto) return base;

  const indicador = getIndicadorCargaHorario(horario, mapaCargas);
  return indicador ? `${base} ${indicador}` : base;
}
