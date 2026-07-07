import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import caebmBrasaoUrl from "../assets/caebm-brasao.png";
import goiasBrasaoUrl from "../assets/goias-brasao.png";
import { DIAS_SEMANA, SLOTS_AULA } from "./academicoDB";
import { getIndicadorCargaHorario } from "./cargaHorariaProgressao";
import { formatarDataBR, formatarPeriodoBR } from "./dateUtils";
import { getCorHorario } from "./gradeColors";

const imageDataCache = new Map();

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function carregarImagemPdf(url) {
  if (imageDataCache.has(url)) return imageDataCache.get(url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar a imagem do cabecalho: ${url}`);
  }

  const dataUrl = await blobToDataUrl(await response.blob());
  imageDataCache.set(url, dataUrl);
  return dataUrl;
}

async function carregarBrasoesPdf() {
  try {
    const [caebm, goias] = await Promise.all([
      carregarImagemPdf(caebmBrasaoUrl),
      carregarImagemPdf(goiasBrasaoUrl),
    ]);
    return { caebm, goias };
  } catch (error) {
    console.error(error);
    return { caebm: null, goias: null };
  }
}

function hexParaRgb(cor) {
  const normalizada = String(cor || "#ffffff").replace("#", "");
  return [
    Number.parseInt(normalizada.slice(0, 2), 16),
    Number.parseInt(normalizada.slice(2, 4), 16),
    Number.parseInt(normalizada.slice(4, 6), 16),
  ];
}

function desenharFundoDocumento(doc) {
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  doc.setFillColor(236, 236, 236);
  doc.rect(0, 0, largura, altura, "F");
}

function estiloCelulaHorarioPdf(item, extra = {}) {
  if (!item) return extra;
  const cor = getCorHorario(item);
  return {
    fillColor: hexParaRgb(cor.bg),
    textColor: [0, 0, 0],
    lineColor: [0, 0, 0],
    ...extra,
  };
}

function buscarHorario(horarios, dia, inicio) {
  return horarios.find((horario) => horario.dia === dia && horario.inicio === inicio);
}

function textoMateriaComCarga(item, cargaAulasPorHorario = {}) {
  if (!item || item.tipo !== "aula" || item.texto) {
    return item?.texto || item?.materiaNome || "";
  }

  const indicador = getIndicadorCargaHorario(item, cargaAulasPorHorario);
  if (!indicador) return item.materiaNome || "";
  return `${item.materiaNome || ""} ${indicador}`.trim();
}

function textoMateriaInstrutor(item, cargaAulasPorHorario = {}) {
  const materia = textoMateriaComCarga(item, cargaAulasPorHorario);
  const instrutor = item?.instrutorNome || "";
  if (!materia) return instrutor;
  if (!instrutor) return materia;
  return `${materia} - ${instrutor}`;
}

function desenharFallbackBrasao(doc, x, y, w, h, texto) {
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.7);
  doc.text(texto, x + (w / 2), y + (h / 2) + 1.5, { align: "center" });
}

async function desenharCabecalhoInstitucional(doc, { titulo, linhas = [], compacto = false }) {
  const largura = doc.internal.pageSize.getWidth();
  const centro = largura / 2;
  const { caebm, goias } = await carregarBrasoesPdf();
  const cfg = compacto
    ? {
      caebmY: 4.5,
      caebmW: 15.5,
      caebmH: 16.6,
      fallbackCaebmX: 12,
      fallbackCaebmY: 4.8,
      fallbackCaebmW: 14,
      fallbackCaebmH: 15.8,
      topoFonte: 7.4,
      topoY1: 7.6,
      topoY2: 11.8,
      topoY3: 16.0,
      goiasTextoFonte: 4.8,
      goiasTextoY: 10.8,
      divisorY1: 5.4,
      divisorY2: 20,
      goiasX: largura - 24.4,
      goiasY: 5.0,
      goiasW: 10.3,
      goiasH: 13.7,
      fallbackGoiasX: largura - 24.4,
      fallbackGoiasY: 5.0,
      fallbackGoiasW: 10.3,
      fallbackGoiasH: 13.7,
      tituloFonte: 6.7,
      tituloY: 24.2,
      linhaFonte: 6.2,
      linhaYBase: 27.8,
      linhaYPasso: 3.8,
      retornoExtra: 3.2,
    }
    : {
      caebmY: 5,
      caebmW: 17,
      caebmH: 18.2,
      fallbackCaebmX: 12,
      fallbackCaebmY: 5.5,
      fallbackCaebmW: 15,
      fallbackCaebmH: 17,
      topoFonte: 8.2,
      topoY1: 8.5,
      topoY2: 13.2,
      topoY3: 17.9,
      goiasTextoFonte: 5.2,
      goiasTextoY: 11.8,
      divisorY1: 6,
      divisorY2: 22,
      goiasX: largura - 24.5,
      goiasY: 5.5,
      goiasW: 11,
      goiasH: 14.7,
      fallbackGoiasX: largura - 24.5,
      fallbackGoiasY: 5.5,
      fallbackGoiasW: 11,
      fallbackGoiasH: 14.7,
      tituloFonte: 7.3,
      tituloY: 28,
      linhaFonte: 6.9,
      linhaYBase: 32.4,
      linhaYPasso: 4.2,
      retornoExtra: 4,
    };

  if (caebm) {
    doc.addImage(caebm, "PNG", 11, cfg.caebmY, cfg.caebmW, cfg.caebmH);
  } else {
    desenharFallbackBrasao(doc, cfg.fallbackCaebmX, cfg.fallbackCaebmY, cfg.fallbackCaebmW, cfg.fallbackCaebmH, "CAEBM");
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(cfg.topoFonte);
  doc.text("SECRETARIA DA SEGURANCA PUBLICA", centro, cfg.topoY1, { align: "center" });
  doc.text("CORPO DE BOMBEIROS MILITAR", centro, cfg.topoY2, { align: "center" });
  doc.text("COMANDO DA ACADEMIA E ENSINO BOMBEIRO MILITAR", centro, cfg.topoY3, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(cfg.goiasTextoFonte);
  doc.text(["Corpo de", "Bombeiros", "Militar"], largura - 40, cfg.goiasTextoY, { align: "center", lineHeightFactor: 0.95 });
  doc.setDrawColor(80, 190, 100);
  doc.setLineWidth(0.25);
  doc.line(largura - 29.5, cfg.divisorY1, largura - 29.5, cfg.divisorY2);

  if (goias) {
    doc.addImage(goias, "PNG", cfg.goiasX, cfg.goiasY, cfg.goiasW, cfg.goiasH);
  } else {
    desenharFallbackBrasao(doc, cfg.fallbackGoiasX, cfg.fallbackGoiasY, cfg.fallbackGoiasW, cfg.fallbackGoiasH, "GO");
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.tituloFonte);
  if (titulo) doc.text(titulo, centro, cfg.tituloY, { align: "center" });
  doc.setFontSize(cfg.linhaFonte);
  linhas.forEach((linha, index) => {
    doc.text(linha, centro, cfg.linhaYBase + (index * cfg.linhaYPasso), { align: "center" });
  });

  return (linhas.length ? cfg.linhaYBase + ((linhas.length - 1) * cfg.linhaYPasso) : cfg.tituloY) + cfg.retornoExtra;
}

export function montarTabelaGrade(horarios, { cargaAulasPorHorario = {} } = {}) {
  return SLOTS_AULA.map((slot) => {
    const rotuloIntervalo = slot.rotulo || "Intervalo";
    const linha = { Horário: slot.intervalo ? rotuloIntervalo : `${slot.inicio} - ${slot.fim}` };
    DIAS_SEMANA.forEach((dia) => {
      const item = horarios.find((h) => h.dia === dia && h.inicio === slot.inicio);
      const local = item?.localInstrucao ? `\nLocal: ${item.localInstrucao}` : "";
      const prova = item?.prova ? "\nPROVA" : "";
      linha[dia] = slot.intervalo ? rotuloIntervalo : item ? item.texto || `${textoMateriaInstrutor(item, cargaAulasPorHorario)}${prova}${local}` : "";
    });
    return linha;
  });
}

function escaparCsv(valor) {
  return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

function baixarArquivoTexto({ conteudo, nomeArquivo, tipo }) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function nomeArquivoCsv(nomeArquivo) {
  const nome = String(nomeArquivo || "grade-horarios.csv").trim() || "grade-horarios.csv";
  if (/\.(xlsx|xls)$/i.test(nome)) return nome.replace(/\.(xlsx|xls)$/i, ".csv");
  if (/\.csv$/i.test(nome)) return nome;
  return `${nome}.csv`;
}

export function exportarGradeExcel({ horarios, nomeArquivo = "grade-horarios.csv", cargaAulasPorHorario = {} }) {
  const dados = montarTabelaGrade(horarios, { cargaAulasPorHorario });
  const colunas = ["Horário", ...DIAS_SEMANA];
  const linhas = [
    colunas,
    ...dados.map((linha) => colunas.map((coluna) => linha[coluna] ?? "")),
  ];
  const csv = `\uFEFF${linhas.map((linha) => linha.map(escaparCsv).join(";")).join("\r\n")}`;
  baixarArquivoTexto({
    conteudo: csv,
    nomeArquivo: nomeArquivoCsv(nomeArquivo),
    tipo: "text/csv;charset=utf-8",
  });
}

function textoLocalPdf(item) {
  const local = String(item?.localInstrucao || "").trim();
  return local ? local.toUpperCase() : "";
}

function textoHorarioGradePrincipal(item, cargaAulasPorHorario = {}) {
  if (!item) return "";
  const prova = item.prova ? " | PROVA" : "";
  return item.texto || `${textoMateriaInstrutor(item, cargaAulasPorHorario)}${prova}`;
}

function textoHorarioGrade(item, cargaAulasPorHorario = {}) {
  if (!item) return "";
  return [textoHorarioGradePrincipal(item, cargaAulasPorHorario), textoLocalPdf(item)].filter(Boolean).join("\n");
}

function montarCelulaHorarioPdf(item, textoPrincipal, extraStyles = {}) {
  const textoLocal = textoLocalPdf(item);
  return {
    content: [textoPrincipal, textoLocal].filter(Boolean).join("\n"),
    styles: estiloCelulaHorarioPdf(item, extraStyles),
    horarioItem: item,
    textoPrincipal,
    textoLocal,
  };
}

function desenharCelulaHorarioComLocal(doc, data) {
  const raw = data.cell.raw || {};
  if (!raw.textoLocal) return;

  const cell = data.cell;
  const styles = cell.styles || {};
  const fontSize = Number(styles.fontSize || 6);
  const padding = typeof styles.cellPadding === "number" ? styles.cellPadding : 0.8;
  const lineHeight = Math.max(1.45, fontSize * 0.36 * 1.14);
  const larguraTexto = Math.max(4, cell.width - (padding * 2));
  const centroX = cell.x + (cell.width / 2);

  const linhasPrincipais = String(raw.textoPrincipal || "")
    .split("\n")
    .flatMap((linha) => doc.splitTextToSize(linha, larguraTexto));
  const linhasLocal = doc.splitTextToSize(String(raw.textoLocal || ""), larguraTexto);
  const maxLinhas = Math.max(2, Math.floor((cell.height - (padding * 2)) / lineHeight));
  const maxPrincipais = Math.max(1, maxLinhas - linhasLocal.length);
  const linhasVisiveis = linhasPrincipais.slice(0, maxPrincipais);
  const todasLinhas = [...linhasVisiveis, ...linhasLocal];
  const alturaTexto = todasLinhas.length * lineHeight;
  const primeiraLinhaY = cell.y + Math.max(padding + (fontSize * 0.18), ((cell.height - alturaTexto) / 2) + (fontSize * 0.27));

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  linhasVisiveis.forEach((linha, index) => {
    doc.text(linha, centroX, primeiraLinhaY + (index * lineHeight), { align: "center", maxWidth: larguraTexto });
  });

  doc.setTextColor(220, 0, 0);
  doc.setFont("helvetica", "bold");
  linhasLocal.forEach((linha, index) => {
    doc.text(linha, centroX, primeiraLinhaY + ((linhasVisiveis.length + index) * lineHeight), { align: "center", maxWidth: larguraTexto });
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
}

export async function exportarGradePDF({
  horarios,
  titulo = "Grade de Horários",
  nomeArquivo = "grade-horarios.pdf",
  cargaAulasPorHorario = {},
  assinaturaTexto = "",
  usuario = null,
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  desenharFundoDocumento(doc);
  const geradoEm = new Date();
  const colunas = ["Horário", ...DIAS_SEMANA];
  const inicioTabela = await desenharCabecalhoInstitucional(doc, { titulo });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina = doc.internal.pageSize.getHeight();
  const nomeAssinante = extrairNomeAssinante(assinaturaTexto, String(usuario?.nome || "Gestor Master").trim());
  const codigoAssinatura = codigoAssinaturaGrade({
    titulo,
    horarios,
    usuario: usuario || { nome: nomeAssinante },
    geradoEm,
  });
  const observacoes = [
    "Obs.1: O DIA TURMA É RESPONSÁVEL POR VERIFICAR COM OS INSTRUTORES E A SETEB OS RECURSOS NECESSÁRIOS ÀS INSTRUÇÕES.",
    "Obs.2: O DIA TURMA É RESPONSÁVEL POR CONFERIR NO DIA ANTERIOR O HORÁRIO DE DESLOCAMENTO E O MATERIAL PARA INSTRUÇÃO FORA DA UNIDADE.",
  ];
  const espacoLinhaObs = 3.45;
  const alturaBlocoObs = 4.3 + (observacoes.length * espacoLinhaObs);
  const porDelegacao = true;
  const alturaAssinatura = porDelegacao ? 22.8 : 19.8;
  const margemLateral = 6;
  const margemInferior = Math.max(24, alturaBlocoObs + alturaAssinatura + 4.2);
  const totalLinhasAula = SLOTS_AULA.filter((slot) => !slot.intervalo).length;
  const totalLinhasIntervalo = SLOTS_AULA.length - totalLinhasAula;
  const alturaDisponivel = Math.max(60, alturaPagina - inicioTabela - margemInferior);
  const alturaCabecalhoDias = 6.2;
  const alturaLinhaIntervalo = 5.35;
  const alturaLinhaAulaCalculada = (
    alturaDisponivel - alturaCabecalhoDias - (totalLinhasIntervalo * alturaLinhaIntervalo)
  ) / Math.max(1, totalLinhasAula);
  const alturaLinhaAlvo = Math.max(10.8, Math.min(12.1, alturaLinhaAulaCalculada));
  const fonteCorpo = Math.max(7.4, Math.min(8.3, alturaLinhaAlvo * 0.68));
  const fonteCabecalho = Math.max(fonteCorpo + 0.2, 7.7);
  const paddingCelula = Math.max(0.95, Math.min(1.35, alturaLinhaAlvo * 0.11));
  const paddingCabecalhoDias = Math.max(0.35, Math.min(0.62, paddingCelula * 0.5));
  const larguraUtil = larguraPagina - (margemLateral * 2);
  const larguraColHorario = 38;
  const larguraColDia = (larguraUtil - larguraColHorario) / DIAS_SEMANA.length;
  const fonteLinhaIntervalo = Math.max(6.1, fonteCorpo - 0.45);
  const paddingLinhaIntervalo = Math.max(0.35, paddingCelula * 0.52);
  const corpo = SLOTS_AULA.map((slot) => {
    const horario = `${slot.inicio} - ${slot.fim}`;

    if (slot.intervalo) {
      const rotuloIntervalo = slot.rotulo || "Intervalo";
      const estiloIntervalo = {
        halign: "center",
        fillColor: [207, 207, 207],
        textColor: [0, 0, 0],
        minCellHeight: alturaLinhaIntervalo,
        fontSize: fonteLinhaIntervalo,
        cellPadding: paddingLinhaIntervalo,
      };
      return [
        { content: rotuloIntervalo, styles: { ...estiloIntervalo, fontStyle: "bold" } },
        ...DIAS_SEMANA.map(() => ({ content: rotuloIntervalo, styles: { ...estiloIntervalo } })),
      ];
    }

    return [
      { content: horario, styles: { fontStyle: "bold", halign: "center" } },
      ...DIAS_SEMANA.map((dia) => {
        const item = buscarHorario(horarios, dia, slot.inicio);
        return montarCelulaHorarioPdf(item, textoHorarioGradePrincipal(item, cargaAulasPorHorario));
      }),
    ];
  });

  autoTable(doc, {
    head: [colunas],
    body: corpo,
    startY: inicioTabela,
    theme: "grid",
    tableWidth: larguraUtil,
    margin: { left: margemLateral, right: margemLateral, bottom: margemInferior },
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: fonteCorpo,
      cellPadding: paddingCelula,
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      minCellHeight: alturaLinhaAlvo,
      overflow: "ellipsize",
      halign: "center",
    },
    headStyles: {
      fillColor: [190, 190, 190],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      minCellHeight: alturaCabecalhoDias,
      fontSize: fonteCabecalho,
      cellPadding: paddingCabecalhoDias,
    },
    columnStyles: {
      0: { cellWidth: larguraColHorario, halign: "center" },
      1: { cellWidth: larguraColDia, halign: "center" },
      2: { cellWidth: larguraColDia, halign: "center" },
      3: { cellWidth: larguraColDia, halign: "center" },
      4: { cellWidth: larguraColDia, halign: "center" },
      5: { cellWidth: larguraColDia, halign: "center" },
    },
    willDrawCell: (data) => {
      if (data.section === "body" && data.cell.raw?.textoLocal) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.cell.raw?.textoLocal) {
        desenharCelulaHorarioComLocal(doc, data);
      }
    },
  });

  const assinaturaY = alturaPagina - alturaAssinatura - 2.2;
  const obsY = Math.min(doc.lastAutoTable?.finalY + 2 || 170, assinaturaY - alturaBlocoObs - 1.5);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.15);
  observacoes.forEach((observacao, index) => {
    doc.text(observacao, 8, obsY + (index * espacoLinhaObs));
  });

  desenharAssinaturaDigitalBox(doc, {
    nome: nomeAssinante,
    porDelegacao,
    codigo: codigoAssinatura,
    geradoEm,
    y: assinaturaY,
  });
  doc.save(nomeArquivo);
}

const DIAS_QTS = [
  { dia: "Segunda", nome: "SEGUNDA-FEIRA", offset: 0 },
  { dia: "Terca", nome: "TERÇA-FEIRA", offset: 1 },
  { dia: "Quarta", nome: "QUARTA-FEIRA", offset: 2 },
  { dia: "Quinta", nome: "QUINTA-FEIRA", offset: 3 },
  { dia: "Sexta", nome: "SEXTA-FEIRA", offset: 4 },
];

const SLOTS_QTS = [
  { label: "1ª AULA", inicio: "08:00", fim: "08:45" },
  { label: "2ª AULA", inicio: "08:45", fim: "09:30" },
  { label: "3ª AULA", inicio: "09:30", fim: "10:15" },
  { label: "INTERVALO", inicio: "10:15", fim: "10:30", intervalo: true },
  { label: "4ª AULA", inicio: "10:30", fim: "11:15" },
  { label: "5ª AULA", inicio: "11:15", fim: "12:00" },
  { label: "ALMOÇO", inicio: "12:00", fim: "14:00", intervalo: true },
  { label: "6ª AULA", inicio: "14:00", fim: "14:45" },
  { label: "7ª AULA", inicio: "14:45", fim: "15:30" },
  { label: "INTERVALO", inicio: "15:30", fim: "15:45", intervalo: true },
  { label: "8ª AULA", inicio: "15:45", fim: "16:30" },
  { label: "9ª AULA", inicio: "16:30", fim: "17:15" },
  { label: "10ª AULA", inicio: "17:15", fim: "18:00" },
];

function dataComOffset(inicio, offset) {
  if (!inicio) return "";
  const match = String(inicio).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const data = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + offset));
  return data.toISOString().slice(0, 10);
}

function textoHorarioQtsPrincipal(item, cargaAulasPorHorario = {}) {
  if (!item) return "";
  if (item.texto) return item.texto;
  if (item.tipo && item.tipo !== "aula") return item.tipo;
  const prova = item.prova ? "PROVA" : "";
  const detalhes = [item.instrutorNome, prova].filter(Boolean).join(" | ").slice(0, 84);
  return [textoMateriaComCarga(item, cargaAulasPorHorario), detalhes].filter(Boolean).join("\n");
}

function textoHorarioQts(item, cargaAulasPorHorario = {}) {
  if (!item) return "";
  return [textoHorarioQtsPrincipal(item, cargaAulasPorHorario), textoLocalPdf(item)].filter(Boolean).join("\n");
}

function nomeArquivoSeguro(valor) {
  return String(valor || "qts")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function formatarDataHoraBR(data) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function extrairNomeAssinante(assinaturaTexto, fallback = "Gestor Master") {
  const texto = String(assinaturaTexto || "").trim();
  if (!texto) return fallback;
  const [nome] = texto.split(" - ");
  return String(nome || "").trim() || fallback;
}

function codigoAssinaturaGrade({ titulo, horarios, usuario, geradoEm }) {
  const base = JSON.stringify({
    titulo: String(titulo || ""),
    geradoEm: geradoEm.toISOString(),
    usuario: usuario?.id || usuario?.nome || "",
    horarios: horarios.map((item) => ({
      dia: item.dia,
      inicio: item.inicio,
      fim: item.fim,
      materia: item.materiaNome,
      instrutor: item.instrutorNome,
      texto: item.texto,
      local: item.localInstrucao,
      prova: Boolean(item.prova),
      tipo: item.tipo,
    })),
  });

  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `E-STE-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function desenharAssinaturaDigitalBox(doc, {
  nome = "Gestor Master",
  porDelegacao = false,
  codigo = "",
  geradoEm = new Date(),
  y = 0,
}) {
  const largura = doc.internal.pageSize.getWidth();
  const boxX = 9;
  const boxW = largura - 18;
  const boxH = porDelegacao ? 20 : 17;

  doc.setDrawColor(95, 120, 155);
  doc.setLineWidth(0.35);
  doc.setFillColor(236, 238, 242);
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "FD");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("ASSINATURA DIGITAL", largura / 2, y + 4.7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  doc.text(`Confirmado digitalmente por: ${nome}`, largura / 2, y + 9.4, { align: "center" });
  if (porDelegacao) {
    doc.text("por delegação do chefe da STE.", largura / 2, y + 13.3, { align: "center" });
  }

  doc.setFontSize(6.9);
  doc.text(`Data e hora: ${formatarDataHoraBR(geradoEm)}    Codigo de verificacao: ${codigo}`, largura / 2, y + (porDelegacao ? 17.2 : 14.1), { align: "center" });
}

function codigoAssinaturaQts({ turma, semana, horarios, usuario, geradoEm }) {
  const base = JSON.stringify({
    turma: turma?.id || turma?.nome || "",
    semana: semana?.id || semana?.nome || "",
    geradoEm: geradoEm.toISOString(),
    usuario: usuario?.id || usuario?.nome || "",
    horarios: horarios.map((item) => ({
      dia: item.dia,
      inicio: item.inicio,
      fim: item.fim,
      materia: item.materiaNome,
      instrutor: item.instrutorNome,
      texto: item.texto,
      local: item.localInstrucao,
      prova: Boolean(item.prova),
      tipo: item.tipo,
    })),
  });

  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `E-STE-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

async function desenharCabecalhoQts(doc, { turma, semana }) {
  return desenharCabecalhoInstitucional(doc, {
    titulo: `QTS ${turma?.nome || "TURMA"}`,
    linhas: [
      `${semana?.nome || "SEMANA"} - ${formatarPeriodoBR(semana?.inicio, semana?.fim)}`,
      "QUADRO DE TRABALHO SEMANAL",
    ],
    compacto: true,
  });
}

export async function exportarQtsPDF({ horarios, turma, semana, usuario, nomeArquivo, cargaAulasPorHorario = {} }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  desenharFundoDocumento(doc);
  const geradoEm = new Date();
  const codigo = codigoAssinaturaQts({ turma, semana, horarios, usuario, geradoEm });
  const arquivo = nomeArquivo || `qts-${nomeArquivoSeguro(turma?.nome)}-${nomeArquivoSeguro(semana?.nome)}.pdf`;

  doc.setProperties({
    title: `QTS ${turma?.nome || ""} ${semana?.nome || ""}`.trim(),
    subject: "Quadro de Trabalho Semanal",
    creator: "E-STE",
  });

  const inicioTabela = await desenharCabecalhoQts(doc, { turma, semana });
  const alturaPagina = doc.internal.pageSize.getHeight();
  const porDelegacao = true;
  const alturaAssinatura = porDelegacao ? 22.8 : 19.8;
  const observacoes = [
    "Obs.1: O DIA TURMA É RESPONSÁVEL POR VERIFICAR COM OS INSTRUTORES E A SETEB OS RECURSOS NECESSÁRIOS ÀS INSTRUÇÕES.",
    "Obs.2: O DIA TURMA É RESPONSÁVEL POR CONFERIR NO DIA ANTERIOR O HORÁRIO DE DESLOCAMENTO E O MATERIAL PARA INSTRUÇÃO FORA DA UNIDADE.",
  ];
  const espacoLinhaObs = 3.45;
  const alturaBlocoObs = 4.2 + (observacoes.length * espacoLinhaObs);
  const assinaturaY = alturaPagina - alturaAssinatura - 2.2;
  const obsY = Math.max(inicioTabela + 4, assinaturaY - alturaBlocoObs - 1.2);
  const margemInferiorTabela = Math.max(24, alturaPagina - (obsY - 1.8));
  const alturaDisponivelTabelaQts = Math.max(52, obsY - inicioTabela - 2.2);
  const totalLinhasAulaQts = SLOTS_QTS.filter((slot) => !slot.intervalo).length;
  const totalLinhasIntervaloQts = SLOTS_QTS.length - totalLinhasAulaQts;
  const alturaCabecalhoDiasQts = 4.9;
  const alturaLinhaIntervaloQts = 4.15;
  const alturaLinhaAulaQtsCalculada = (
    alturaDisponivelTabelaQts - alturaCabecalhoDiasQts - (totalLinhasIntervaloQts * alturaLinhaIntervaloQts)
  ) / Math.max(1, totalLinhasAulaQts);
  const alturaLinhaBaseQts = Math.max(7.2, Math.min(10.4, alturaLinhaAulaQtsCalculada));
  const fonteBaseQts = Math.max(4.35, Math.min(4.65, alturaLinhaBaseQts * 0.52));
  const paddingBaseQts = Math.max(0.35, Math.min(0.52, alturaLinhaBaseQts * 0.055));
  const paddingCabecalhoDiasQts = Math.max(0.25, Math.min(0.4, paddingBaseQts * 0.68));

  const cabecalho = [
    "AULA",
    "HORÁRIO",
    ...DIAS_QTS.map((dia) => `${formatarDataBR(dataComOffset(semana?.inicio, dia.offset))}\n${dia.nome}`),
  ];
  const fonteLinhaIntervaloQts = Math.max(4.35, fonteBaseQts - 0.15);
  const paddingLinhaIntervaloQts = Math.max(0.24, paddingBaseQts * 0.58);

  const corpo = SLOTS_QTS.map((slot) => {
    if (slot.intervalo) {
      const estiloIntervaloQts = {
        halign: "center",
        fillColor: [207, 207, 207],
        textColor: [0, 0, 0],
        minCellHeight: alturaLinhaIntervaloQts,
        fontSize: fonteLinhaIntervaloQts,
        cellPadding: paddingLinhaIntervaloQts,
      };
      return [
        { content: slot.label, styles: { ...estiloIntervaloQts, fontStyle: "bold" } },
        { content: "", styles: { ...estiloIntervaloQts } },
        ...DIAS_QTS.map(() => ({ content: slot.label, styles: { ...estiloIntervaloQts } })),
      ];
    }

    return [
      { content: slot.label, styles: { fontStyle: "bold", halign: "center" } },
      { content: `${slot.inicio} - ${slot.fim}`, styles: { halign: "center" } },
      ...DIAS_QTS.map(({ dia }) => {
        const item = buscarHorario(horarios, dia, slot.inicio);
        return montarCelulaHorarioPdf(item, textoHorarioQtsPrincipal(item, cargaAulasPorHorario));
      }),
    ];
  });

  const margemLateralQts = 7;
  const larguraUtilQts = doc.internal.pageSize.getWidth() - (margemLateralQts * 2);
  const larguraColAula = 15;
  const larguraColHorario = 22;
  const larguraColDia = Math.max(42, (larguraUtilQts - larguraColAula - larguraColHorario) / DIAS_QTS.length);

  autoTable(doc, {
    head: [cabecalho],
    body: corpo,
    startY: inicioTabela,
    theme: "grid",
    tableWidth: larguraUtilQts,
    margin: { left: margemLateralQts, right: margemLateralQts, bottom: margemInferiorTabela },
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: fonteBaseQts,
      cellPadding: paddingBaseQts,
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      minCellHeight: alturaLinhaBaseQts,
      overflow: "ellipsize",
      halign: "center",
    },
    headStyles: {
      fillColor: [190, 190, 190],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: Math.max(4.9, fonteBaseQts),
      minCellHeight: alturaCabecalhoDiasQts,
      cellPadding: paddingCabecalhoDiasQts,
    },
    columnStyles: {
      0: { cellWidth: larguraColAula, halign: "center" },
      1: { cellWidth: larguraColHorario, halign: "center" },
      2: { cellWidth: larguraColDia, halign: "center" },
      3: { cellWidth: larguraColDia, halign: "center" },
      4: { cellWidth: larguraColDia, halign: "center" },
      5: { cellWidth: larguraColDia, halign: "center" },
      6: { cellWidth: larguraColDia, halign: "center" },
    },
    willDrawCell: (data) => {
      if (data.section === "body" && data.cell.raw?.textoLocal) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.cell.raw?.textoLocal) {
        desenharCelulaHorarioComLocal(doc, data);
      }
    },
  });

  const finalY = doc.lastAutoTable?.finalY || 160;
  const obsYFinal = Math.min(finalY + 2, obsY);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.15);
  observacoes.forEach((observacao, index) => {
    doc.text(observacao, 8, obsYFinal + (index * espacoLinhaObs));
  });

  desenharAssinaturaDigitalBox(doc, {
    nome: String(usuario?.nome || "Gestor Master").trim(),
    porDelegacao,
    codigo,
    geradoEm,
    y: assinaturaY,
  });
  doc.save(arquivo);
}

