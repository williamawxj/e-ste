import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "docs", "guia-usuario-e-ste.md");
const outputPath = path.join(rootDir, "public", "guia.html");
const assetsDir = path.join(rootDir, "src", "assets");

const COVER = {
  eyebrow: "Seção de Treinamento e Ensino",
  title: "Guia de Uso do Sistema E-STE",
  tagline: "Manual operacional para gestores e instrutores — acesso, preenchimento, QTS, relatórios, comunicações e backup.",
  versao: "Versão: julho de 2026",
  dominio: "e-ste.vercel.app",
};

const EYEBROW_BY_SECTION = {
  "Apresentação": "geral",
  "Acesso ao sistema": "geral",
  "Conceitos básicos": "geral",
  "Navegação geral": "geral",
  "Guia rápido do instrutor": "instrutor",
  "Guia rápido do gestor": "gestor",
  "Rotinas recomendadas": "gestor",
  "Boas práticas": "geral",
  "Problemas comuns": "geral",
  "Checklist de treinamento": "geral",
  "Encerramento": "geral",
};

function slugify(text) {
  return String(text || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function embedImage(fileName) {
  const filePath = path.join(assetsDir, fileName);
  if (!fs.existsSync(filePath)) return "";
  return `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
}

// --- Parse markdown body (from the first "## " heading onward) into a tree ---

function parseSections(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let current = null; // { title, lines: [] } -> top-level ## section
  let currentSub = null; // { title, lines: [] } -> ### subsection inside current

  function pushSubIfAny() {
    if (current && currentSub) {
      current.subsections.push(currentSub);
      currentSub = null;
    }
  }

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      pushSubIfAny();
      if (current) sections.push(current);
      current = { title: trimmed.slice(3).trim(), introLines: [], subsections: [] };
      continue;
    }

    if (trimmed.startsWith("### ")) {
      pushSubIfAny();
      currentSub = { title: trimmed.slice(4).trim(), lines: [] };
      continue;
    }

    if (!current) continue; // ignore anything before the first ## (title/cover text)

    if (currentSub) {
      currentSub.lines.push(line);
    } else {
      current.introLines.push(line);
    }
  }
  pushSubIfAny();
  if (current) sections.push(current);
  return sections;
}

// --- Render a block of raw markdown lines (paragraphs/lists/callouts) to HTML ---

function renderBlock(lines) {
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Blockquote callout: consecutive "> " lines, first one may start with **Label:**
    if (trimmed.startsWith("> ")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      const joined = quoteLines.join(" ");
      const labelMatch = joined.match(/^\*\*(.+?):\*\*\s*(.*)$/);
      const label = labelMatch ? labelMatch[1] : "Nota";
      const body = labelMatch ? labelMatch[2] : joined;
      const isWarn = /aten[cç][aã]o/i.test(label);
      html += `<div class="callout${isWarn ? " warn" : ""}"><span class="callout-label">${escapeHtml(label)}</span><p>${inlineFormat(body)}</p></div>\n`;
      continue;
    }

    // Numbered steps, possibly with nested "   - " sub-bullets under an item.
    if (/^\d+\.\s+/.test(trimmed)) {
      html += '<ol class="steps">\n';
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
        i += 1;
        let nested = "";
        if (i < lines.length && /^\s+-\s+/.test(lines[i]) && lines[i].trim().startsWith("- ")) {
          nested += '<ul class="nested">\n';
          while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
            nested += `<li>${inlineFormat(lines[i].trim().replace(/^-\s+/, ""))}</li>\n`;
            i += 1;
          }
          nested += "</ul>\n";
        }
        html += `<li>${inlineFormat(itemText)}${nested}</li>\n`;
      }
      html += "</ol>\n";
      continue;
    }

    // Bullet list (top-level, not indented).
    if (trimmed.startsWith("- ") && !/^\s/.test(raw)) {
      html += '<ul class="bullets">\n';
      while (i < lines.length && lines[i].trim().startsWith("- ") && !/^\s/.test(lines[i])) {
        html += `<li>${inlineFormat(lines[i].trim().replace(/^-\s+/, ""))}</li>\n`;
        i += 1;
      }
      html += "</ul>\n";
      continue;
    }

    // Paragraph: consecutive plain lines joined until a blank line or a block marker.
    const paragraph = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || next.startsWith("#") || next.startsWith("> ") || next.startsWith("- ") || /^\d+\.\s+/.test(next)) {
        break;
      }
      paragraph.push(next);
      i += 1;
    }
    html += `<p>${inlineFormat(paragraph.join(" "))}</p>\n`;
  }

  return html;
}

// --- Build the page ---

function buildToc(sections) {
  const items = sections.map((section) => {
    const id = slugify(section.title);
    const subLinks = section.subsections.length > 0
      ? `<ul class="sub">${section.subsections.map((sub) => `<li><a href="#${slugify(sub.title)}">${escapeHtml(sub.title)}</a></li>`).join("")}</ul>`
      : "";
    return `<li><a href="#${id}">${escapeHtml(section.title)}</a>${subLinks}</li>`;
  }).join("\n");
  return `<ol>${items}</ol>`;
}

function buildSections(sections) {
  return sections.map((section) => {
    const id = slugify(section.title);
    const eyebrow = EYEBROW_BY_SECTION[section.title] || "geral";
    const eyebrowLabel = { geral: "Geral", instrutor: "Instrutor", gestor: "Gestor" }[eyebrow];
    const intro = renderBlock(section.introLines);
    const subs = section.subsections.map((sub) => {
      const subId = slugify(sub.title);
      return `<h3 id="${subId}">${escapeHtml(sub.title)}</h3>\n${renderBlock(sub.lines)}`;
    }).join("\n");
    return `
    <section class="doc-section" id="${id}">
      <span class="eyebrow ${eyebrow}">${eyebrowLabel}</span>
      <h2>${escapeHtml(section.title)}</h2>
      <div class="section-rule"></div>
      ${intro}
      ${subs}
    </section>`;
  }).join("\n");
}

const CSS = `
  :root {
    --bg: #eef1f7;
    --surface: #ffffff;
    --surface-2: #f6f8fc;
    --ink: #182238;
    --ink-soft: #56637c;
    --ink-faint: #8391a9;
    --accent: #1d4ed8;
    --accent-deep: #0c2559;
    --accent-soft: #e3ebfd;
    --brass: #93691f;
    --brass-soft: #f6ecda;
    --warn: #a8391b;
    --warn-soft: #fbe9e0;
    --line: #d7deea;
    --serif: Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0a1120; --surface: #101a2d; --surface-2: #0d1626; --ink: #e7ecf7;
      --ink-soft: #a3b1cc; --ink-faint: #7688a8; --accent: #85a8ff; --accent-deep: #cddcff;
      --accent-soft: #16233d; --brass: #d9ab5f; --brass-soft: #241d10; --warn: #e2825d;
      --warn-soft: #2c1710; --line: #24314c;
    }
  }
  :root[data-theme="dark"] {
    --bg: #0a1120; --surface: #101a2d; --surface-2: #0d1626; --ink: #e7ecf7;
    --ink-soft: #a3b1cc; --ink-faint: #7688a8; --accent: #85a8ff; --accent-deep: #cddcff;
    --accent-soft: #16233d; --brass: #d9ab5f; --brass-soft: #241d10; --warn: #e2825d;
    --warn-soft: #2c1710; --line: #24314c;
  }
  :root[data-theme="light"] {
    --bg: #eef1f7; --surface: #ffffff; --surface-2: #f6f8fc; --ink: #182238;
    --ink-soft: #56637c; --ink-faint: #8391a9; --accent: #1d4ed8; --accent-deep: #0c2559;
    --accent-soft: #e3ebfd; --brass: #93691f; --brass-soft: #f6ecda; --warn: #a8391b;
    --warn-soft: #fbe9e0; --line: #d7deea;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  a { color: var(--accent); }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .cover {
    background: linear-gradient(180deg, var(--accent-deep) 0%, #12306e 62%, var(--accent-deep) 100%);
    color: #eef2ff; padding: 3.6rem 1.5rem 3.1rem; text-align: center; position: relative; overflow: hidden;
  }
  .cover::before {
    content: ""; position: absolute; inset: 0;
    background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 26px);
    pointer-events: none;
  }
  .cover-back {
    position: relative; display: inline-flex; align-items: center; gap: 0.4rem; margin-bottom: 1.6rem;
    font-size: 0.82rem; font-weight: 600; color: #d3ddf8; text-decoration: none;
    border: 1px solid rgba(255,255,255,0.28); border-radius: 100px; padding: 0.35rem 0.9rem 0.35rem 0.7rem;
  }
  .cover-back:hover { color: #fff; border-color: rgba(255,255,255,0.5); }
  .cover-crests { display: flex; justify-content: center; align-items: center; gap: 1.4rem; margin-bottom: 1.3rem; position: relative; }
  .cover-crests img { height: 74px; width: auto; filter: drop-shadow(0 3px 10px rgba(0,0,0,0.35)); }
  .cover-eyebrow { position: relative; font-family: var(--sans); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #b9c9f5; margin: 0 0 0.6rem; }
  .cover h1 { position: relative; font-family: var(--serif); font-weight: 700; font-size: clamp(2.2rem, 5vw, 3.2rem); letter-spacing: 0.01em; margin: 0 0 0.5rem; text-wrap: balance; }
  .cover p.tagline { position: relative; font-size: 1.05rem; color: #d3ddf8; margin: 0 auto 1.6rem; max-width: 34rem; text-wrap: balance; }
  .cover-meta { position: relative; display: inline-flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; font-size: 0.78rem; letter-spacing: 0.03em; }
  .cover-meta span { border: 1px solid rgba(255,255,255,0.28); background: rgba(255,255,255,0.06); border-radius: 100px; padding: 0.32rem 0.85rem; display: inline-flex; align-items: center; }
  .cover-meta .download {
    display: inline-flex; align-items: center; gap: 0.4rem; border: 1px solid var(--brass); background: var(--brass);
    color: #241d0c; border-radius: 100px; padding: 0.32rem 0.9rem 0.32rem 0.75rem; font-weight: 700; text-decoration: none;
    transition: filter 0.15s ease;
  }
  .cover-meta .download:hover { filter: brightness(1.08); }
  .cover-meta .download svg { width: 14px; height: 14px; flex: none; }
  .layout { max-width: 1180px; margin: 0 auto; padding: 2.4rem 1.5rem 5rem; display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 2.6rem; align-items: start; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; padding-top: 1.4rem; } }
  .toc { position: sticky; top: 1.4rem; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 1.1rem 1.1rem 1.3rem; max-height: calc(100vh - 2.8rem); overflow-y: auto; }
  @media (max-width: 900px) { .toc { position: static; max-height: none; } }
  .toc-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-faint); margin: 0 0 0.7rem; }
  .toc ol { list-style: none; margin: 0; padding: 0; counter-reset: toc; }
  .toc > ol > li { counter-increment: toc; margin-bottom: 0.15rem; }
  .toc a { display: block; text-decoration: none; color: var(--ink-soft); font-size: 0.86rem; padding: 0.32rem 0.4rem; border-radius: 6px; }
  .toc > ol > li > a { font-weight: 600; color: var(--ink); }
  .toc > ol > li > a::before { content: counter(toc) ". "; color: var(--accent); font-variant-numeric: tabular-nums; }
  .toc a:hover { background: var(--surface-2); color: var(--accent); }
  .toc .sub { list-style: none; margin: 0.1rem 0 0.4rem 0.95rem; padding: 0; border-left: 1px solid var(--line); }
  .toc .sub li a { font-size: 0.79rem; padding-left: 0.7rem; }
  main.content { min-width: 0; }
  section.doc-section { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 2rem 2.1rem 2.2rem; margin-bottom: 1.6rem; scroll-margin-top: 1.2rem; }
  @media (max-width: 560px) { section.doc-section { padding: 1.5rem 1.2rem 1.7rem; } }
  .eyebrow { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 0.24rem 0.65rem; border-radius: 100px; margin-bottom: 0.9rem; }
  .eyebrow.geral { color: var(--ink-soft); background: var(--surface-2); border: 1px solid var(--line); }
  .eyebrow.instrutor { color: var(--accent-deep); background: var(--accent-soft); }
  .eyebrow.gestor { color: var(--brass); background: var(--brass-soft); }
  h2 { font-family: var(--serif); font-size: 1.7rem; font-weight: 700; color: var(--ink); margin: 0 0 0.3rem; text-wrap: balance; }
  .section-rule { height: 3px; width: 46px; background: var(--brass); border-radius: 2px; margin: 0.7rem 0 1.5rem; }
  h3 { font-family: var(--serif); font-size: 1.18rem; font-weight: 700; color: var(--accent-deep); margin: 2rem 0 0.7rem; }
  section.doc-section > h3:first-of-type { margin-top: 0.4rem; }
  p { margin: 0 0 0.9rem; max-width: 66ch; color: var(--ink); }
  strong { color: var(--ink); font-weight: 700; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 0.05rem 0.35rem; font-size: 0.88em; }
  ul.bullets { margin: 0 0 1rem; padding: 0; list-style: none; max-width: 66ch; }
  ul.bullets li { position: relative; padding-left: 1.2rem; margin-bottom: 0.5rem; color: var(--ink); }
  ul.bullets li::before { content: ""; position: absolute; left: 0.15rem; top: 0.62rem; width: 5px; height: 5px; border-radius: 50%; background: var(--brass); }
  ol.steps { list-style: none; margin: 0 0 1.1rem; padding: 0; max-width: 66ch; counter-reset: step; }
  ol.steps li { counter-increment: step; position: relative; padding-left: 2.4rem; margin-bottom: 0.7rem; min-height: 1.6rem; }
  ol.steps li::before {
    content: counter(step); position: absolute; left: 0; top: -0.05rem; width: 1.65rem; height: 1.65rem; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent-deep); font-family: var(--sans); font-weight: 700; font-size: 0.78rem;
    display: flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums;
  }
  ol.steps ul.nested { list-style: none; margin: 0.4rem 0 0.2rem; padding: 0; border-left: 2px solid var(--line); padding-left: 0.8rem; }
  ol.steps ul.nested li { padding-left: 0; min-height: 0; margin-bottom: 0.25rem; font-size: 0.92em; color: var(--ink-soft); }
  ol.steps ul.nested li::before { content: none; }
  .callout { border-left: 3px solid var(--brass); background: var(--brass-soft); border-radius: 0 10px 10px 0; padding: 0.9rem 1.1rem; margin: 1.1rem 0 1.3rem; max-width: 66ch; }
  .callout.warn { border-left-color: var(--warn); background: var(--warn-soft); }
  .callout-label { display: block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.3rem; color: var(--brass); }
  .callout.warn .callout-label { color: var(--warn); }
  .callout p { margin: 0; color: var(--ink); }
  footer.doc-footer { max-width: 1180px; margin: 0 auto; padding: 0 1.5rem 3rem; color: var(--ink-faint); font-size: 0.82rem; text-align: center; }
  footer.doc-footer p { max-width: none; margin: 0 0 0.4rem; }
  footer.doc-footer .credit { font-size: 0.74rem; letter-spacing: 0.02em; color: var(--ink-faint); margin-bottom: 0; }
  footer.doc-footer .rule { height: 1px; background: var(--line); margin: 0 0 1.4rem; }
  .back-to-top {
    position: fixed; right: 1.1rem; bottom: 1.1rem; width: 2.6rem; height: 2.6rem; border-radius: 50%; background: var(--accent);
    color: #fff; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 1.1rem;
    box-shadow: 0 6px 18px rgba(12, 37, 89, 0.28);
  }
`;

const markdown = fs.readFileSync(sourcePath, "utf8");
const sections = parseSections(markdown);
const goias = embedImage("goias-brasao.png");
const caebm = embedImage("caebm-brasao.png");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(COVER.title)}</title>
<link rel="icon" href="data:," />
<style>${CSS}</style>
</head>
<body id="top">

<div class="cover">
  <a class="cover-back" href="/login">&larr; Voltar ao E-STE</a>
  <div class="cover-crests">
    ${goias ? `<img src="${goias}" alt="Brasão do Estado de Goiás" />` : ""}
    ${caebm ? `<img src="${caebm}" alt="Brasão do CAEBM" />` : ""}
  </div>
  <p class="cover-eyebrow">${escapeHtml(COVER.eyebrow)}</p>
  <h1>${escapeHtml(COVER.title)}</h1>
  <p class="tagline">${escapeHtml(COVER.tagline)}</p>
  <div class="cover-meta">
    <span>${escapeHtml(COVER.versao)}</span>
    <span>${escapeHtml(COVER.dominio)}</span>
    <a class="download" href="/guia-usuario-e-ste.pdf" download>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 20h16" /></svg>
      Baixar PDF
    </a>
  </div>
</div>

<div class="layout">
  <nav class="toc" aria-label="Sumário">
    <p class="toc-title">Sumário</p>
    ${buildToc(sections)}
  </nav>

  <main class="content">
    ${buildSections(sections)}
  </main>
</div>

<footer class="doc-footer">
  <div class="rule"></div>
  <p>E-STE — Guia de Uso do Sistema · Seção de Treinamento e Ensino · ${escapeHtml(COVER.versao)}</p>
  <p class="credit">© 2026 Todos os direitos reservados<br />Cadete Adilson William Xavier Jargenboski</p>
</footer>

<a href="#top" class="back-to-top" aria-label="Voltar ao topo">↑</a>

</body>
</html>
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(`Guia HTML gerado em ${outputPath} (${sections.length} secoes).`);
