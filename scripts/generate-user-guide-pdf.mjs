import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "docs", "guia-usuario-e-ste.md");
const outputPath = path.join(rootDir, "docs", "guia-usuario-e-ste.pdf");
const assetsDir = path.join(rootDir, "src", "assets");

const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4",
  compress: true,
});

const page = {
  width: doc.internal.pageSize.getWidth(),
  height: doc.internal.pageSize.getHeight(),
  marginX: 18,
  top: 22,
  bottom: 18,
};

const colors = {
  blue: [29, 78, 216],
  blueDark: [30, 41, 59],
  blueLight: [239, 246, 255],
  slate: [51, 65, 85],
  slateLight: [226, 232, 240],
  gray: [100, 116, 139],
  white: [255, 255, 255],
  amberLight: [255, 251, 235],
};

let fontFamily = "helvetica";
let y = page.top;
let sectionStarted = false;
const toc = [];

function registerFont(fileName, family, style) {
  const windowsRoot = process.env.SystemRoot || "C:\\Windows";
  const fontPath = path.join(windowsRoot, "Fonts", fileName);
  if (!fs.existsSync(fontPath)) return false;

  const data = fs.readFileSync(fontPath).toString("base64");
  doc.addFileToVFS(fileName, data);
  doc.addFont(fileName, family, style);
  return true;
}

if (registerFont("arial.ttf", "Arial", "normal")) {
  registerFont("arialbd.ttf", "Arial", "bold");
  fontFamily = "Arial";
}

function setFont(style = "normal", size = 10, color = colors.slate) {
  doc.setFont(fontFamily, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function cleanInline(text) {
  return String(text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .trim();
}

function ensureSpace(height) {
  if (y + height <= page.height - page.bottom) return;
  newPage();
}

function newPage() {
  doc.addPage();
  y = page.top;
}

function addRule() {
  doc.setDrawColor(...colors.slateLight);
  doc.setLineWidth(0.35);
  doc.line(page.marginX, y, page.width - page.marginX, y);
  y += 5;
}

function addLogoPair() {
  const logos = [
    path.join(assetsDir, "goias-brasao.png"),
    path.join(assetsDir, "caebm-brasao.png"),
  ];
  const size = 25;
  const gap = 8;
  const startX = (page.width - (size * 2 + gap)) / 2;

  logos.forEach((logo, index) => {
    if (!fs.existsSync(logo)) return;
    try {
      const data = fs.readFileSync(logo).toString("base64");
      doc.addImage(`data:image/png;base64,${data}`, "PNG", startX + index * (size + gap), 24, size, size);
    } catch {
      // The guide remains valid even when an image cannot be embedded.
    }
  });
}

function addCover() {
  doc.setFillColor(...colors.blue);
  doc.rect(0, 0, page.width, 72, "F");
  addLogoPair();

  setFont("bold", 28, colors.white);
  doc.text("E-STE", page.width / 2, 88, { align: "center" });
  setFont("bold", 19, colors.blueDark);
  doc.text("Guia de Uso do Sistema", page.width / 2, 104, { align: "center" });
  setFont("normal", 12, colors.gray);
  doc.text("Manual operacional para gestores e instrutores", page.width / 2, 113, { align: "center" });

  doc.setFillColor(...colors.blueLight);
  doc.roundedRect(36, 136, page.width - 72, 48, 3, 3, "F");
  setFont("bold", 11, colors.blue);
  doc.text("Conteúdo do guia", page.width / 2, 149, { align: "center" });
  setFont("normal", 10, colors.slate);
  doc.text("Acesso, preenchimento, QTS, relatórios, comunicações e backup", page.width / 2, 161, { align: "center" });
  doc.text("Versão: julho de 2026", page.width / 2, 173, { align: "center" });

  setFont("normal", 9, colors.gray);
  doc.text("Seção de Treinamento e Ensino", page.width / 2, page.height - 26, { align: "center" });
}

function addSection(title) {
  if (sectionStarted) newPage();
  sectionStarted = true;
  toc.push({ title, page: doc.getNumberOfPages() });

  setFont("bold", 17, colors.blue);
  const lines = doc.splitTextToSize(cleanInline(title), page.width - page.marginX * 2);
  ensureSpace(lines.length * 8 + 9);
  doc.text(lines, page.marginX, y);
  y += lines.length * 8 + 3;
  addRule();
}

function addSubheading(title) {
  ensureSpace(15);
  y += 2;
  setFont("bold", 12, colors.blueDark);
  const lines = doc.splitTextToSize(cleanInline(title), page.width - page.marginX * 2);
  doc.text(lines, page.marginX, y);
  y += lines.length * 6 + 2;
}

function addParagraph(text) {
  const content = cleanInline(text);
  if (!content) return;
  setFont("normal", 9.7, colors.slate);
  const lines = doc.splitTextToSize(content, page.width - page.marginX * 2);
  ensureSpace(lines.length * 5.1 + 3);
  doc.text(lines, page.marginX, y);
  y += lines.length * 5.1 + 2.5;
}

function addBullet(text) {
  const content = cleanInline(text);
  setFont("normal", 9.4, colors.slate);
  const x = page.marginX + 3;
  const textX = page.marginX + 8;
  const lines = doc.splitTextToSize(content, page.width - textX - page.marginX);
  ensureSpace(lines.length * 5 + 2);
  doc.circle(x, y - 1.4, 0.7, "F");
  doc.text(lines, textX, y);
  y += lines.length * 5 + 1.2;
}

function addNumbered(number, text) {
  const content = cleanInline(text);
  setFont("normal", 9.4, colors.slate);
  const numberText = `${number}.`;
  const textX = page.marginX + 9;
  const lines = doc.splitTextToSize(content, page.width - textX - page.marginX);
  ensureSpace(lines.length * 5 + 2);
  setFont("bold", 9.4, colors.blue);
  doc.text(numberText, page.marginX + 1, y);
  setFont("normal", 9.4, colors.slate);
  doc.text(lines, textX, y);
  y += lines.length * 5 + 1.2;
}

function addCallout(text) {
  const content = cleanInline(text);
  setFont("normal", 9.3, colors.slate);
  const boxX = page.marginX;
  const boxW = page.width - page.marginX * 2;
  const lines = doc.splitTextToSize(content, boxW - 10);
  const boxH = Math.max(15, lines.length * 5 + 8);
  ensureSpace(boxH + 4);
  doc.setFillColor(...colors.amberLight);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(boxX, y - 4, boxW, boxH, 2.5, 2.5, "FD");
  doc.text(lines, boxX + 5, y + 2);
  y += boxH + 3;
}

function addToc() {
  newPage();
  setFont("bold", 18, colors.blue);
  doc.text("Sumário", page.marginX, y);
  y += 10;
  addRule();

  setFont("normal", 9.7, colors.slate);
  toc.forEach((item) => {
    ensureSpace(8);
    const title = cleanInline(item.title);
    doc.text(title, page.marginX, y);
    doc.text(String(item.page), page.width - page.marginX, y, { align: "right" });
    y += 6.2;
  });
}

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      y += 1.5;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      continue;
    }

    if (trimmed === "---") {
      newPage();
      continue;
    }

    if (trimmed.startsWith("## ")) {
      addSection(trimmed.slice(3));
      continue;
    }

    if (trimmed.startsWith("### ")) {
      addSubheading(trimmed.slice(4));
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const calloutLines = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        calloutLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      i -= 1;
      addCallout(calloutLines.join(" "));
      continue;
    }

    if (trimmed.startsWith("- ")) {
      addBullet(trimmed.slice(2));
      continue;
    }

    const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numbered) {
      addNumbered(numbered[1], numbered[2]);
      continue;
    }

    const paragraph = [trimmed];
    while (i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (
        !next ||
        next.startsWith("#") ||
        next.startsWith("> ") ||
        next.startsWith("- ") ||
        next === "---" ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      paragraph.push(next);
      i += 1;
    }
    addParagraph(paragraph.join(" "));
  }
}

function addHeadersAndFooters() {
  const pageCount = doc.getNumberOfPages();

  for (let index = 1; index <= pageCount; index += 1) {
    doc.setPage(index);

    if (index > 1) {
      setFont("bold", 8.5, colors.blue);
      doc.text("E-STE", page.marginX, 11);
      setFont("normal", 8.5, colors.gray);
      doc.text("Guia de Uso", page.width - page.marginX, 11, { align: "right" });
      doc.setDrawColor(...colors.slateLight);
      doc.line(page.marginX, 15, page.width - page.marginX, 15);
    }

    setFont("normal", 8, colors.gray);
    doc.text(`Página ${index} de ${pageCount}`, page.width - page.marginX, page.height - 9, { align: "right" });
    doc.text("Manual operacional para gestores e instrutores", page.marginX, page.height - 9);
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const markdown = fs.readFileSync(sourcePath, "utf8");

addCover();
newPage();
parseMarkdown(markdown);

// Desenha um rascunho do sumario ao final so para medir quantas paginas ele
// ocupa (depende da quantidade de secoes, calculada durante o parse acima).
const totalPaginasConteudo = doc.getNumberOfPages();
addToc();
const paginasSumario = doc.getNumberOfPages() - totalPaginasConteudo;

// Remove o rascunho: o sumario real sera desenhado logo apos a capa, nao
// no final do documento.
for (let i = 0; i < paginasSumario; i += 1) {
  doc.deletePage(totalPaginasConteudo + 1);
}

// Como o sumario passa a ocupar paginas logo apos a capa, o conteudo (e os
// numeros de pagina ja registrados em cada secao) e empurrado para frente.
toc.forEach((item) => {
  item.page += paginasSumario;
});

addToc();

// Move as paginas do sumario recem-desenhadas (no final) para logo apos a
// capa, preservando a ordem entre elas.
for (let i = 0; i < paginasSumario; i += 1) {
  doc.movePage(doc.getNumberOfPages(), 2);
}

addHeadersAndFooters();

doc.save(outputPath);
console.log(`PDF gerado em ${outputPath}`);

const publicPath = path.join(rootDir, "public", "guia-usuario-e-ste.pdf");
fs.mkdirSync(path.dirname(publicPath), { recursive: true });
fs.copyFileSync(outputPath, publicPath);
console.log(`Copia publicada em ${publicPath}`);
