import "dotenv/config";
import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import fs from "node:fs/promises";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import pg from "pg";

const { Pool } = pg;
const scryptAsync = promisify(crypto.scrypt);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

function decodeUrlPart(value = "") {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function inteiroEnvPositivo(nome, fallback, minimo = 1) {
  const numero = Number.parseInt(process.env[nome] || "", 10);
  if (!Number.isFinite(numero) || numero < minimo) return fallback;
  return numero;
}

function buildPoolConfig() {
  const ambienteServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const maxConexoesPadrao = ambienteServerless ? 1 : 10;
  const maxConexoes = Number(process.env.DB_POOL_MAX || maxConexoesPadrao);
  const connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS || (ambienteServerless ? 8000 : 10000));
  const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS || (ambienteServerless ? 7000 : 20000));
  const maxUses = Number(process.env.DB_MAX_USES || (ambienteServerless ? 2000 : 7500));
  const ssl = process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined;
  const connectionString = process.env.DATABASE_URL;
  const baseConfig = {
    ssl,
    max: Number.isFinite(maxConexoes) && maxConexoes > 0 ? maxConexoes : maxConexoesPadrao,
    connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis) && connectionTimeoutMillis > 0
      ? connectionTimeoutMillis
      : 10000,
    idleTimeoutMillis: Number.isFinite(idleTimeoutMillis) && idleTimeoutMillis >= 0
      ? idleTimeoutMillis
      : 20000,
    maxUses: Number.isFinite(maxUses) && maxUses > 0 ? maxUses : 7500,
    allowExitOnIdle: ambienteServerless,
    keepAlive: true,
  };

  if (!connectionString) {
    return baseConfig;
  }

  try {
    const url = new URL(connectionString);
    let host = url.hostname;
    let user = decodeUrlPart(url.username);

    if (host.toLowerCase().includes("regiao.pooler.supabase.com")) {
      const projectRef = user.match(/^postgres\.([a-z0-9]+)$/i)?.[1];
      if (projectRef) {
        console.warn("DATABASE_URL contem o placeholder REGIAO; usando o host direto do Supabase.");
        host = `db.${projectRef}.supabase.co`;
        user = "postgres";
      }
    }

    return {
      ...baseConfig,
      host,
      port: Number(url.port || 5432),
      user,
      password: decodeUrlPart(url.password),
      database: decodeUrlPart(url.pathname.replace(/^\/+/, "") || "postgres"),
    };
  } catch {
    return { ...baseConfig, connectionString };
  }
}

const pool = new Pool(buildPoolConfig());
pool.on("error", (error) => {
  console.error("Erro de conexao no pool PostgreSQL (cliente ocioso):", error);
});

const app = express();
const PORT = Number(process.env.PORT || 3001);
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
const LIMITE_BANCO_BYTES = Math.round(1.5 * 1024 * 1024 * 1024);
const ASSUNTO_EMAIL_AULA_CANCELADA = "E-STE | Aula cancelada";
const ASSUNTO_EMAIL_AULA_ADICIONADA = "E-STE | Aula adicionada";
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
const DB_KEEPALIVE_INTERVAL_DAYS = inteiroEnvPositivo("DB_KEEPALIVE_INTERVAL_DAYS", 3);
const DB_KEEPALIVE_CHECK_INTERVAL_HOURS = inteiroEnvPositivo("DB_KEEPALIVE_CHECK_INTERVAL_HOURS", 12);
const DB_KEEPALIVE_DISABLED = ["1", "true", "yes", "sim"].includes(
  String(process.env.DB_KEEPALIVE_DISABLED || "").trim().toLowerCase()
);
const ORIGENS_MANUTENCAO_BANCO_AUTOMATICAS = ["cron", "agendador-local", "agendador-local-inicial"];
let mailTransporter = null;
let manutencaoBancoTimer = null;
let manutencaoBancoRodando = false;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "1mb" }));

function gerarId(prefixo) {
  return `${prefixo}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const SENHAS_MASTER_BLOQUEADAS = new Set([
  "ad696108",
  "123456",
  "12345678",
  "123456789",
  "password",
  "senha",
  "troque-esta-senha",
]);

function envFlag(nome) {
  return ["1", "true", "yes", "sim"].includes(
    String(process.env[nome] || "").trim().toLowerCase()
  );
}

function masterPermiteSenhaFraca() {
  return envFlag("MASTER_ALLOW_WEAK_PASSWORD");
}

function masterSincronizaSenhaConfigurada() {
  return envFlag("MASTER_PASSWORD_SYNC");
}

function senhaMasterInsegura(senha) {
  const valor = String(senha || "").trim();
  return valor.length < 12 || SENHAS_MASTER_BLOQUEADAS.has(valor.toLowerCase());
}

function getMasterEmailConfig({ required = false } = {}) {
  const email = normalizarEmail(process.env.MASTER_EMAIL);
  if (!email) {
    if (required) {
      throw new Error("MASTER_EMAIL deve ser configurado no ambiente antes de criar o gestor master.");
    }
    return "";
  }
  return email;
}

function getMasterPasswordConfig({ required = false } = {}) {
  const senha = String(process.env.MASTER_PASSWORD || "");
  if (!senha.trim()) {
    if (required) {
      throw new Error("MASTER_PASSWORD deve ser configurado no ambiente antes de criar o gestor master.");
    }
    return "";
  }

  if (senhaMasterInsegura(senha) && !masterPermiteSenhaFraca()) {
    throw new Error("MASTER_PASSWORD inseguro. Use uma senha forte, sem valores padrao ou sequenciais.");
  }

  return senha;
}

function inteiroNaoNegativo(valor) {
  const numero = Number.parseInt(valor, 10);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function inteiroPositivoOuNulo(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === "") return null;
  const numero = Number.parseInt(valor, 10);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function normalizarLocalInstrucao(valor, tipo = "aula") {
  const local = String(valor || "").trim();
  if (tipo === "aula") return local || "CAEBM";
  return local;
}

function normalizarTextoComparacao(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sanitizeUser(usuario) {
  if (!usuario) return null;
  const { senha_hash, senhaHash, ...safe } = usuario;
  return safe;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function statusNotificacaoEmail() {
  const configurado = smtpConfigured();
  return {
    configurado,
    host: process.env.SMTP_HOST || "",
    from: process.env.SMTP_FROM || "",
    mensagem: configurado
      ? "Envio automático de e-mail ativo."
      : "Envio automático de e-mail inativo: SMTP não configurado no .env.",
  };
}

function getMailTransporter() {
  if (!smtpConfigured()) return null;
  if (mailTransporter) return mailTransporter;

  const port = Number(process.env.SMTP_PORT || 587);
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || "",
        }
      : undefined,
  });

  return mailTransporter;
}

function isEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function diaOffset(dia) {
  const mapa = {
    Segunda: 0,
    Terca: 1,
    Terça: 1,
    "TerÃ§a": 1,
    Quarta: 2,
    Quinta: 3,
    Sexta: 4,
  };
  return mapa[dia] ?? 0;
}

function formatDateBR(date) {
  if (!date) return "";
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatDateTimeBR(value) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(parsed);
}

function formatBytes(bytes) {
  const valor = Number(bytes || 0);
  if (!Number.isFinite(valor) || valor <= 0) return "0 B";

  const unidades = ["B", "KB", "MB", "GB", "TB"];
  const expoente = Math.min(unidades.length - 1, Math.floor(Math.log(valor) / Math.log(1024)));
  const tamanho = valor / (1024 ** expoente);
  const casas = expoente === 0 ? 0 : 2;
  return `${tamanho.toFixed(casas)} ${unidades[expoente]}`;
}

function intervaloMesUtc(mesInformado = "") {
  const mes = String(mesInformado || "").trim();
  if (!mes) return null;
  const match = mes.match(/^(\d{4})-(\d{2})$/);
  if (!match) return { ok: false, mensagem: "Informe o mês no formato aaaa-mm." };

  const ano = Number.parseInt(match[1], 10);
  const numeroMes = Number.parseInt(match[2], 10);
  if (!Number.isFinite(ano) || !Number.isFinite(numeroMes) || numeroMes < 1 || numeroMes > 12) {
    return { ok: false, mensagem: "Informe o mês no formato aaaa-mm." };
  }

  const inicio = `${match[1]}-${match[2]}-01`;
  const fim = new Date(Date.UTC(ano, numeroMes, 1)).toISOString().slice(0, 10);
  return {
    ok: true,
    mes: `${match[1]}-${match[2]}`,
    inicio,
    fim,
  };
}

function dataDaAula(row) {
  if (!row?.semana_inicio) return "";
  const inicio = row.semana_inicio instanceof Date
    ? row.semana_inicio
    : new Date(`${String(row.semana_inicio).slice(0, 10)}T00:00:00.000Z`);
  const data = new Date(inicio);
  data.setUTCDate(data.getUTCDate() + diaOffset(row.dia));
  return formatDateBR(data);
}

function dataBaseDaAula(row) {
  if (!row?.semana_inicio) return null;
  const inicio = row.semana_inicio instanceof Date
    ? row.semana_inicio
    : new Date(`${String(row.semana_inicio).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(inicio.getTime())) return null;
  const data = new Date(inicio);
  data.setUTCDate(data.getUTCDate() + diaOffset(row.dia));
  return data;
}

function formatGoogleCalendarDateTime(row, horario) {
  const data = dataBaseDaAula(row);
  if (!data) return "";

  const partes = String(horario || "00:00").split(":");
  const hora = String(Number.parseInt(partes[0], 10) || 0).padStart(2, "0");
  const minuto = String(Number.parseInt(partes[1], 10) || 0).padStart(2, "0");
  const ano = String(data.getUTCFullYear());
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}${mes}${dia}T${hora}${minuto}00`;
}

function horarioParaMinutos(horario) {
  const partes = String(horario || "").split(":");
  const hora = Number.parseInt(partes[0], 10);
  const minuto = Number.parseInt(partes[1], 10);
  if (!Number.isFinite(hora) || !Number.isFinite(minuto)) return 0;
  return (hora * 60) + minuto;
}

function criarLinkGoogleAgendaPeriodoAulas(aulas = []) {
  if (!Array.isArray(aulas) || aulas.length === 0) return "";

  const ordenadas = [...aulas].sort((a, b) => (
    horarioParaMinutos(a.inicio) - horarioParaMinutos(b.inicio)
  ));
  const primeira = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];

  const inicio = formatGoogleCalendarDateTime(primeira, primeira.inicio);
  const fim = formatGoogleCalendarDateTime(primeira, ultima.fim);
  if (!inicio || !fim) return "";

  const turmaNome = primeira.turma_nome || primeira.turma_id || "Turma";
  const semanaNome = primeira.semana_nome || primeira.semana_id || "Semana";
  const instrutorNome = primeira.usuario_nome_grade || primeira.usuario_nome || primeira.instrutor_nome || "Instrutor";
  const materiasUnicas = [...new Set(
    ordenadas
      .map((item) => String(item.materia_nome || item.texto || "Aula").trim())
      .filter(Boolean)
  )];
  const materiaTitulo = materiasUnicas.join(" / ") || "Aula";
  const titulo = `Aula (${materiaTitulo}) - Turma ${turmaNome}`;
  const locais = [...new Set(ordenadas.map((item) => normalizarLocalInstrucao(item.local_instrucao, item.tipo)).filter(Boolean))];
  const localEvento = locais.join(" | ");
  const localEventoComTurma = localEvento ? `${localEvento} | Turma: ${turmaNome}` : `Turma: ${turmaNome}`;
  const linhasAulas = ordenadas.map((item) => {
    const conteudo = item.materia_nome || item.texto || item.tipo || "Aula";
    return `- ${item.inicio} - ${item.fim}: ${conteudo}`;
  });
  const detalhes = [
    `Aula: ${materiaTitulo}`,
    `Turma: ${turmaNome}`,
    `Local: ${localEvento || "-"}`,
    `Semana: ${semanaNome}`,
    `Data: ${dataDaAula(primeira) || primeira.dia || "-"}`,
    `Periodo: ${primeira.inicio} - ${ultima.fim}`,
    `Instrutor: ${instrutorNome}`,
    "",
    "Aulas no período:",
    ...linhasAulas,
    "Origem: E-STE",
  ].join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: `${inicio}/${fim}`,
    details: detalhes,
    ctz: "America/Sao_Paulo",
  });
  params.set("location", localEventoComTurma);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function rotuloDiaSemana(dia) {
  const valor = String(dia || "").trim();
  const nomes = {
    Terca: "Terça",
    "TerÃ§a": "Terça",
  };
  return nomes[valor] || valor;
}

function dataDaAulaComDiaSemana(row) {
  const data = dataDaAula(row);
  const dia = rotuloDiaSemana(row?.dia);
  if (data && dia) return `${data} (${dia})`;
  return data || dia || "-";
}

function descreverAula(row, { incluirDiaSemanaNaData = false } = {}) {
  if (!row) return "Aula não encontrada.";
  const conteudo = row.texto || row.materia_nome || row.tipo || "Aula";
  const localInstrucao = normalizarLocalInstrucao(row.local_instrucao, row.tipo);
  const data = incluirDiaSemanaNaData ? dataDaAulaComDiaSemana(row) : (dataDaAula(row) || row.dia);
  return [
    `Turma: ${row.turma_nome || row.turma_id || "-"}`,
    `Semana: ${row.semana_nome || row.semana_id || "-"}`,
    `Data: ${data}`,
    `Horário: ${row.inicio} - ${row.fim}`,
    `Conteúdo: ${conteudo}`,
    row.prova ? "Tipo: Prova" : "",
    localInstrucao ? `Local: ${localInstrucao}` : "",
    Number(row.auxiliares_autorizados || 0) > 0 ? `Auxiliares autorizados: ${Number(row.auxiliares_autorizados || 0)}` : "",
    row.auxiliares ? `Auxiliares/observações: ${row.auxiliares}` : "",
  ].filter(Boolean).join("\n");
}

async function enviarEmail({ to, subject, text }) {
  if (!isEmailValido(to)) {
    console.warn(`E-mail de notificação ignorado: destinatário inválido (${to || "vazio"}).`);
    return { ok: false, motivo: "destinatario_invalido" };
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn("E-mail de notificação ignorado: SMTP não configurado no .env.");
    return { ok: false, motivo: "smtp_nao_configurado" };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
  });
  return { ok: true };
}

async function enviarEmailSeguro({ to, subject, text, contexto = "notificacao" }) {
  try {
    const resultado = await enviarEmail({ to, subject, text });
    return resultado || { ok: false, motivo: "nao_enviado" };
  } catch (error) {
    console.error(`Falha ao enviar e-mail (${contexto}):`, error);
    return { ok: false, erro: error };
  }
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(String(password), salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash?.startsWith("scrypt:")) return false;
  const [, salt, hash] = storedHash.split(":");
  const derived = await scryptAsync(String(password), salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

async function masterUsaSenhaBloqueada(storedHash) {
  for (const senha of SENHAS_MASTER_BLOQUEADAS) {
    if (await verifyPassword(senha, storedHash)) return true;
  }
  return false;
}

function erroTransitórioBanco(error) {
  if (!error) return false;
  const code = String(error.code || "").toUpperCase();
  const message = String(error.message || "").toLowerCase();

  if (
    [
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "EPIPE",
      "57P01",
      "57P02",
      "57P03",
      "53300",
      "53400",
      "XX000",
      "08000",
      "08003",
      "08006",
      "08P01",
    ].includes(code)
  ) {
    return true;
  }

  return (
    message.includes("too many clients") ||
    message.includes("max clients reached") ||
    message.includes("connection terminated") ||
    message.includes("connection reset") ||
    message.includes("connection refused") ||
    message.includes("timeout expired") ||
    message.includes("terminating connection")
  );
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function query(sql, params = [], opcoes = {}) {
  const tentativasPadrao = ambienteServerlessAtual() ? 2 : 3;
  const maxTentativas = Math.max(1, Number(opcoes.maxTentativas || process.env.DB_QUERY_RETRIES || tentativasPadrao));
  let tentativa = 0;
  let ultimoErro;

  while (tentativa < maxTentativas) {
    tentativa += 1;
    try {
      return await pool.query(sql, params);
    } catch (error) {
      ultimoErro = error;
      const podeTentarNovamente = tentativa < maxTentativas && erroTransitórioBanco(error);
      if (!podeTentarNovamente) {
        throw error;
      }
      const backoff = Math.min(2200, 300 * tentativa);
      console.warn(`Falha transitória no banco (tentativa ${tentativa}/${maxTentativas}). Nova tentativa em ${backoff}ms.`);
      await esperar(backoff);
    }
  }

  throw ultimoErro;
}

function ambienteServerlessAtual() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function dataIsoOuVazio(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function intervaloManutencaoBancoMs() {
  return DB_KEEPALIVE_INTERVAL_DAYS * DIA_MS;
}

function proximoRegistroManutencaoBanco(ultimoRegistro) {
  if (!ultimoRegistro) return new Date().toISOString();
  const ultimo = ultimoRegistro instanceof Date ? ultimoRegistro : new Date(ultimoRegistro);
  if (Number.isNaN(ultimo.getTime())) return new Date().toISOString();
  return new Date(ultimo.getTime() + intervaloManutencaoBancoMs()).toISOString();
}

async function getUltimoRegistroManutencaoBanco() {
  const result = await query(
    `
      SELECT id, origem, registrado_em
      FROM registros_manutencao_banco
      WHERE origem = ANY($1::text[])
      ORDER BY registrado_em DESC
      LIMIT 1
    `,
    [ORIGENS_MANUTENCAO_BANCO_AUTOMATICAS]
  );
  return result.rows[0] || null;
}

async function registrarManutencaoBanco({ origem = "manual", forcar = false } = {}) {
  if (DB_KEEPALIVE_DISABLED) {
    return { ok: true, desabilitado: true, registrado: false };
  }

  const origemNormalizada = String(origem || "manual");
  const removerUltimoAutomatico = ORIGENS_MANUTENCAO_BANCO_AUTOMATICAS.includes(origemNormalizada);
  const agora = new Date();
  const ultimo = await getUltimoRegistroManutencaoBanco();
  const ultimoRegistro = ultimo?.registrado_em ? new Date(ultimo.registrado_em) : null;
  const registroVencido = !ultimoRegistro
    || Number.isNaN(ultimoRegistro.getTime())
    || (agora.getTime() - ultimoRegistro.getTime()) >= intervaloManutencaoBancoMs();

  if (!forcar && !registroVencido) {
    return {
      ok: true,
      registrado: false,
      ultimoRegistro: dataIsoOuVazio(ultimoRegistro),
      proximoRegistro: proximoRegistroManutencaoBanco(ultimoRegistro),
    };
  }

  const id = gerarId("manutencao_banco");
  const detalhes = {
    intervaloDias: DB_KEEPALIVE_INTERVAL_DAYS,
    ambiente: ambienteServerlessAtual() ? "serverless" : "servidor",
    versao: 1,
  };

  const client = await pool.connect();
  let registroRemovido = null;
  let row = null;
  try {
    await client.query("BEGIN");

    if (removerUltimoAutomatico) {
      const removido = await client.query(
        `
          DELETE FROM registros_manutencao_banco
          WHERE id = (
            SELECT id
            FROM registros_manutencao_banco
            WHERE origem = ANY($1::text[])
            ORDER BY registrado_em DESC
            LIMIT 1
          )
          RETURNING id, origem, registrado_em
        `,
        [ORIGENS_MANUTENCAO_BANCO_AUTOMATICAS]
      );
      registroRemovido = removido.rows[0] || null;
    }

    const result = await client.query(
      `
        INSERT INTO registros_manutencao_banco (id, origem, detalhes, registrado_em)
        VALUES ($1, $2, $3::jsonb, NOW())
        RETURNING id, origem, registrado_em
      `,
      [id, origemNormalizada, JSON.stringify(detalhes)]
    );
    row = result.rows[0] || {};

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    ok: true,
    registrado: true,
    id: row.id || id,
    origem: row.origem || origemNormalizada,
    registradoEm: dataIsoOuVazio(row.registrado_em),
    registroAutomaticoRemovido: registroRemovido?.id || "",
    proximoRegistro: proximoRegistroManutencaoBanco(row.registrado_em),
  };
}

function cronManutencaoAutorizado(req) {
  const segredo = String(process.env.CRON_SECRET || "").trim();
  if (segredo) {
    return req.headers.authorization === `Bearer ${segredo}`;
  }

  if (process.env.NODE_ENV !== "production") return true;

  const userAgent = String(req.headers["user-agent"] || "");
  return userAgent.includes("vercel-cron/1.0");
}

function iniciarAgendadorManutencaoBanco() {
  if (DB_KEEPALIVE_DISABLED || ambienteServerlessAtual() || manutencaoBancoTimer) {
    return;
  }

  const executar = async (origem) => {
    if (manutencaoBancoRodando) return;
    manutencaoBancoRodando = true;
    try {
      const resultado = await registrarManutencaoBanco({ origem });
      if (resultado.registrado) {
        console.log(`Registro de manutencao do banco criado: ${resultado.registradoEm}`);
      }
    } catch (error) {
      console.error("Falha ao registrar manutencao do banco:", error);
    } finally {
      manutencaoBancoRodando = false;
    }
  };

  const primeiroTimer = setTimeout(() => {
    executar("agendador-local-inicial");
  }, 30_000);
  primeiroTimer.unref?.();

  const intervaloChecagem = Math.min(
    DB_KEEPALIVE_CHECK_INTERVAL_HOURS * HORA_MS,
    intervaloManutencaoBancoMs()
  );
  manutencaoBancoTimer = setInterval(() => {
    executar("agendador-local");
  }, intervaloChecagem);
  manutencaoBancoTimer.unref?.();
}

async function getStatusArmazenamentoBanco() {
  const [databaseSize, totais] = await Promise.all([
    query(
      `
        SELECT
          current_database() AS database_name,
          pg_database_size(current_database())::bigint AS database_bytes
      `
    ),
    query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM horarios) AS total_horarios,
          (SELECT COUNT(*)::int FROM horarios WHERE tipo = 'aula') AS total_aulas,
          (SELECT COUNT(*)::int FROM confirmacoes_horarios_instrutor) AS total_confirmacoes,
          (SELECT COUNT(*)::int FROM qts_confirmacoes) AS total_qts_confirmacoes,
          (SELECT COUNT(*)::int FROM solicitacoes_modificacao_horario) AS total_solicitacoes,
          (SELECT COUNT(*)::int FROM usuarios WHERE perfil = 'instrutor' AND aprovado = TRUE) AS total_instrutores,
          (SELECT COUNT(*)::int FROM usuarios WHERE perfil = 'gestor' AND aprovado = TRUE) AS total_gestores
      `
    ),
  ]);

  const usadoBytes = Number(databaseSize.rows[0]?.database_bytes || 0);
  const percentualUso = LIMITE_BANCO_BYTES > 0
    ? Number(((usadoBytes / LIMITE_BANCO_BYTES) * 100).toFixed(2))
    : 0;

  return {
    databaseName: databaseSize.rows[0]?.database_name || "",
    limiteBytes: LIMITE_BANCO_BYTES,
    limiteFormatado: formatBytes(LIMITE_BANCO_BYTES),
    usadoBytes,
    usadoFormatado: formatBytes(usadoBytes),
    percentualUso,
    alertaLimite: usadoBytes >= LIMITE_BANCO_BYTES,
    totais: {
      horarios: Number(totais.rows[0]?.total_horarios || 0),
      aulas: Number(totais.rows[0]?.total_aulas || 0),
      confirmacoes: Number(totais.rows[0]?.total_confirmacoes || 0),
      qtsConfirmacoes: Number(totais.rows[0]?.total_qts_confirmacoes || 0),
      solicitacoes: Number(totais.rows[0]?.total_solicitacoes || 0),
      instrutores: Number(totais.rows[0]?.total_instrutores || 0),
      gestores: Number(totais.rows[0]?.total_gestores || 0),
    },
  };
}

async function gerarBackupGradesPreenchidas({ gestor }) {
  const [status, horarios, confirmacoes, qtsConfirmacoes, solicitacoes] = await Promise.all([
    getStatusArmazenamentoBanco(),
    query(
      `
        SELECT
          h.*,
          t.nome AS turma_nome,
          s.nome AS semana_nome,
          u.nome AS instrutor_nome_completo,
          u.nome_grade AS instrutor_nome_grade
        FROM horarios h
        LEFT JOIN turmas t ON t.id = h.turma_id
        LEFT JOIN semanas s ON s.id = h.semana_id
        LEFT JOIN usuarios u ON u.id = h.instrutor_id
        ORDER BY h.turma_id, h.semana_id, h.dia, h.inicio
      `
    ),
    query(
      `
        SELECT
          c.*,
          t.nome AS turma_nome,
          s.nome AS semana_nome,
          u.nome AS instrutor_nome_completo,
          u.nome_grade AS instrutor_nome_grade
        FROM confirmacoes_horarios_instrutor c
        LEFT JOIN turmas t ON t.id = c.turma_id
        LEFT JOIN semanas s ON s.id = c.semana_id
        LEFT JOIN usuarios u ON u.id = c.instrutor_id
        ORDER BY c.turma_id, c.semana_id, c.confirmado_em
      `
    ),
    query(
      `
        SELECT
          qc.*,
          t.nome AS turma_nome,
          s.nome AS semana_nome
        FROM qts_confirmacoes qc
        LEFT JOIN turmas t ON t.id = qc.turma_id
        LEFT JOIN semanas s ON s.id = qc.semana_id
        ORDER BY qc.confirmado_em
      `
    ),
    query(
      `
        SELECT
          smh.*,
          t.nome AS turma_nome,
          s.nome AS semana_nome,
          u.nome AS instrutor_nome_completo,
          u.nome_grade AS instrutor_nome_grade
        FROM solicitacoes_modificacao_horario smh
        LEFT JOIN turmas t ON t.id = smh.turma_id
        LEFT JOIN semanas s ON s.id = smh.semana_id
        LEFT JOIN usuarios u ON u.id = smh.instrutor_id
        ORDER BY smh.criado_em
      `
    ),
  ]);

  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    exportadoPor: {
      id: gestor?.id || "",
      nome: gestor?.nome || "",
      email: gestor?.email || "",
    },
    armazenamento: status,
    totais: {
      horarios: horarios.rowCount,
      confirmacoes: confirmacoes.rowCount,
      qtsConfirmacoes: qtsConfirmacoes.rowCount,
      solicitacoes: solicitacoes.rowCount,
    },
    grades: {
      horarios: horarios.rows,
      confirmacoes: confirmacoes.rows,
      qtsConfirmacoes: qtsConfirmacoes.rows,
      solicitacoes: solicitacoes.rows,
    },
  };
}

async function limparGradesPreenchidas() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const contagem = await client.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM horarios) AS horarios,
          (SELECT COUNT(*)::int FROM confirmacoes_horarios_instrutor) AS confirmacoes,
          (SELECT COUNT(*)::int FROM qts_confirmacoes) AS qts_confirmacoes,
          (SELECT COUNT(*)::int FROM solicitacoes_modificacao_horario) AS solicitacoes
      `
    );

    await client.query("DELETE FROM horarios");
    await client.query("DELETE FROM confirmacoes_horarios_instrutor");
    await client.query("DELETE FROM qts_confirmacoes");
    await client.query("DELETE FROM solicitacoes_modificacao_horario");

    await client.query("COMMIT");

    return {
      horarios: Number(contagem.rows[0]?.horarios || 0),
      confirmacoes: Number(contagem.rows[0]?.confirmacoes || 0),
      qtsConfirmacoes: Number(contagem.rows[0]?.qts_confirmacoes || 0),
      solicitacoes: Number(contagem.rows[0]?.solicitacoes || 0),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function initDb() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await query(schema);

  // Migra chefs de pasta legados (chefe_ste em instrutor) para o modelo por materia.
  await query(
    `
      INSERT INTO materia_chefes (materia_id, instrutor_id)
      SELECT materia_id, instrutor_id
      FROM (
        SELECT
          um.materia_id,
          um.usuario_id AS instrutor_id,
          ROW_NUMBER() OVER (PARTITION BY um.materia_id ORDER BY u.criado_em, u.nome, u.id) AS ordem
        FROM usuario_materias um
        JOIN usuarios u ON u.id = um.usuario_id
        WHERE u.perfil = 'instrutor'
          AND u.aprovado = TRUE
          AND u.chefe_ste = TRUE
      ) candidatos
      WHERE ordem = 1
      ON CONFLICT (materia_id) DO NOTHING
    `
  );

  const masterEmailConfigurado = getMasterEmailConfig();
  const existeMaster = masterEmailConfigurado
    ? await query("SELECT id, senha_hash FROM usuarios WHERE email = $1", [masterEmailConfigurado])
    : await query("SELECT id, senha_hash FROM usuarios WHERE id = $1", ["master"]);

  if (existeMaster.rowCount === 0) {
    const masterEmail = getMasterEmailConfig({ required: true });
    const masterPassword = getMasterPasswordConfig({ required: true });
    await query(
      `INSERT INTO usuarios (id, nome, nome_grade, email, senha_hash, perfil, aprovado)
       VALUES ($1, $2, $3, $4, $5, 'gestor', TRUE)`,
      [
        "master",
        process.env.MASTER_NAME || "Gestor Master",
        process.env.MASTER_NAME || "Gestor Master",
        masterEmail,
        await hashPassword(masterPassword),
      ]
    );
    return;
  }

  const master = existeMaster.rows[0];
  const masterPasswordConfigurado = getMasterPasswordConfig();
  if (masterPasswordConfigurado && masterSincronizaSenhaConfigurada()) {
    await query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [
      await hashPassword(masterPasswordConfigurado),
      master.id,
    ]);
    console.warn("Senha do gestor master sincronizada a partir de MASTER_PASSWORD.");
    return;
  }

  if (await masterUsaSenhaBloqueada(master.senha_hash)) {
    const masterPassword = masterPasswordConfigurado || getMasterPasswordConfig({ required: true });
    await query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [
      await hashPassword(masterPassword),
      master.id,
    ]);
    console.warn("Senha insegura do gestor master detectada e rotacionada a partir de MASTER_PASSWORD.");
  }
}

let initDbPromise = null;
async function ensureDbInit() {
  if (!initDbPromise) {
    initDbPromise = initDb().catch((error) => {
      initDbPromise = null;
      throw error;
    });
  }
  return initDbPromise;
}

async function getMateriasUsuario(usuarioId) {
  const result = await query(
    "SELECT materia_id FROM usuario_materias WHERE usuario_id = $1 ORDER BY materia_id",
    [usuarioId]
  );
  return result.rows.map((row) => row.materia_id);
}

async function getMateriasChefeUsuario(usuarioId) {
  const result = await query(
    `
      SELECT
        m.id,
        m.nome
      FROM materia_chefes mc
      JOIN materias m ON m.id = mc.materia_id
      WHERE mc.instrutor_id = $1
      ORDER BY m.nome
    `,
    [usuarioId]
  );
  return result.rows.map((row) => ({
    materiaId: row.id,
    materiaNome: row.nome,
  }));
}

async function getChefeDaMateria(materiaId) {
  const result = await query(
    `
      SELECT
        mc.materia_id,
        m.nome AS materia_nome,
        u.id AS instrutor_id,
        u.nome AS instrutor_nome,
        u.nome_grade AS instrutor_nome_grade,
        u.email AS instrutor_email
      FROM materia_chefes mc
      JOIN materias m ON m.id = mc.materia_id
      JOIN usuarios u ON u.id = mc.instrutor_id
      WHERE mc.materia_id = $1
      LIMIT 1
    `,
    [materiaId]
  );
  return result.rows[0] || null;
}

async function instrutorPodeLecionarMateria(instrutorId, materiaId) {
  if (!instrutorId || !materiaId) return false;
  const result = await query(
    `
      SELECT 1
      FROM usuarios u
      JOIN usuario_materias um ON um.usuario_id = u.id
      WHERE u.id = $1
        AND um.materia_id = $2
        AND u.perfil IN ('instrutor', 'gestor')
        AND u.aprovado = TRUE
      LIMIT 1
    `,
    [instrutorId, materiaId]
  );
  return result.rowCount > 0;
}

async function getCargaMateriaNaTurma({ turmaId, materiaId }) {
  if (!turmaId || !materiaId) {
    return { existe: false, cargaHoraria: 0, aulasLancadas: 0 };
  }

  const materiaResult = await query(
    `
      SELECT id, nome, COALESCE(carga_horaria, 0)::int AS carga_horaria
      FROM materias
      WHERE id = $1
      LIMIT 1
    `,
    [materiaId]
  );
  if (materiaResult.rowCount === 0) {
    return { existe: false, cargaHoraria: 0, aulasLancadas: 0 };
  }

  const materia = materiaResult.rows[0];
  const nomeMateriaNormalizado = normalizarTextoComparacao(materia.nome);
  const aulasResult = await query(
    `
      SELECT
        h.id,
        h.semana_id,
        h.dia,
        h.inicio,
        h.fim,
        h.materia_id,
        h.materia_nome,
        h.aula_corrente,
        s.inicio AS semana_inicio
      FROM horarios h
      LEFT JOIN semanas s ON s.id = h.semana_id
      WHERE h.turma_id = $1
        AND h.tipo = 'aula'
    `,
    [turmaId]
  );

  const aulasMateria = [];
  for (const row of aulasResult.rows) {
    const mesmaMateriaPorId = String(row.materia_id || "") === String(materia.id || "");
    const mesmaMateriaPorNome = normalizarTextoComparacao(row.materia_nome) === nomeMateriaNormalizado;
    if (mesmaMateriaPorId || mesmaMateriaPorNome) {
      aulasMateria.push(row);
    }
  }

  const semanaTimestamp = (valor) => {
    const data = valor instanceof Date
      ? valor
      : new Date(`${String(valor || "").slice(0, 10)}T00:00:00.000Z`);
    const tempo = data.getTime();
    return Number.isFinite(tempo) ? tempo : Number.MAX_SAFE_INTEGER;
  };

  const aulasOrdenadas = [...aulasMateria].sort((a, b) => {
    const diffSemana = semanaTimestamp(a.semana_inicio) - semanaTimestamp(b.semana_inicio);
    if (diffSemana !== 0) return diffSemana;
    const diffDia = diaOffset(a.dia) - diaOffset(b.dia);
    if (diffDia !== 0) return diffDia;
    const diffInicio = horarioParaMinutos(a.inicio) - horarioParaMinutos(b.inicio);
    if (diffInicio !== 0) return diffInicio;
    const diffFim = horarioParaMinutos(a.fim) - horarioParaMinutos(b.fim);
    if (diffFim !== 0) return diffFim;
    return String(a.id || "").localeCompare(String(b.id || ""), "pt-BR");
  });

  let progressoAtual = 0;
  for (const aula of aulasOrdenadas) {
    const manual = Number.parseInt(aula.aula_corrente, 10);
    const atual = Number.isFinite(manual) && manual > 0
      ? manual
      : (progressoAtual + 1);
    progressoAtual = atual;
  }

  return {
    existe: true,
    cargaHoraria: Number(materia.carga_horaria || 0),
    aulasLancadas: progressoAtual,
  };
}

async function getConfirmacaoHorariosInstrutor({ turmaId, semanaId, instrutorId }) {
  if (!turmaId || !semanaId || !instrutorId) return null;
  const result = await query(
    `
      SELECT *
      FROM confirmacoes_horarios_instrutor
      WHERE turma_id = $1
        AND semana_id = $2
        AND instrutor_id = $3
      LIMIT 1
    `,
    [turmaId, semanaId, instrutorId]
  );
  return result.rows[0] || null;
}

async function instrutorTemHorariosConfirmados({ turmaId, semanaId, instrutorId }) {
  const confirmacao = await getConfirmacaoHorariosInstrutor({ turmaId, semanaId, instrutorId });
  return Boolean(confirmacao);
}

async function aulaTravadaPorConfirmacao({ turmaId, semanaId, instrutorId, horarioCriadoEm }) {
  const confirmacao = await getConfirmacaoHorariosInstrutor({ turmaId, semanaId, instrutorId });
  if (!confirmacao) return false;

  const confirmadoMs = Date.parse(confirmacao.confirmado_em);
  const criadoMs = Date.parse(horarioCriadoEm || "");
  if (!Number.isFinite(confirmadoMs) || !Number.isFinite(criadoMs)) {
    return true;
  }

  return criadoMs <= confirmadoMs;
}

async function mapUsuario(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    nomeGrade: row.nome_grade,
    email: row.email,
    whatsapp: row.whatsapp || "",
    perfil: row.perfil,
    chefeSte: Boolean(row.chefe_ste),
    aprovado: row.aprovado,
    materias: await getMateriasUsuario(row.id),
    materiasChefe: row.perfil === "instrutor" ? await getMateriasChefeUsuario(row.id) : [],
    criadoEm: row.criado_em,
  };
}

async function getUsuarioPorId(id) {
  const result = await query("SELECT * FROM usuarios WHERE id = $1", [id]);
  return mapUsuario(result.rows[0]);
}

async function setUsuarioMaterias(usuarioId, materias = []) {
  const ids = [...new Set((Array.isArray(materias) ? materias : []).filter(Boolean))];
  await query("DELETE FROM usuario_materias WHERE usuario_id = $1", [usuarioId]);
  for (const materiaId of ids) {
    await query(
      `INSERT INTO usuario_materias (usuario_id, materia_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [usuarioId, materiaId]
    );
  }

  await query(
    `
      DELETE FROM materia_chefes mc
      WHERE mc.instrutor_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM usuario_materias um
          WHERE um.usuario_id = $1
            AND um.materia_id = mc.materia_id
        )
    `,
    [usuarioId]
  );
}

async function criarUsuario({ nome, nomeGrade, email, whatsapp, senha, perfil, aprovado, materias = [], chefeSte = false }) {
  const emailNormalizado = normalizarEmail(email);
  const id = gerarId(perfil);

  try {
    await query(
      `INSERT INTO usuarios (id, nome, nome_grade, email, whatsapp, senha_hash, perfil, chefe_ste, aprovado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        String(nome || "").trim(),
        String(nomeGrade || nome || "").trim(),
        emailNormalizado,
        String(whatsapp || "").trim(),
        await hashPassword(senha),
        perfil,
        perfil === "gestor" && Boolean(chefeSte),
        aprovado,
      ]
    );
  } catch (error) {
    if (error.code === "23505") {
      return { ok: false, mensagem: "Já existe usuário cadastrado com esse e-mail/login." };
    }
    throw error;
  }

  await setUsuarioMaterias(id, materias);
  return { ok: true, usuario: await getUsuarioPorId(id) };
}

async function mapMateria(row) {
  return {
    id: row.id,
    nome: row.nome,
    cargaHoraria: Number(row.carga_horaria || 0),
  };
}

async function mapTurma(row) {
  const materias = await query(
    "SELECT materia_id FROM turma_materias WHERE turma_id = $1 ORDER BY materia_id",
    [row.id]
  );
  return {
    id: row.id,
    nome: row.nome,
    materias: materias.rows.map((item) => item.materia_id),
  };
}

function mapSemana(row) {
  return {
    id: row.id,
    nome: row.nome,
    inicio: row.inicio instanceof Date ? row.inicio.toISOString().slice(0, 10) : row.inicio,
    fim: row.fim instanceof Date ? row.fim.toISOString().slice(0, 10) : row.fim,
  };
}

function mapHorario(row) {
  const aulaCorrente = Number.parseInt(row.aula_corrente, 10);
  const tipo = row.tipo || "aula";
  return {
    id: row.id,
    turmaId: row.turma_id,
    semanaId: row.semana_id,
    dia: row.dia,
    inicio: row.inicio,
    fim: row.fim,
    materiaId: row.materia_id || "",
    materiaNome: row.materia_nome || "",
    instrutorId: row.instrutor_id || "",
    instrutorNome: row.instrutor_nome || "",
    tipo,
    texto: row.texto || "",
    localInstrucao: normalizarLocalInstrucao(row.local_instrucao, tipo),
    prova: Boolean(row.prova),
    auxiliares: row.auxiliares || "",
    auxiliaresSolicitados: Number(row.auxiliares_solicitados || 0),
    auxiliaresAutorizados: Number(row.auxiliares_autorizados || 0),
    aulaCorrente: Number.isFinite(aulaCorrente) && aulaCorrente > 0 ? aulaCorrente : null,
    criadoEm: row.criado_em,
  };
}

function mapMensagem(row) {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    titulo: row.titulo,
    texto: row.texto,
    tipo: row.tipo,
    referenciaId: row.referencia_id || "",
    lida: Boolean(row.lida),
    criadoEm: row.criado_em instanceof Date ? row.criado_em.toISOString() : row.criado_em,
  };
}

function mapSolicitacaoModificacaoHorario(row) {
  return {
    id: row.id,
    instrutorId: row.instrutor_id,
    instrutorNome: row.instrutor_nome || "",
    turmaId: row.turma_id,
    turmaNome: row.turma_nome || "",
    semanaId: row.semana_id,
    semanaNome: row.semana_nome || "",
    motivo: row.motivo || "",
    status: row.status || "pendente",
    respostaSte: row.resposta_ste || "",
    criadoEm: row.criado_em instanceof Date ? row.criado_em.toISOString() : row.criado_em,
    atualizadoEm: row.atualizado_em instanceof Date ? row.atualizado_em.toISOString() : row.atualizado_em,
  };
}

async function criarMensagemInterna({ usuarioId, titulo, texto, tipo = "info", referenciaId = "" }) {
  if (!usuarioId) return;
  await query(
    `INSERT INTO mensagens (id, usuario_id, titulo, texto, tipo, referencia_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [gerarId("mensagem"), usuarioId, titulo, texto, tipo, String(referenciaId || "")]
  );
}

async function criarMensagemParaGestores({ titulo, texto, tipo = "info" }) {
  const result = await query("SELECT id FROM usuarios WHERE perfil = 'gestor' AND aprovado = TRUE");
  await Promise.all(result.rows.map((row) => criarMensagemInterna({
    usuarioId: row.id,
    titulo,
    texto,
    tipo,
  })));
}

async function notificarGestoresCadastroInstrutorPendente(instrutor) {
  if (!instrutor?.id) return;
  const gestores = await query("SELECT id FROM usuarios WHERE perfil = 'gestor' AND aprovado = TRUE");
  const nome = instrutor.nomeGrade || instrutor.nome || "Instrutor";
  const texto = [
    "Novo cadastro de instrutor pendente de aprovação.",
    "",
    `Nome: ${nome}`,
    `E-mail: ${instrutor.email || "-"}`,
    "",
    "Acesse a tela de aprovação para autorizar ou rejeitar este cadastro.",
  ].join("\n");

  await Promise.all(gestores.rows.map((gestor) => criarMensagemInterna({
    usuarioId: gestor.id,
    titulo: "Novo instrutor aguardando aprovação",
    texto,
    tipo: "cadastro_instrutor_pendente",
    referenciaId: instrutor.id,
  })));
}

async function cadastroInstrutorPendenteAindaAtivo(instrutorId) {
  if (!instrutorId) return false;
  const result = await query(
    `
      SELECT 1
      FROM usuarios
      WHERE id = $1
        AND perfil = 'instrutor'
        AND aprovado = FALSE
      LIMIT 1
    `,
    [instrutorId]
  );
  return result.rowCount > 0;
}

async function resolverAlertasCadastroInstrutor(instrutorId) {
  if (!instrutorId) return;
  await query(
    `
      UPDATE mensagens
      SET lida = TRUE
      WHERE tipo = 'cadastro_instrutor_pendente'
        AND referencia_id = $1
    `,
    [instrutorId]
  );
}

async function getHorarioDetalhadoPorId(id) {
  const result = await query(
    `
      SELECT
        h.*,
        t.nome AS turma_nome,
        s.nome AS semana_nome,
        s.inicio AS semana_inicio,
        s.fim AS semana_fim,
        u.email AS instrutor_email,
        u.whatsapp AS instrutor_whatsapp,
        u.nome AS usuario_nome,
        u.nome_grade AS usuario_nome_grade
      FROM horarios h
      LEFT JOIN turmas t ON t.id = h.turma_id
      LEFT JOIN semanas s ON s.id = h.semana_id
      LEFT JOIN usuarios u ON u.id = h.instrutor_id
      WHERE h.id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function getHorarioDetalhadoPorSlot({ turmaId, semanaId, dia, inicio }) {
  const result = await query(
    `
      SELECT
        h.*,
        t.nome AS turma_nome,
        s.nome AS semana_nome,
        s.inicio AS semana_inicio,
        s.fim AS semana_fim,
        u.email AS instrutor_email,
        u.whatsapp AS instrutor_whatsapp,
        u.nome AS usuario_nome,
        u.nome_grade AS usuario_nome_grade
      FROM horarios h
      LEFT JOIN turmas t ON t.id = h.turma_id
      LEFT JOIN semanas s ON s.id = h.semana_id
      LEFT JOIN usuarios u ON u.id = h.instrutor_id
      WHERE h.turma_id = $1
        AND h.semana_id = $2
        AND h.dia = $3
        AND h.inicio = $4
    `,
    [turmaId, semanaId, dia, inicio]
  );
  return result.rows[0] || null;
}

async function notificarInstrutorPorEmailEMensagem({
  row,
  titulo,
  tipo,
  texto,
  enviarEmail = false,
  subject,
}) {
  if (!row?.instrutor_id) return;

  await criarMensagemInterna({
    usuarioId: row.instrutor_id,
    titulo,
    texto,
    tipo,
  });

  if (!enviarEmail) return;

  const email = String(row.instrutor_email || "").trim();
  await enviarEmailSeguro({
    to: email,
    subject: subject || `E-STE | ${titulo}`,
    text: texto,
    contexto: tipo || "notificacao_instrutor",
  });
}

async function notificarAulaRemovida(row, autorNome, { enviarEmail = false } = {}) {
  if (!row?.instrutor_id) return;

  const texto = [
    "Aula cancelada pela STE.",
    "",
    descreverAula(row, { incluirDiaSemanaNaData: true }),
    "",
    ...linhasOrientacaoCancelamentoAula(),
    "",
    `Alteração registrada por: ${autorNome}.`,
  ].join("\n");

  await notificarInstrutorPorEmailEMensagem({
    row,
    titulo: "Aula cancelada",
    tipo: "cancelamento_aula",
    texto,
    enviarEmail,
    subject: ASSUNTO_EMAIL_AULA_CANCELADA,
  });
}

async function notificarAulaAlterada(rowAntes, rowDepois, autorNome) {
  if (!rowAntes?.instrutor_id) return;

  const turmaNome = rowDepois?.turma_nome || rowAntes?.turma_nome || rowAntes?.turma_id || "Turma";
  const texto = [
    "Foi atualizada uma aula em seu nome:",
    "",
    "Antes:",
    descreverAula(rowAntes),
    "",
    "Depois:",
    descreverAula(rowDepois),
    "",
    `Alteracao registrada por: ${autorNome}.`,
    "Acesse o E-STE para consultar a grade atualizada.",
  ].join("\n");

  await notificarInstrutorPorEmailEMensagem({
    row: rowAntes,
    titulo: "Aula alterada",
    tipo: "alteracao_aula",
    texto,
    enviarEmail: false,
  });
}

async function notificarAulaAtribuida(row, autorNome) {
  if (!row?.instrutor_id) return;

  const turmaNome = row.turma_nome || row.turma_id || "Turma";
  const semanaNome = row.semana_nome || row.semana_id || "Semana";
  const linkAgenda = criarLinkGoogleAgendaPeriodoAulas([row]);
  const texto = [
    "Foi adicionada uma aula em seu nome pela STE.",
    "",
    descreverAula(row),
    "",
    ...(linkAgenda ? [`Adicionar ao Google Agenda: ${linkAgenda}`, ""] : []),
    `Vinculada por: ${autorNome}.`,
    "Acesse o E-STE para consultar a grade atualizada.",
  ].join("\n");

  await notificarInstrutorPorEmailEMensagem({
    row,
    titulo: "Aula adicionada",
    tipo: "atribuicao_aula",
    texto,
    enviarEmail: false,
    subject: `${ASSUNTO_EMAIL_AULA_ADICIONADA} - ${turmaNome} - ${semanaNome}`,
  });
}

function isAulaComInstrutor(row) {
  return row?.tipo === "aula" && Boolean(row?.instrutor_id);
}

function aulaFoiAlterada(antes, depois) {
  if (!antes || !depois) return false;
  const campos = [
    "turma_id",
    "semana_id",
    "dia",
    "inicio",
    "fim",
    "materia_id",
    "materia_nome",
    "instrutor_id",
    "instrutor_nome",
    "tipo",
    "texto",
    "local_instrucao",
    "auxiliares",
  ];

  if (Boolean(antes.prova) !== Boolean(depois.prova)) return true;
  if (Number(antes.auxiliares_autorizados || 0) !== Number(depois.auxiliares_autorizados || 0)) return true;
  return campos.some((campo) => String(antes[campo] || "") !== String(depois[campo] || ""));
}

async function notificarAlteracaoDeDetalhes({ antes, depois, gestor }) {
  if (gestor?.perfil !== "gestor") return;
  if (!isAulaComInstrutor(antes)) return;
  if (!aulaFoiAlterada(antes, depois)) return;
  await notificarAulaAlterada(antes, depois, gestor?.nome || "Gestor");
}

async function notificarMudancaDeAula({ antes, depois, usuario, enviarEmailCancelamento = false }) {
  if (usuario?.perfil !== "gestor") return;

  const autorNome = usuario?.nome || usuario?.nomeGrade || "Usuário";
  const notificacoes = [];
  const antesEraAula = isAulaComInstrutor(antes);
  const depoisEhAula = isAulaComInstrutor(depois);

  if (antesEraAula) {
    if (!depoisEhAula || antes.instrutor_id !== depois.instrutor_id) {
      if (usuario?.perfil === "gestor") {
        notificacoes.push(notificarAulaRemovida(antes, autorNome, { enviarEmail: enviarEmailCancelamento }));
      }
    } else if (aulaFoiAlterada(antes, depois)) {
      notificacoes.push(notificarAulaAlterada(antes, depois, autorNome));
    }
  }

  if (depoisEhAula && (!antesEraAula || antes.instrutor_id !== depois.instrutor_id)) {
    notificacoes.push(notificarAulaAtribuida(depois, autorNome));
  }

  const resultados = await Promise.allSettled(notificacoes);
  resultados
    .filter((resultado) => resultado.status === "rejected")
    .forEach((resultado) => console.error("Falha ao registrar/enviar notificacao:", resultado.reason));
}

async function enviarEmailConfirmacaoInstrutor({ turmaId, semanaId, instrutor }) {
  if (!turmaId || !semanaId || !instrutor?.id) return { ok: false, motivo: "parametros_invalidos" };

  const aulasResult = await query(
    `
      SELECT
        h.*,
        t.nome AS turma_nome,
        s.nome AS semana_nome,
        s.inicio AS semana_inicio,
        s.fim AS semana_fim
      FROM horarios h
      JOIN turmas t ON t.id = h.turma_id
      JOIN semanas s ON s.id = h.semana_id
      WHERE h.turma_id = $1
        AND h.semana_id = $2
        AND h.instrutor_id = $3
        AND h.tipo = 'aula'
      ORDER BY h.dia, h.inicio
    `,
    [turmaId, semanaId, instrutor.id]
  );

  const aulas = aulasResult.rows || [];
  const primeiraAula = aulas[0] || {};
  const turmaNome = primeiraAula.turma_nome || turmaId;
  const semanaNome = primeiraAula.semana_nome || semanaId;
  const nomeInstrutor = instrutor.nomeGrade || instrutor.nome || "Instrutor";

  const linhasAulas = aulas.length > 0
    ? aulas.map((aula) => `- ${resumoAulaParaEmailQts(aula)}`)
    : ["- Nenhuma aula encontrada para esta confirmação."];

  const aulasPorDia = new Map();
  for (const aula of aulas) {
    const chave = `${aula.dia || "-"}|${dataDaAula(aula) || "-"}`;
    if (!aulasPorDia.has(chave)) aulasPorDia.set(chave, []);
    aulasPorDia.get(chave).push(aula);
  }

  const linhasPeriodosAgenda = [];
  for (const [chave, aulasDoDia] of aulasPorDia.entries()) {
    const linkAgenda = criarLinkGoogleAgendaPeriodoAulas(aulasDoDia);
    if (!linkAgenda) continue;
    const [diaTexto, dataTexto] = chave.split("|");
    const ordenadasNoDia = [...aulasDoDia].sort((a, b) => (
      horarioParaMinutos(a.inicio) - horarioParaMinutos(b.inicio)
    ));
    const inicioPeriodo = ordenadasNoDia[0]?.inicio || "-";
    const fimPeriodo = ordenadasNoDia[ordenadasNoDia.length - 1]?.fim || "-";
    linhasPeriodosAgenda.push(`- ${diaTexto} (${dataTexto}) | ${inicioPeriodo} - ${fimPeriodo}`);
    linhasPeriodosAgenda.push(`  Adicionar ao Google Agenda: ${linkAgenda}`);
  }

  const texto = [
    `Olá, ${nomeInstrutor}.`,
    "",
    "Sua confirmação de horários foi registrada no E-STE.",
    "",
    `Turma: ${turmaNome}`,
    `Semana: ${semanaNome}`,
    "",
    "Aulas confirmadas:",
    ...linhasAulas,
    "",
    "Links para adicionar períodos ao Google Agenda:",
    ...(linhasPeriodosAgenda.length > 0 ? linhasPeriodosAgenda : ["- Nenhum período disponível para gerar link."]),
    "",
    "Após a confirmação, é necessário contatar a STE para realizar modificações na grade.",
  ].join("\n");

  return enviarEmailSeguro({
    to: String(instrutor.email || "").trim(),
    subject: `E-STE | Confirmação de horários - ${turmaNome} - ${semanaNome}`,
    text: texto,
    contexto: "confirmacao_horarios_instrutor",
  });
}

function resumoAulaParaEmailQts(row) {
  const conteudo = row.materia_nome || row.texto || row.tipo || "Aula";
  const local = normalizarLocalInstrucao(row.local_instrucao, row.tipo);
  const prova = row.prova ? " | PROVA" : "";
  return [
    `${row.dia} ${row.inicio} - ${row.fim}`,
    conteudo,
    local ? `Local: ${local}` : "",
  ].filter(Boolean).join(" | ") + prova;
}

function linhasOrientacaoCancelamentoAula() {
  return [
    "Fique atento às atualizações na sua Google Agenda.",
    "Você pode entrar em contato com a STE ou verificar outros horários disponíveis no sistema para remarcar a sua aula.",
  ];
}

function normalizarAulaCanceladaQts(aula, contexto) {
  if (!aula || typeof aula !== "object") return null;

  const tipo = String(aula.tipo || "aula").trim() || "aula";
  const instrutorId = String(aula.instrutorId || aula.instrutor_id || "").trim();
  const turmaIdAula = String(aula.turmaId || aula.turma_id || contexto.turmaId || "").trim();
  const semanaIdAula = String(aula.semanaId || aula.semana_id || contexto.semanaId || "").trim();
  if (tipo !== "aula" || !instrutorId) return null;
  if (turmaIdAula && turmaIdAula !== contexto.turmaId) return null;
  if (semanaIdAula && semanaIdAula !== contexto.semanaId) return null;

  return {
    id: String(aula.id || "").trim(),
    turma_id: contexto.turmaId,
    semana_id: contexto.semanaId,
    turma_nome: String(aula.turmaNome || aula.turma_nome || contexto.turmaNomeBase || contexto.turmaId).trim(),
    semana_nome: String(aula.semanaNome || aula.semana_nome || contexto.semanaNomeBase || contexto.semanaId).trim(),
    semana_inicio: aula.semanaInicio || aula.semana_inicio || contexto.semanaInicioBase || null,
    semana_fim: aula.semanaFim || aula.semana_fim || contexto.semanaFimBase || null,
    dia: String(aula.dia || "").trim(),
    inicio: String(aula.inicio || "").trim(),
    fim: String(aula.fim || "").trim(),
    materia_id: String(aula.materiaId || aula.materia_id || "").trim(),
    materia_nome: String(aula.materiaNome || aula.materia_nome || "").trim(),
    instrutor_id: instrutorId,
    instrutor_nome: String(aula.instrutorNome || aula.instrutor_nome || "").trim(),
    tipo,
    texto: String(aula.texto || "").trim(),
    local_instrucao: normalizarLocalInstrucao(aula.localInstrucao || aula.local_instrucao || "", tipo),
    prova: Boolean(aula.prova),
    auxiliares: String(aula.auxiliares || "").trim(),
    auxiliares_autorizados: Number(aula.auxiliaresAutorizados ?? aula.auxiliares_autorizados ?? 0) || 0,
  };
}

function agruparAulasCanceladasQts(aulasCanceladas, contexto) {
  const grupos = new Map();
  const chaves = new Set();

  for (const item of Array.isArray(aulasCanceladas) ? aulasCanceladas : []) {
    const aula = normalizarAulaCanceladaQts(item, contexto);
    if (!aula) continue;

    const chave = aula.id || [
      aula.instrutor_id,
      aula.dia,
      aula.inicio,
      aula.fim,
      aula.materia_id,
      aula.materia_nome,
    ].join("|");
    if (chaves.has(chave)) continue;
    chaves.add(chave);

    if (!grupos.has(aula.instrutor_id)) grupos.set(aula.instrutor_id, []);
    grupos.get(aula.instrutor_id).push(aula);
  }

  return grupos;
}

function textoEmailAulasCanceladasQts(aulas) {
  const aulasOrdenadas = [...aulas].sort((a, b) => {
    const diffDia = diaOffset(a.dia) - diaOffset(b.dia);
    if (diffDia !== 0) return diffDia;
    return horarioParaMinutos(a.inicio) - horarioParaMinutos(b.inicio);
  });

  const linhas = [];
  aulasOrdenadas.forEach((aula, index) => {
    if (aulasOrdenadas.length > 1) {
      linhas.push(`Aula ${index + 1}:`);
    }
    linhas.push(descreverAula(aula, { incluirDiaSemanaNaData: true }));
    if (index < aulasOrdenadas.length - 1) linhas.push("");
  });

  return [
    aulasOrdenadas.length === 1
      ? "Aula cancelada pela STE."
      : "Aulas canceladas pela STE.",
    "",
    ...linhas,
    "",
    ...linhasOrientacaoCancelamentoAula(),
  ].join("\n");
}

function parseEstadoInstrutoresQts(valor) {
  if (!valor) return {};
  if (typeof valor === "object") return valor;
  try {
    const parsed = JSON.parse(String(valor));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function hashAulasQts(aulas = []) {
  const payload = aulas
    .map((aula) => ({
      dia: aula.dia || "",
      inicio: aula.inicio || "",
      fim: aula.fim || "",
      tipo: aula.tipo || "",
      materiaId: aula.materia_id || "",
      materiaNome: aula.materia_nome || "",
      texto: aula.texto || "",
      local: aula.local_instrucao || "",
      prova: Boolean(aula.prova),
    }))
    .sort((a, b) => {
      const diffDia = diaOffset(a.dia) - diaOffset(b.dia);
      if (diffDia !== 0) return diffDia;
      return horarioParaMinutos(a.inicio) - horarioParaMinutos(b.inicio);
    });
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function salvarEstadoConfirmacaoQts({ turmaId, semanaId, gestorId, estadoInstrutores }) {
  await query(
    `
      INSERT INTO qts_confirmacoes
        (id, turma_id, semana_id, gestor_id, estado_instrutores, confirmado_em)
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      ON CONFLICT (turma_id, semana_id)
      DO UPDATE SET
        gestor_id = EXCLUDED.gestor_id,
        estado_instrutores = EXCLUDED.estado_instrutores,
        confirmado_em = NOW()
    `,
    [gerarId("qts_confirmacao"), turmaId, semanaId, gestorId || null, JSON.stringify(estadoInstrutores || {})]
  );
}

async function enviarEmailsConfirmacaoQts({
  turmaId,
  semanaId,
  gestorNome,
  gestorId,
  instrutoresRemovidosForcados = [],
  aulasCanceladas = [],
}) {
  const [result, contextoTurmaSemana, confirmacaoAnterior] = await Promise.all([
    query(
      `
        SELECT
          h.*,
          t.nome AS turma_nome,
          s.nome AS semana_nome,
          s.inicio AS semana_inicio,
          s.fim AS semana_fim,
          u.nome AS usuario_nome,
          u.nome_grade AS usuario_nome_grade,
          u.email AS instrutor_email
        FROM horarios h
        JOIN turmas t ON t.id = h.turma_id
        JOIN semanas s ON s.id = h.semana_id
        JOIN usuarios u ON u.id = h.instrutor_id
        WHERE h.turma_id = $1
          AND h.semana_id = $2
          AND h.tipo = 'aula'
          AND h.instrutor_id IS NOT NULL
        ORDER BY u.nome_grade, u.nome, h.dia, h.inicio
      `,
      [turmaId, semanaId]
    ),
    query(
      `
        SELECT
          t.nome AS turma_nome,
          s.nome AS semana_nome,
          s.inicio AS semana_inicio,
          s.fim AS semana_fim
        FROM turmas t
        CROSS JOIN semanas s
        WHERE t.id = $1
          AND s.id = $2
        LIMIT 1
      `,
      [turmaId, semanaId]
    ),
    query(
      `
        SELECT estado_instrutores
        FROM qts_confirmacoes
        WHERE turma_id = $1
          AND semana_id = $2
        LIMIT 1
      `,
      [turmaId, semanaId]
    ),
  ]);

  const turmaNomeBase = contextoTurmaSemana.rows[0]?.turma_nome || turmaId;
  const semanaNomeBase = contextoTurmaSemana.rows[0]?.semana_nome || semanaId;
  const semanaInicioBase = contextoTurmaSemana.rows[0]?.semana_inicio || null;
  const semanaFimBase = contextoTurmaSemana.rows[0]?.semana_fim || null;
  const estadoAnterior = parseEstadoInstrutoresQts(confirmacaoAnterior.rows[0]?.estado_instrutores);
  const aulasCanceladasPorInstrutor = agruparAulasCanceladasQts(aulasCanceladas, {
    turmaId,
    semanaId,
    turmaNomeBase,
    semanaNomeBase,
    semanaInicioBase,
    semanaFimBase,
  });

  const aulas = result.rows;
  const porInstrutor = new Map();
  for (const aula of aulas) {
    const chave = aula.instrutor_id;
    if (!porInstrutor.has(chave)) {
      porInstrutor.set(chave, { instrutor: aula, aulas: [] });
    }
    porInstrutor.get(chave).aulas.push(aula);
  }

  const instrutoresComAula = porInstrutor.size;
  const estadoAtual = {};
  const instrutoresAlteradosSet = new Set();
  for (const [instrutorId, grupo] of porInstrutor.entries()) {
    const hashAtual = hashAulasQts(grupo.aulas || []);
    estadoAtual[instrutorId] = hashAtual;
    if (String(estadoAnterior[instrutorId] || "") !== hashAtual) {
      instrutoresAlteradosSet.add(instrutorId);
    }
  }
  for (const instrutorId of Object.keys(estadoAnterior || {})) {
    if (!Object.prototype.hasOwnProperty.call(estadoAtual, instrutorId)) {
      instrutoresAlteradosSet.add(instrutorId);
    }
  }
  const instrutoresRemovidosSet = new Set(
    [...instrutoresAlteradosSet].filter((instrutorId) => !porInstrutor.has(instrutorId))
  );
  for (const instrutorId of instrutoresRemovidosForcados) {
    if (!instrutorId) continue;
    instrutoresAlteradosSet.add(instrutorId);
    if (!porInstrutor.has(instrutorId)) instrutoresRemovidosSet.add(instrutorId);
  }
  const instrutoresRemovidosIds = [...instrutoresRemovidosSet];
  const instrutoresAlterados = instrutoresAlteradosSet.size;

  const dadosInstrutoresNotificados = new Map();
  const instrutoresParaBuscarIds = [...new Set([
    ...instrutoresRemovidosIds,
    ...aulasCanceladasPorInstrutor.keys(),
  ])];
  if (instrutoresParaBuscarIds.length > 0) {
    const removidosResult = await query(
      `
        SELECT id, nome, nome_grade, email
        FROM usuarios
        WHERE id = ANY($1::text[])
      `,
      [instrutoresParaBuscarIds]
    );
    for (const row of removidosResult.rows || []) {
      dadosInstrutoresNotificados.set(row.id, row);
    }
  }

  const smtpAtivo = smtpConfigured();
  const instrutoresComEmailValidoSet = new Set();
  let emailsEnviados = 0;

  for (const [instrutorId, aulasDoInstrutor] of aulasCanceladasPorInstrutor.entries()) {
    const dados = dadosInstrutoresNotificados.get(instrutorId);
    if (!dados) continue;

    const email = String(dados.email || "").trim();
    if (!smtpAtivo || !isEmailValido(email)) continue;
    instrutoresComEmailValidoSet.add(instrutorId);

    const envio = await enviarEmailSeguro({
      to: email,
      subject: ASSUNTO_EMAIL_AULA_CANCELADA,
      text: textoEmailAulasCanceladasQts(aulasDoInstrutor),
      contexto: "confirmacao_qts_cancelamento",
    });
    if (envio.ok) emailsEnviados += 1;
  }

  for (const grupo of porInstrutor.values()) {
    const instrutorId = grupo.instrutor.instrutor_id;
    if (!instrutoresAlteradosSet.has(instrutorId)) continue;
    if (aulasCanceladasPorInstrutor.has(instrutorId)) continue;

    const email = String(grupo.instrutor.instrutor_email || "").trim();
    if (!smtpAtivo || !isEmailValido(email)) continue;
    instrutoresComEmailValidoSet.add(instrutorId);

    const nomeInstrutor = grupo.instrutor.usuario_nome_grade || grupo.instrutor.usuario_nome || "Instrutor";
    const turmaNome = grupo.instrutor.turma_nome || turmaNomeBase;
    const semanaNome = grupo.instrutor.semana_nome || semanaNomeBase;
    const aulasOrdenadas = [...grupo.aulas].sort((a, b) => {
      const diffDia = diaOffset(a.dia) - diaOffset(b.dia);
      if (diffDia !== 0) return diffDia;
      return horarioParaMinutos(a.inicio) - horarioParaMinutos(b.inicio);
    });
    const linhasAulas = aulasOrdenadas.map((aula) => `- ${resumoAulaParaEmailQts(aula)}`);

    const aulasPorDia = new Map();
    for (const aula of aulasOrdenadas) {
      const chave = `${aula.dia || "-"}|${dataDaAula(aula) || "-"}`;
      if (!aulasPorDia.has(chave)) aulasPorDia.set(chave, []);
      aulasPorDia.get(chave).push(aula);
    }

    const linhasPeriodosAgenda = [];
    for (const [chave, aulasDoDia] of aulasPorDia.entries()) {
      const linkAgenda = criarLinkGoogleAgendaPeriodoAulas(aulasDoDia);
      if (!linkAgenda) continue;

      const [diaTexto, dataTexto] = chave.split("|");
      const ordenadasNoDia = [...aulasDoDia].sort((a, b) => (
        horarioParaMinutos(a.inicio) - horarioParaMinutos(b.inicio)
      ));
      const inicioPeriodo = ordenadasNoDia[0]?.inicio || "-";
      const fimPeriodo = ordenadasNoDia[ordenadasNoDia.length - 1]?.fim || "-";

      linhasPeriodosAgenda.push(`- ${diaTexto} (${dataTexto}) | ${inicioPeriodo} - ${fimPeriodo}`);
      linhasPeriodosAgenda.push(`  Adicionar ao Google Agenda: ${linkAgenda}`);
    }
    const texto = [
      "O QTS foi confirmado pela STE.",
      "",
      `Turma: ${turmaNome}`,
      `Semana: ${semanaNome}`,
      `Instrutor: ${nomeInstrutor}`,
      "",
      "Aulas registradas para você nesta confirmação:",
      ...linhasAulas,
      "",
      "Links para adicionar períodos ao Google Agenda:",
      ...(linhasPeriodosAgenda.length > 0 ? linhasPeriodosAgenda : ["- Nenhum período disponível para gerar link."]),
      "",
      `Confirmado por: ${gestorNome}`,
      "Acesse o E-STE para consultar a grade completa.",
    ].join("\n");

    const envio = await enviarEmailSeguro({
      to: email,
      subject: `E-STE | QTS confirmado - ${turmaNome} - ${semanaNome}`,
      text: texto,
      contexto: "confirmacao_qts",
    });
    if (envio.ok) emailsEnviados += 1;
  }

  for (const instrutorId of instrutoresRemovidosIds) {
    if (aulasCanceladasPorInstrutor.has(instrutorId)) continue;

    const dados = dadosInstrutoresNotificados.get(instrutorId);
    if (!dados) continue;

    const email = String(dados.email || "").trim();
    if (!smtpAtivo || !isEmailValido(email)) continue;
    instrutoresComEmailValidoSet.add(instrutorId);

    const nomeInstrutor = dados.nome_grade || dados.nome || "Instrutor";
    const texto = [
      "O QTS foi confirmado pela STE.",
      "",
      `Turma: ${turmaNomeBase}`,
      `Semana: ${semanaNomeBase}`,
      `Instrutor: ${nomeInstrutor}`,
      "",
      "Suas aulas para este período foram canceladas pela STE.",
      ...linhasOrientacaoCancelamentoAula(),
      "",
      `Confirmado por: ${gestorNome}`,
    ].join("\n");

    const envio = await enviarEmailSeguro({
      to: email,
      subject: ASSUNTO_EMAIL_AULA_CANCELADA,
      text: texto,
      contexto: "confirmacao_qts_cancelamento",
    });
    if (envio.ok) emailsEnviados += 1;
  }

  await salvarEstadoConfirmacaoQts({
    turmaId,
    semanaId,
    gestorId,
    estadoInstrutores: estadoAtual,
  });

  return {
    configurado: smtpAtivo,
    instrutoresComAula,
    instrutoresAlterados,
    instrutoresComEmailValido: instrutoresComEmailValidoSet.size,
    emailsEnviados,
    instrutoresRemovidos: instrutoresRemovidosIds.length,
  };
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ ok: false, mensagem: "Sessão não informada." });

  const result = await query(
    `SELECT u.*
     FROM sessoes s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token = $1 AND s.expira_em > NOW()`,
    [token]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ ok: false, mensagem: "Sessão expirada ou inválida." });
  }

  req.authToken = token;
  req.user = await mapUsuario(result.rows[0]);
  next();
}

function requireGestor(req, res, next) {
  if (req.user?.perfil !== "gestor") {
    return res.status(403).json({ ok: false, mensagem: "Acesso restrito a gestores." });
  }
  next();
}

function canEditUser(req, userId) {
  return req.user?.perfil === "gestor" || req.user?.id === userId;
}

async function getConfiguracaoSistema(chave, fallback = "") {
  if (!chave) return String(fallback || "");
  const result = await query(
    "SELECT valor FROM configuracoes_sistema WHERE chave = $1 LIMIT 1",
    [chave]
  );
  if (result.rowCount === 0) return String(fallback || "");
  return String(result.rows[0]?.valor || "");
}

async function setConfiguracaoSistema(chave, valor) {
  if (!chave) return;
  await query(
    `
      INSERT INTO configuracoes_sistema (chave, valor, atualizado_em)
      VALUES ($1, $2, NOW())
      ON CONFLICT (chave)
      DO UPDATE SET
        valor = EXCLUDED.valor,
        atualizado_em = NOW()
    `,
    [chave, String(valor || "")]
  );
}

async function obterContatoSte() {
  const [chefeSte, whatsappConfigurado] = await Promise.all([
    query(
      `
        SELECT nome, nome_grade, whatsapp, email
        FROM usuarios
        WHERE perfil = 'gestor'
          AND aprovado = TRUE
          AND chefe_ste = TRUE
        ORDER BY criado_em
        LIMIT 1
      `
    ),
    getConfiguracaoSistema("ste_whatsapp", ""),
  ]);

  const row = chefeSte.rows[0] || {};
  const nome = String(row.nome_grade || row.nome || "STE");
  const whatsapp = String(whatsappConfigurado || row.whatsapp || process.env.STE_WHATSAPP || "").trim();
  const email = String(row.email || process.env.STE_EMAIL || "").trim();

  return { nome, whatsapp, email };
}

app.get("/api/health", asyncRoute(async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true, email: statusNotificacaoEmail(), banco: { conectado: true } });
}));

app.get("/api/notificacoes/email/status", auth, requireGestor, (_req, res) => {
  res.json({ ok: true, email: statusNotificacaoEmail() });
});

app.get("/api/contato-ste", auth, asyncRoute(async (_req, res) => {
  const contato = await obterContatoSte();
  res.json({ ok: true, contato });
}));

app.get("/api/admin/contato-ste", auth, requireGestor, asyncRoute(async (_req, res) => {
  const contato = await obterContatoSte();
  res.json({ ok: true, contato });
}));

app.put("/api/admin/contato-ste", auth, requireGestor, asyncRoute(async (req, res) => {
  const whatsapp = String(req.body?.whatsapp || "").trim();
  await setConfiguracaoSistema("ste_whatsapp", whatsapp);
  const contato = await obterContatoSte();
  res.json({
    ok: true,
    mensagem: "Contato da STE atualizado com sucesso.",
    contato,
  });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const email = normalizarEmail(req.body.email);
  const result = await query("SELECT * FROM usuarios WHERE email = $1", [email]);
  const usuario = result.rows[0];

  if (!usuario || !(await verifyPassword(req.body.senha, usuario.senha_hash))) {
    return res.status(401).json({ ok: false, mensagem: "Usuário ou senha inválidos." });
  }

  if (!usuario.aprovado) {
    return res.status(403).json({ ok: false, mensagem: "Cadastro encontrado, mas ainda não aprovado pelo gestor." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    "INSERT INTO sessoes (token, usuario_id, expira_em) VALUES ($1, $2, $3)",
    [token, usuario.id, expiraEm]
  );

  res.json({ ok: true, token, usuario: sanitizeUser(await mapUsuario(usuario)) });
}));

app.get("/api/auth/me", auth, (req, res) => {
  res.json({ ok: true, usuario: req.user });
});

app.post("/api/auth/logout", auth, asyncRoute(async (req, res) => {
  await query("DELETE FROM sessoes WHERE token = $1", [req.authToken]);
  res.json({ ok: true });
}));

app.get("/api/mensagens", auth, asyncRoute(async (req, res) => {
  const result = await query(
    `SELECT *
     FROM mensagens
     WHERE usuario_id = $1
     ORDER BY lida ASC, criado_em DESC
     LIMIT 50`,
    [req.user.id]
  );
  res.json({ ok: true, mensagens: result.rows.map(mapMensagem) });
}));

app.patch("/api/mensagens/lidas", auth, asyncRoute(async (req, res) => {
  await query(
    `
      UPDATE mensagens m
      SET lida = TRUE
      WHERE m.usuario_id = $1
        AND NOT (
          m.tipo = 'cadastro_instrutor_pendente'
          AND m.referencia_id <> ''
          AND EXISTS (
            SELECT 1
            FROM usuarios u
            WHERE u.id = m.referencia_id
              AND u.perfil = 'instrutor'
              AND u.aprovado = FALSE
          )
        )
    `,
    [req.user.id]
  );
  res.json({ ok: true });
}));

app.patch("/api/mensagens/:id/lida", auth, asyncRoute(async (req, res) => {
  const mensagemAtual = await query(
    "SELECT * FROM mensagens WHERE id = $1 AND usuario_id = $2 LIMIT 1",
    [req.params.id, req.user.id]
  );
  if (mensagemAtual.rowCount === 0) {
    return res.status(404).json({ ok: false, mensagem: "Mensagem não encontrada." });
  }

  const atual = mensagemAtual.rows[0];
  const bloqueada = atual.tipo === "cadastro_instrutor_pendente"
    && await cadastroInstrutorPendenteAindaAtivo(atual.referencia_id);
  if (bloqueada) {
    return res.json({ ok: true, mensagem: mapMensagem(atual) });
  }

  const result = await query(
    `UPDATE mensagens
     SET lida = TRUE
     WHERE id = $1 AND usuario_id = $2
     RETURNING *`,
    [req.params.id, req.user.id]
  );

  res.json({ ok: true, mensagem: mapMensagem(result.rows[0]) });
}));

app.post("/api/instrutores", asyncRoute(async (req, res) => {
  const resultado = await criarUsuario({
    ...req.body,
    perfil: "instrutor",
    aprovado: false,
  });
  if (resultado.ok) {
    await notificarGestoresCadastroInstrutorPendente(resultado.usuario);
  }
  res.status(resultado.ok ? 201 : 409).json(resultado);
}));

app.post("/api/admin/gestores", auth, requireGestor, asyncRoute(async (req, res) => {
  const resultado = await criarUsuario({
    ...req.body,
    perfil: "gestor",
    aprovado: true,
    materias: [],
  });
  res.status(resultado.ok ? 201 : 409).json(resultado);
}));

app.post("/api/admin/instrutores", auth, requireGestor, asyncRoute(async (req, res) => {
  const resultado = await criarUsuario({
    ...req.body,
    perfil: "instrutor",
    aprovado: true,
  });
  res.status(resultado.ok ? 201 : 409).json(resultado);
}));

app.post("/api/admin/convocacoes/materia", auth, requireGestor, asyncRoute(async (req, res) => {
  const materiaId = String(req.body.materiaId || "");
  const periodoInicio = String(req.body.periodoInicio || "");
  const periodoFim = String(req.body.periodoFim || "");
  const observacao = String(req.body.observacao || "").trim();

  if (!materiaId || !periodoInicio || !periodoFim) {
    return res.status(400).json({
      ok: false,
      mensagem: "Informe matéria e período (início/fim) para enviar a convocação.",
    });
  }

  const [materiaResult, instrutoresResult] = await Promise.all([
    query("SELECT id, nome FROM materias WHERE id = $1 LIMIT 1", [materiaId]),
    query(
      `
        SELECT DISTINCT u.id, u.nome, u.nome_grade, u.email
        FROM usuarios u
        JOIN usuario_materias um ON um.usuario_id = u.id
        WHERE um.materia_id = $1
          AND u.aprovado = TRUE
          AND (
            u.perfil = 'instrutor'
            OR EXISTS (
              SELECT 1
              FROM materia_chefes mc
              WHERE mc.materia_id = um.materia_id
                AND mc.instrutor_id = u.id
            )
          )
        ORDER BY u.nome
      `,
      [materiaId]
    ),
  ]);

  if (materiaResult.rowCount === 0) {
    return res.status(404).json({ ok: false, mensagem: "Matéria não encontrada." });
  }

  const instrutores = instrutoresResult.rows;
  if (instrutores.length === 0) {
    return res.status(400).json({
      ok: false,
      mensagem: "Não há destinatários elegíveis para essa matéria.",
    });
  }

  const materiaNome = materiaResult.rows[0].nome;
  const inicioFmt = formatDateTimeBR(periodoInicio);
  const fimFmt = formatDateTimeBR(periodoFim);
  const smtpAtivo = smtpConfigured();

  let instrutoresComEmailValido = 0;
  let emailsEnviados = 0;

  for (const instrutor of instrutores) {
    const nomeInstrutor = instrutor.nome_grade || instrutor.nome || "Instrutor";
    const texto = [
      `Olá, ${nomeInstrutor}.`,
      "",
      `No período de ${inicioFmt} até ${fimFmt}, será necessário de instrutores para a matéria ${materiaNome}.`,
      observacao ? `Observação do gestor: ${observacao}` : "",
      "",
      `Solicitação enviada por: ${req.user.nome}.`,
      "Acesse o E-STE para verificar sua disponibilidade de horário.",
    ].filter(Boolean).join("\n");

    await criarMensagemInterna({
      usuarioId: instrutor.id,
      titulo: "Convocação de instrutores por matéria",
      texto,
      tipo: "convocacao_materia",
    });

    const email = String(instrutor.email || "").trim();
    if (!smtpAtivo || !isEmailValido(email)) continue;
    instrutoresComEmailValido += 1;

    const envio = await enviarEmailSeguro({
      to: email,
      subject: `E-STE | Necessidade de instrutores - ${materiaNome}`,
      text: texto,
      contexto: "convocacao_materia",
    });
    if (envio.ok) emailsEnviados += 1;
  }

  const mensagem = smtpAtivo
    ? `Convocação enviada. E-mails disparados para ${emailsEnviados} de ${instrutoresComEmailValido} instrutor(es) com e-mail válido.`
    : "Convocação registrada, mas o SMTP não está configurado para envio de e-mails.";

  res.json({
    ok: true,
    mensagem,
    resultado: {
      materiaId,
      materiaNome,
      periodoInicio,
      periodoFim,
      instrutoresAlvo: instrutores.length,
      instrutoresComEmailValido,
      emailsEnviados,
      smtpConfigurado: smtpAtivo,
    },
  });
}));

app.post("/api/admin/comunicacoes/chefe-materia", auth, requireGestor, asyncRoute(async (req, res) => {
  const materiaId = String(req.body.materiaId || "");
  const periodoInicio = String(req.body.periodoInicio || "");
  const periodoFim = String(req.body.periodoFim || "");
  const observacao = String(req.body.observacao || "").trim();

  if (!materiaId || !periodoInicio || !periodoFim) {
    return res.status(400).json({
      ok: false,
      mensagem: "Informe matéria e período (início/fim) para comunicar o chefe da pasta.",
    });
  }

  const inicioMs = Date.parse(periodoInicio);
  const fimMs = Date.parse(periodoFim);
  if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || inicioMs > fimMs) {
    return res.status(400).json({
      ok: false,
      mensagem: "Período inválido. Verifique data/hora inicial e final.",
    });
  }

  const materiaResult = await query("SELECT id, nome FROM materias WHERE id = $1 LIMIT 1", [materiaId]);
  if (materiaResult.rowCount === 0) {
    return res.status(404).json({ ok: false, mensagem: "Matéria não encontrada." });
  }

  const chefe = await getChefeDaMateria(materiaId);
  if (!chefe) {
    return res.status(400).json({
      ok: false,
      mensagem: "Não há chefe da pasta cadastrado para essa matéria.",
    });
  }

  const materiaNome = materiaResult.rows[0].nome;
  const inicioFmt = formatDateTimeBR(periodoInicio);
  const fimFmt = formatDateTimeBR(periodoFim);
  const nomeChefe = chefe.instrutor_nome_grade || chefe.instrutor_nome || "Instrutor";

  const texto = [
    `Olá, ${nomeChefe}.`,
    "",
    `No período de ${inicioFmt} até ${fimFmt}, será necessário de instrutores para a matéria ${materiaNome}.`,
    observacao ? `Observação do gestor: ${observacao}` : "",
    "",
    `Solicitação enviada por: ${req.user.nome}.`,
    "Acesse o E-STE para verificar os detalhes.",
  ].filter(Boolean).join("\n");

  await criarMensagemInterna({
    usuarioId: chefe.instrutor_id,
    titulo: "Comunicado ao chefe da pasta",
    texto,
    tipo: "comunicacao_chefe_materia",
  });

  const smtpAtivo = smtpConfigured();
  const emailChefe = String(chefe.instrutor_email || "").trim();
  const possuiEmailValido = smtpAtivo && isEmailValido(emailChefe);
  let emailEnviado = false;
  if (possuiEmailValido) {
    const envio = await enviarEmailSeguro({
      to: emailChefe,
      subject: `E-STE | Comunicação ao chefe - ${materiaNome}`,
      text: texto,
      contexto: "comunicacao_chefe_materia",
    });
    emailEnviado = envio.ok;
  }

  const mensagem = smtpAtivo
    ? (emailEnviado
      ? "Comunicação enviada ao chefe da pasta e e-mail disparado com sucesso."
      : "Comunicação registrada no sistema, mas o e-mail do chefe não foi disparado.")
    : "Comunicação registrada no sistema. SMTP não configurado para envio de e-mail.";

  res.json({
    ok: true,
    mensagem,
    resultado: {
      materiaId,
      materiaNome,
      periodoInicio,
      periodoFim,
      chefeId: chefe.instrutor_id,
      chefeNome: nomeChefe,
      possuiEmailValido,
      emailEnviado,
      smtpConfigurado: smtpAtivo,
    },
  });
}));

app.post("/api/admin/comunicacoes/pretensao-materia", auth, requireGestor, asyncRoute(async (req, res) => {
  const materiaId = String(req.body.materiaId || "");
  const instrutorInteressadoId = String(req.body.instrutorInteressadoId || "");
  const observacao = String(req.body.observacao || "").trim();

  if (!materiaId || !instrutorInteressadoId) {
    return res.status(400).json({
      ok: false,
      mensagem: "Informe a matéria e o instrutor com pretensão de lecionar.",
    });
  }

  const [materiaResult, instrutorResult] = await Promise.all([
    query("SELECT id, nome FROM materias WHERE id = $1 LIMIT 1", [materiaId]),
    query(
      `
        SELECT id, nome, nome_grade, email
        FROM usuarios
        WHERE id = $1
          AND perfil = 'instrutor'
          AND aprovado = TRUE
        LIMIT 1
      `,
      [instrutorInteressadoId]
    ),
  ]);

  if (materiaResult.rowCount === 0) {
    return res.status(404).json({ ok: false, mensagem: "Matéria não encontrada." });
  }
  if (instrutorResult.rowCount === 0) {
    return res.status(404).json({ ok: false, mensagem: "Instrutor informado não foi encontrado." });
  }
  if (!(await instrutorPodeLecionarMateria(instrutorInteressadoId, materiaId))) {
    return res.status(400).json({
      ok: false,
      mensagem: "O instrutor informado não está vinculado à matéria selecionada.",
    });
  }
  const materiaNome = materiaResult.rows[0].nome;
  const instrutorInteressado = instrutorResult.rows[0];
  const nomeInteressado = instrutorInteressado.nome_grade || instrutorInteressado.nome || "Instrutor";
  const mensagem = "Fluxo de aviso ao chefe da pasta desativado: nenhum aviso foi enviado.";

  res.json({
    ok: true,
    mensagem,
    resultado: {
      materiaId,
      materiaNome,
      instrutorInteressadoId,
      instrutorInteressadoNome: nomeInteressado,
      chefeId: "",
      chefeNome: "",
      chefesNotificados: 0,
      chefesComEmailValido: 0,
      emailsEnviados: 0,
      smtpConfigurado: false,
      observacao: observacao || "",
      solicitadoPor: req.user.nome || "",
    },
  });
}));

app.post("/api/admin/solicitacoes/gestor-aulas", auth, requireGestor, asyncRoute(async (req, res) => {
  const gestorDestinoId = String(req.body.gestorDestinoId || "");
  const periodoInicio = String(req.body.periodoInicio || "");
  const periodoFim = String(req.body.periodoFim || "");
  const observacao = String(req.body.observacao || "").trim();

  if (!gestorDestinoId || !periodoInicio || !periodoFim) {
    return res.status(400).json({
      ok: false,
      mensagem: "Informe gestor e período (início/fim) para solicitar apoio.",
    });
  }

  if (gestorDestinoId === req.user.id) {
    return res.status(400).json({
      ok: false,
      mensagem: "Selecione outro gestor para enviar a solicitação.",
    });
  }

  const gestorDestinoResult = await query(
    `
      SELECT id, nome, nome_grade, email
      FROM usuarios
      WHERE id = $1
        AND perfil = 'gestor'
        AND aprovado = TRUE
      LIMIT 1
    `,
    [gestorDestinoId]
  );

  if (gestorDestinoResult.rowCount === 0) {
    return res.status(404).json({ ok: false, mensagem: "Gestor informado não foi encontrado." });
  }

  const gestorDestino = gestorDestinoResult.rows[0];
  const inicioFmt = formatDateTimeBR(periodoInicio);
  const fimFmt = formatDateTimeBR(periodoFim);
  const texto = [
    `O gestor ${req.user.nome} solicitou seu apoio para ministrar aulas.`,
    "",
    `Periodo solicitado: ${inicioFmt} até ${fimFmt}`,
    observacao ? `Observação: ${observacao}` : "",
    "",
    "Responda no E-STE para alinhamento da grade.",
  ].filter(Boolean).join("\n");

  await criarMensagemInterna({
    usuarioId: gestorDestino.id,
    titulo: "Solicitação de apoio para aulas",
    texto,
    tipo: "solicitacao_gestor_aulas",
  });

  let emailEnviado = false;
  const smtpAtivo = smtpConfigured();
  if (smtpAtivo && isEmailValido(gestorDestino.email)) {
    const envio = await enviarEmailSeguro({
      to: gestorDestino.email,
      subject: "E-STE | Solicitação de apoio para aulas",
      text: texto,
      contexto: "solicitacao_gestor_aulas",
    });
    emailEnviado = envio.ok;
  }

  const mensagem = smtpAtivo
    ? (emailEnviado
      ? "Solicitação enviada ao gestor e e-mail disparado com sucesso."
      : "Solicitação enviada no sistema. E-mail não foi disparado para o gestor selecionado.")
    : "Solicitação enviada no sistema. SMTP não configurado para envio de e-mail.";

  res.json({
    ok: true,
    mensagem,
    resultado: {
      gestorDestinoId: gestorDestino.id,
      gestorDestinoNome: gestorDestino.nome_grade || gestorDestino.nome || "",
      periodoInicio,
      periodoFim,
      emailEnviado,
      smtpConfigurado: smtpAtivo,
    },
  });
}));

app.get("/api/usuarios/instrutores", auth, requireGestor, asyncRoute(async (_req, res) => {
  const result = await query("SELECT * FROM usuarios WHERE perfil = 'instrutor' AND aprovado = TRUE ORDER BY nome");
  res.json({ ok: true, usuarios: await Promise.all(result.rows.map(mapUsuario)) });
}));

app.get("/api/usuarios/instrutores-pendentes", auth, requireGestor, asyncRoute(async (_req, res) => {
  const result = await query("SELECT * FROM usuarios WHERE perfil = 'instrutor' AND aprovado = FALSE ORDER BY criado_em");
  res.json({ ok: true, usuarios: await Promise.all(result.rows.map(mapUsuario)) });
}));

app.get("/api/usuarios/gestores", auth, requireGestor, asyncRoute(async (_req, res) => {
  const result = await query("SELECT * FROM usuarios WHERE perfil = 'gestor' AND aprovado = TRUE ORDER BY nome");
  res.json({ ok: true, usuarios: await Promise.all(result.rows.map(mapUsuario)) });
}));

app.get("/api/usuarios/:id", auth, asyncRoute(async (req, res) => {
  if (!canEditUser(req, req.params.id)) {
    return res.status(403).json({ ok: false, mensagem: "Acesso negado." });
  }
  res.json({ ok: true, usuario: await getUsuarioPorId(req.params.id) });
}));

app.patch("/api/usuarios/:id", auth, asyncRoute(async (req, res) => {
  if (!canEditUser(req, req.params.id)) {
    return res.status(403).json({ ok: false, mensagem: "Acesso negado." });
  }

  const campos = [];
  const valores = [];
  const addCampo = (coluna, valor) => {
    valores.push(valor);
    campos.push(`${coluna} = $${valores.length}`);
  };

  if (req.body.nome !== undefined) addCampo("nome", String(req.body.nome).trim());
  if (req.body.nomeGrade !== undefined) addCampo("nome_grade", String(req.body.nomeGrade).trim());
  if (req.body.email !== undefined) addCampo("email", normalizarEmail(req.body.email));
  if (req.body.whatsapp !== undefined) addCampo("whatsapp", String(req.body.whatsapp || "").trim());
  if (req.body.senha) addCampo("senha_hash", await hashPassword(req.body.senha));
  if (req.user.perfil === "gestor" && req.body.chefeSte !== undefined) addCampo("chefe_ste", Boolean(req.body.chefeSte));
  if (req.user.perfil === "gestor" && req.body.aprovado !== undefined) addCampo("aprovado", Boolean(req.body.aprovado));

  if (campos.length > 0) {
    valores.push(req.params.id);
    try {
      await query(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = $${valores.length}`, valores);
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ ok: false, mensagem: "Já existe usuário cadastrado com esse e-mail/login." });
      }
      throw error;
    }
  }

  if (req.body.materias !== undefined) {
    await setUsuarioMaterias(req.params.id, req.body.materias);
  }

  res.json({ ok: true, usuario: await getUsuarioPorId(req.params.id) });
}));

app.patch("/api/usuarios/:id/materias", auth, asyncRoute(async (req, res) => {
  if (!canEditUser(req, req.params.id)) {
    return res.status(403).json({ ok: false, mensagem: "Acesso negado." });
  }
  await setUsuarioMaterias(req.params.id, req.body.materias);
  res.json({ ok: true, usuario: await getUsuarioPorId(req.params.id) });
}));

app.patch("/api/usuarios/:id/aprovar", auth, requireGestor, asyncRoute(async (req, res) => {
  await query(
    "UPDATE usuarios SET aprovado = TRUE, chefe_ste = FALSE WHERE id = $1 AND perfil = 'instrutor'",
    [req.params.id]
  );
  await resolverAlertasCadastroInstrutor(req.params.id);
  res.json({ ok: true, usuario: await getUsuarioPorId(req.params.id) });
}));

app.delete("/api/usuarios/:id", auth, requireGestor, asyncRoute(async (req, res) => {
  if (req.params.id === "master") {
    return res.status(400).json({ ok: false, mensagem: "O gestor master não pode ser removido." });
  }
  await resolverAlertasCadastroInstrutor(req.params.id);
  await query("DELETE FROM usuarios WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

app.get("/api/materias", auth, asyncRoute(async (_req, res) => {
  const result = await query("SELECT * FROM materias ORDER BY nome");
  res.json({ ok: true, materias: await Promise.all(result.rows.map(mapMateria)) });
}));

app.get("/api/materias/chefes", auth, requireGestor, asyncRoute(async (_req, res) => {
  const result = await query(
    `
      SELECT
        mc.materia_id,
        m.nome AS materia_nome,
        u.id AS instrutor_id,
        u.nome AS instrutor_nome,
        u.nome_grade AS instrutor_nome_grade,
        u.email AS instrutor_email
      FROM materia_chefes mc
      JOIN materias m ON m.id = mc.materia_id
      JOIN usuarios u ON u.id = mc.instrutor_id
      ORDER BY m.nome
    `
  );

  res.json({
    ok: true,
    chefes: result.rows.map((row) => ({
      materiaId: row.materia_id,
      materiaNome: row.materia_nome,
      instrutorId: row.instrutor_id,
      instrutorNome: row.instrutor_nome,
      instrutorNomeGrade: row.instrutor_nome_grade || row.instrutor_nome,
      instrutorEmail: row.instrutor_email || "",
    })),
  });
}));

app.put("/api/materias/:id/chefe", auth, requireGestor, asyncRoute(async (req, res) => {
  const materiaId = String(req.params.id || "");
  const instrutorId = String(req.body?.instrutorId || "").trim();

  const materiaResult = await query("SELECT id, nome FROM materias WHERE id = $1 LIMIT 1", [materiaId]);
  if (materiaResult.rowCount === 0) {
    return res.status(404).json({ ok: false, mensagem: "Matéria não encontrada." });
  }

  if (!instrutorId) {
    await query("DELETE FROM materia_chefes WHERE materia_id = $1", [materiaId]);
    return res.json({
      ok: true,
      mensagem: "Chefe da pasta removido para a matéria selecionada.",
      chefe: null,
    });
  }

  const podeLecionar = await instrutorPodeLecionarMateria(instrutorId, materiaId);
  if (!podeLecionar) {
    return res.status(400).json({
      ok: false,
      mensagem: "O instrutor precisa estar aprovado e vinculado à matéria para ser chefe da pasta.",
    });
  }

  await query(
    `
      INSERT INTO materia_chefes (materia_id, instrutor_id, atualizado_em)
      VALUES ($1, $2, NOW())
      ON CONFLICT (materia_id) DO UPDATE
      SET instrutor_id = EXCLUDED.instrutor_id,
          atualizado_em = NOW()
    `,
    [materiaId, instrutorId]
  );

  const chefe = await getChefeDaMateria(materiaId);
  res.json({
    ok: true,
    mensagem: "Chefe da pasta atualizado com sucesso.",
    chefe: chefe
      ? {
          materiaId: chefe.materia_id,
          materiaNome: chefe.materia_nome,
          instrutorId: chefe.instrutor_id,
          instrutorNome: chefe.instrutor_nome,
          instrutorNomeGrade: chefe.instrutor_nome_grade || chefe.instrutor_nome,
          instrutorEmail: chefe.instrutor_email || "",
        }
      : null,
  });
}));

app.post("/api/materias", auth, requireGestor, asyncRoute(async (req, res) => {
  const id = gerarId("materia");
  const result = await query(
    "INSERT INTO materias (id, nome, carga_horaria) VALUES ($1, $2, $3) RETURNING *",
    [id, String(req.body.nome || "").trim(), Number(req.body.cargaHoraria || 0)]
  );
  res.status(201).json({ ok: true, materia: await mapMateria(result.rows[0]) });
}));

app.patch("/api/materias/:id", auth, requireGestor, asyncRoute(async (req, res) => {
  const campos = [];
  const valores = [];
  const addCampo = (coluna, valor) => {
    valores.push(valor);
    campos.push(`${coluna} = $${valores.length}`);
  };

  if (req.body.nome !== undefined) {
    addCampo("nome", String(req.body.nome || "").trim());
  }
  if (req.body.cargaHoraria !== undefined) {
    const carga = Number.parseInt(req.body.cargaHoraria, 10);
    addCampo("carga_horaria", Number.isFinite(carga) && carga > 0 ? carga : 0);
  }

  if (campos.length === 0) {
    return res.status(400).json({
      ok: false,
      mensagem: "Informe ao menos um campo para atualizar a matéria.",
    });
  }

  valores.push(req.params.id);
  const result = await query(
    `UPDATE materias SET ${campos.join(", ")} WHERE id = $${valores.length} RETURNING *`,
    valores
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ ok: false, mensagem: "Matéria não encontrada." });
  }

  res.json({ ok: true, materia: await mapMateria(result.rows[0]) });
}));

app.delete("/api/materias/:id", auth, requireGestor, asyncRoute(async (req, res) => {
  await query("DELETE FROM materias WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

app.get("/api/turmas", auth, asyncRoute(async (_req, res) => {
  const result = await query("SELECT * FROM turmas ORDER BY nome");
  res.json({ ok: true, turmas: await Promise.all(result.rows.map(mapTurma)) });
}));

app.post("/api/turmas", auth, requireGestor, asyncRoute(async (req, res) => {
  const id = gerarId("turma");
  await query("INSERT INTO turmas (id, nome) VALUES ($1, $2)", [id, String(req.body.nome || "").trim()]);
  await setTurmaMaterias(id, req.body.materias);
  res.status(201).json({ ok: true, turma: await getTurmaPorId(id) });
}));

async function getTurmaPorId(id) {
  const result = await query("SELECT * FROM turmas WHERE id = $1", [id]);
  return result.rows[0] ? mapTurma(result.rows[0]) : null;
}

async function setTurmaMaterias(turmaId, materias = []) {
  const ids = [...new Set((Array.isArray(materias) ? materias : []).filter(Boolean))];
  await query("DELETE FROM turma_materias WHERE turma_id = $1", [turmaId]);
  for (const materiaId of ids) {
    await query(
      `INSERT INTO turma_materias (turma_id, materia_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [turmaId, materiaId]
    );
  }
}

app.patch("/api/turmas/:id/materias", auth, requireGestor, asyncRoute(async (req, res) => {
  await setTurmaMaterias(req.params.id, req.body.materias);
  res.json({ ok: true, turma: await getTurmaPorId(req.params.id) });
}));

app.delete("/api/turmas/:id", auth, requireGestor, asyncRoute(async (req, res) => {
  await query("DELETE FROM turmas WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

app.get("/api/semanas", auth, asyncRoute(async (req, res) => {
  const intervaloMes = intervaloMesUtc(req.query.mes);
  if (intervaloMes && !intervaloMes.ok) {
    return res.status(400).json({ ok: false, mensagem: intervaloMes.mensagem });
  }

  const params = [];
  let where = "";
  if (intervaloMes?.ok) {
    params.push(intervaloMes.inicio);
    where = `WHERE inicio >= $${params.length}::date`;
    params.push(intervaloMes.fim);
    where += ` AND inicio < $${params.length}::date`;
  }

  const result = await query(`SELECT * FROM semanas ${where} ORDER BY inicio, nome`, params);
  res.json({ ok: true, semanas: result.rows.map(mapSemana) });
}));

app.post("/api/semanas", auth, requireGestor, asyncRoute(async (req, res) => {
  const id = gerarId("semana");
  const result = await query(
    "INSERT INTO semanas (id, nome, inicio, fim) VALUES ($1, $2, $3, $4) RETURNING *",
    [id, String(req.body.nome || "").trim(), req.body.inicio, req.body.fim]
  );
  res.status(201).json({ ok: true, semana: mapSemana(result.rows[0]) });
}));

app.delete("/api/semanas/:id", auth, requireGestor, asyncRoute(async (req, res) => {
  await query("DELETE FROM semanas WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

app.get("/api/horarios", auth, asyncRoute(async (req, res) => {
  const params = [];
  const filtros = [];
  if (req.query.turmaId) {
    params.push(req.query.turmaId);
    filtros.push(`turma_id = $${params.length}`);
  }
  if (req.query.semanaId) {
    params.push(req.query.semanaId);
    filtros.push(`semana_id = $${params.length}`);
  }

  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
  const result = await query(`SELECT * FROM horarios ${where} ORDER BY dia, inicio`, params);
  res.json({ ok: true, horarios: result.rows.map(mapHorario) });
}));

app.get("/api/horarios/confirmacao", auth, asyncRoute(async (req, res) => {
  const turmaId = String(req.query.turmaId || "");
  const semanaId = String(req.query.semanaId || "");
  if (!turmaId || !semanaId) {
    return res.status(400).json({ ok: false, mensagem: "Informe turma e semana para consultar confirmação." });
  }

  const instrutorId = req.user.perfil === "gestor"
    ? String(req.query.instrutorId || "")
    : req.user.id;

  if (!instrutorId) {
    return res.status(400).json({ ok: false, mensagem: "Informe o instrutor para consultar confirmação." });
  }

  const confirmacao = await getConfirmacaoHorariosInstrutor({ turmaId, semanaId, instrutorId });
  res.json({
    ok: true,
    confirmado: Boolean(confirmacao),
    confirmadoEm: confirmacao?.confirmado_em || null,
  });
}));

app.post("/api/horarios/confirmacao", auth, asyncRoute(async (req, res) => {
  if (req.user.perfil !== "instrutor") {
    return res.status(403).json({ ok: false, mensagem: "Somente instrutores podem confirmar horários." });
  }

  const turmaId = String(req.body.turmaId || "");
  const semanaId = String(req.body.semanaId || "");
  const aulasPendentes = Array.isArray(req.body?.aulas) ? req.body.aulas : [];
  if (!turmaId || !semanaId) {
    return res.status(400).json({ ok: false, mensagem: "Informe turma e semana para confirmar." });
  }

  const erroConfirmacao = (status, mensagem) => {
    const error = new Error(mensagem);
    error.status = status;
    return error;
  };

  let result;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const chavesPendentes = new Set();
    for (const aula of aulasPendentes) {
      const aulaTurmaId = String(aula?.turmaId || turmaId).trim();
      const aulaSemanaId = String(aula?.semanaId || semanaId).trim();
      const dia = String(aula?.dia || "").trim();
      const inicio = String(aula?.inicio || "").trim();
      const fim = String(aula?.fim || "").trim();
      const materiaId = String(aula?.materiaId || "").trim();
      const materiaNome = String(aula?.materiaNome || "").trim();
      const local = normalizarLocalInstrucao(aula?.localInstrucao, "aula");
      const prova = Boolean(aula?.prova);

      if (aulaTurmaId !== turmaId || aulaSemanaId !== semanaId) {
        throw erroConfirmacao(400, "Há aulas pendentes de outra turma/semana. Recarregue a página e tente novamente.");
      }
      if (!dia || !inicio || !fim || !materiaId) {
        throw erroConfirmacao(400, "Há aula pendente incompleta. Revise a grade antes de confirmar.");
      }

      const chave = `${dia}|${inicio}`;
      if (chavesPendentes.has(chave)) {
        throw erroConfirmacao(400, "Há mais de uma aula pendente no mesmo horário. Revise a grade antes de confirmar.");
      }
      chavesPendentes.add(chave);

      const ocupado = await client.query(
        `
          SELECT id
          FROM horarios
          WHERE turma_id = $1
            AND semana_id = $2
            AND dia = $3
            AND inicio = $4
          LIMIT 1
        `,
        [turmaId, semanaId, dia, inicio]
      );
      if (ocupado.rowCount > 0) {
        throw erroConfirmacao(409, "Um dos horários pendentes já foi preenchido. Recarregue a grade antes de confirmar.");
      }

      const materiaDaTurma = await client.query(
        `
          SELECT 1
          FROM turma_materias
          WHERE turma_id = $1
            AND materia_id = $2
          LIMIT 1
        `,
        [turmaId, materiaId]
      );
      if (materiaDaTurma.rowCount === 0) {
        throw erroConfirmacao(400, "A matéria de uma aula pendente não está vinculada à turma selecionada.");
      }

      const associado = await client.query(
        `
          SELECT 1
          FROM usuario_materias
          WHERE usuario_id = $1
            AND materia_id = $2
          LIMIT 1
        `,
        [req.user.id, materiaId]
      );
      if (associado.rowCount === 0) {
        throw erroConfirmacao(400, "A matéria de uma aula pendente não está associada ao seu cadastro.");
      }

      await client.query(
        `
          INSERT INTO horarios (
            id, turma_id, semana_id, dia, inicio, fim, materia_id, materia_nome,
            instrutor_id, instrutor_nome, tipo, texto, local_instrucao, prova,
            auxiliares, auxiliares_solicitados, auxiliares_autorizados, aula_corrente
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'aula', '', $11, $12, '', 0, 0, NULL)
        `,
        [
          gerarId("horario"),
          turmaId,
          semanaId,
          dia,
          inicio,
          fim,
          materiaId,
          materiaNome,
          req.user.id,
          req.user.nomeGrade || req.user.nome,
          local,
          prova,
        ]
      );
    }

    const aulas = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM horarios
        WHERE turma_id = $1
          AND semana_id = $2
          AND instrutor_id = $3
          AND tipo = 'aula'
      `,
      [turmaId, semanaId, req.user.id]
    );

    const totalAulas = Number(aulas.rows[0]?.total || 0);
    if (totalAulas === 0) {
      throw erroConfirmacao(400, "Não há aulas suas nessa turma/semana para confirmar.");
    }

    result = await client.query(
      `
        INSERT INTO confirmacoes_horarios_instrutor (id, turma_id, semana_id, instrutor_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (turma_id, semana_id, instrutor_id)
        DO UPDATE SET confirmado_em = NOW()
        RETURNING *
      `,
      [gerarId("confirmacao"), turmaId, semanaId, req.user.id]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error?.status) {
      return res.status(error.status).json({ ok: false, mensagem: error.message });
    }
    if (error?.code === "23505") {
      return res.status(409).json({ ok: false, mensagem: "Um dos horários pendentes já foi preenchido. Recarregue a grade antes de confirmar." });
    }
    throw error;
  } finally {
    client.release();
  }

  const detalhe = await query(
    `
      SELECT t.nome AS turma_nome, s.nome AS semana_nome
      FROM turmas t
      JOIN semanas s ON s.id = $2
      WHERE t.id = $1
      LIMIT 1
    `,
    [turmaId, semanaId]
  );

  const turmaNome = detalhe.rows[0]?.turma_nome || turmaId;
  const semanaNome = detalhe.rows[0]?.semana_nome || semanaId;

  await criarMensagemParaGestores({
    titulo: "Horários confirmados pelo instrutor",
    tipo: "confirmacao_horario",
    texto: [
      `${req.user.nome} confirmou os horários da turma/semana.`,
      "",
      `Turma: ${turmaNome}`,
      `Semana: ${semanaNome}`,
      "",
      "Após a confirmação é necessário contatar a STE para realizar modificações na grade.",
    ].join("\n"),
  });

  const envioEmailInstrutor = await enviarEmailConfirmacaoInstrutor({
    turmaId,
    semanaId,
    instrutor: req.user,
  });
  if (!envioEmailInstrutor?.ok) {
    console.warn(
      `Confirmacao registrada sem envio de e-mail para instrutor ${req.user.id}: ${envioEmailInstrutor?.motivo || "erro_desconhecido"}`
    );
  }

  res.json({
    ok: true,
    confirmado: true,
    confirmadoEm: result.rows[0]?.confirmado_em || new Date().toISOString(),
    emailInstrutor: {
      enviado: Boolean(envioEmailInstrutor?.ok),
      motivo: envioEmailInstrutor?.motivo || "",
    },
  });
}));

app.get("/api/solicitacoes-modificacao-horario", auth, asyncRoute(async (req, res) => {
  const isGestor = req.user.perfil === "gestor";
  const intervaloMes = intervaloMesUtc(req.query.mes);
  if (intervaloMes && !intervaloMes.ok) {
    return res.status(400).json({ ok: false, mensagem: intervaloMes.mensagem });
  }

  const params = [];
  const filtros = [];
  if (!isGestor) {
    params.push(req.user.id);
    filtros.push(`smh.instrutor_id = $${params.length}`);
  }
  if (intervaloMes?.ok) {
    params.push(intervaloMes.inicio);
    filtros.push(`s.inicio >= $${params.length}::date`);
    params.push(intervaloMes.fim);
    filtros.push(`s.inicio < $${params.length}::date`);
  }
  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT
        smh.*,
        t.nome AS turma_nome,
        s.nome AS semana_nome,
        u.nome_grade AS instrutor_nome
      FROM solicitacoes_modificacao_horario smh
      JOIN turmas t ON t.id = smh.turma_id
      JOIN semanas s ON s.id = smh.semana_id
      JOIN usuarios u ON u.id = smh.instrutor_id
      ${where}
      ORDER BY smh.criado_em DESC
    `,
    params
  );

  res.json({
    ok: true,
    solicitacoes: result.rows.map(mapSolicitacaoModificacaoHorario),
  });
}));

app.post("/api/solicitacoes-modificacao-horario", auth, asyncRoute(async (req, res) => {
  if (req.user.perfil !== "instrutor") {
    return res.status(403).json({ ok: false, mensagem: "Somente instrutores podem solicitar modificação." });
  }

  const turmaId = String(req.body.turmaId || "");
  const semanaId = String(req.body.semanaId || "");
  const motivo = String(req.body.motivo || "").trim();
  if (!turmaId || !semanaId || !motivo) {
    return res.status(400).json({
      ok: false,
      mensagem: "Preencha turma, semana e motivo para solicitar modificação.",
    });
  }

  const insert = await query(
    `
      INSERT INTO solicitacoes_modificacao_horario
        (id, instrutor_id, turma_id, semana_id, motivo, status)
      VALUES ($1, $2, $3, $4, $5, 'pendente')
      RETURNING *
    `,
    [gerarId("solicitacao"), req.user.id, turmaId, semanaId, motivo]
  );

  const detalhe = await query(
    `
      SELECT t.nome AS turma_nome, s.nome AS semana_nome
      FROM turmas t
      JOIN semanas s ON s.id = $2
      WHERE t.id = $1
      LIMIT 1
    `,
    [turmaId, semanaId]
  );

  const turmaNome = detalhe.rows[0]?.turma_nome || turmaId;
  const semanaNome = detalhe.rows[0]?.semana_nome || semanaId;

  await criarMensagemParaGestores({
    titulo: "Solicitação de modificação de horário",
    tipo: "solicitacao_modificacao_horario",
    texto: [
      `${req.user.nome} solicitou modificação de horário.`,
      "",
      `Turma: ${turmaNome}`,
      `Semana: ${semanaNome}`,
      `Motivo: ${motivo}`,
      "",
      "Acesse Modificação de QTS para realizar os ajustes necessários.",
    ].join("\n"),
  });

  const solicitacao = await query(
    `
      SELECT
        smh.*,
        t.nome AS turma_nome,
        s.nome AS semana_nome,
        u.nome_grade AS instrutor_nome
      FROM solicitacoes_modificacao_horario smh
      JOIN turmas t ON t.id = smh.turma_id
      JOIN semanas s ON s.id = smh.semana_id
      JOIN usuarios u ON u.id = smh.instrutor_id
      WHERE smh.id = $1
      LIMIT 1
    `,
    [insert.rows[0].id]
  );

  res.status(201).json({
    ok: true,
    solicitacao: mapSolicitacaoModificacaoHorario(solicitacao.rows[0]),
  });
}));

app.post("/api/qts/confirmacao", auth, requireGestor, asyncRoute(async (req, res) => {
  const turmaId = String(req.body.turmaId || "");
  const semanaId = String(req.body.semanaId || "");
  const instrutoresRemovidosIds = Array.isArray(req.body?.instrutoresRemovidosIds)
    ? [...new Set(req.body.instrutoresRemovidosIds.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];
  const aulasCanceladas = Array.isArray(req.body?.aulasCanceladas) ? req.body.aulasCanceladas : [];
  if (!turmaId || !semanaId) {
    return res.status(400).json({ ok: false, mensagem: "Informe turma e semana para confirmar o QTS." });
  }

  const envio = await enviarEmailsConfirmacaoQts({
    turmaId,
    semanaId,
    gestorNome: req.user?.nome || "Gestor",
    gestorId: req.user?.id || null,
    instrutoresRemovidosForcados: instrutoresRemovidosIds,
    aulasCanceladas,
  });

  const mensagem = envio.configurado
    ? `QTS confirmado. E-mails enviados para ${envio.emailsEnviados} de ${envio.instrutoresComEmailValido} instrutor(es) alterado(s) com e-mail válido.`
    : `QTS confirmado. SMTP não configurado, e-mails não enviados (instrutores alterados: ${envio.instrutoresAlterados || 0}).`;

  res.json({
    ok: true,
    mensagem,
    email: envio,
  });
}));

app.post("/api/horarios", auth, asyncRoute(async (req, res) => {
  const registro = req.body || {};
  const isGestor = req.user.perfil === "gestor";

  if (!isGestor) {
    return res.status(403).json({
      ok: false,
      mensagem: "Instrutores devem confirmar a grade para gravar novas aulas.",
    });
  }

  if (registro.substituir && !isGestor) {
    return res.status(403).json({
      ok: false,
      mensagem: "Somente gestores podem substituir ou remover aulas da grade.",
    });
  }

  const substituir = Boolean(registro.substituir && isGestor);
  const antes = substituir
    ? await getHorarioDetalhadoPorSlot({
        turmaId: registro.turmaId,
        semanaId: registro.semanaId,
        dia: registro.dia,
        inicio: registro.inicio,
      })
    : null;

  if (!isGestor) {
    registro.tipo = "aula";
    registro.texto = "";
    registro.instrutorId = req.user.id;
    registro.instrutorNome = req.user.nomeGrade || req.user.nome;
  }

  const tipoRegistro = registro.tipo || "aula";
  if (tipoRegistro === "aula") {
    if (!registro.materiaId) {
      return res.status(400).json({ ok: false, mensagem: "Selecione uma matéria para lançar aula." });
    }
    if (!registro.instrutorId) {
      return res.status(400).json({ ok: false, mensagem: "Selecione um instrutor para lançar aula." });
    }

    const associado = await instrutorPodeLecionarMateria(registro.instrutorId, registro.materiaId);
    if (!associado) {
      return res.status(400).json({
        ok: false,
        mensagem: "A matéria selecionada não está associada ao instrutor informado.",
      });
    }

    if (!isGestor) {
      const cargaMateria = await getCargaMateriaNaTurma({
        turmaId: registro.turmaId,
        materiaId: registro.materiaId,
      });
      if (!cargaMateria.existe) {
        return res.status(400).json({
          ok: false,
          mensagem: "A matéria selecionada não foi encontrada.",
        });
      }

      if (cargaMateria.cargaHoraria > 0 && cargaMateria.aulasLancadas >= cargaMateria.cargaHoraria) {
        return res.status(400).json({
          ok: false,
          mensagem: "A carga horária da matéria já foi atingida. Somente o gestor pode lançar novas aulas dessa matéria.",
        });
      }
    }
  }

  const auxiliares = isGestor ? String(registro.auxiliares || "").trim() : "";
  const auxiliaresSolicitados = isGestor ? inteiroNaoNegativo(registro.auxiliaresSolicitados) : 0;
  const auxiliaresAutorizados = isGestor ? inteiroNaoNegativo(registro.auxiliaresAutorizados) : 0;
  const localInstrucao = normalizarLocalInstrucao(registro.localInstrucao, tipoRegistro);
  const prova = tipoRegistro === "aula" ? Boolean(registro.prova) : false;
  const aulaCorrente = isGestor && tipoRegistro === "aula"
    ? inteiroPositivoOuNulo(registro.aulaCorrente)
    : null;
  const id = gerarId("horario");
  const params = [
    id,
    registro.turmaId,
    registro.semanaId,
    registro.dia,
    registro.inicio,
    registro.fim,
    registro.materiaId || null,
    registro.materiaNome || "",
    registro.instrutorId || null,
    registro.instrutorNome || "",
    tipoRegistro,
    registro.texto || "",
    localInstrucao,
    prova,
    auxiliares,
    auxiliaresSolicitados,
    auxiliaresAutorizados,
    aulaCorrente,
  ];

  const insertSql = `
    INSERT INTO horarios (
      id, turma_id, semana_id, dia, inicio, fim, materia_id, materia_nome,
      instrutor_id, instrutor_nome, tipo, texto, local_instrucao, prova, auxiliares,
      auxiliares_solicitados, auxiliares_autorizados, aula_corrente
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
  `;

  try {
    const result = await query(
      substituir
        ? `${insertSql}
           ON CONFLICT (turma_id, semana_id, dia, inicio)
           DO UPDATE SET
             id = EXCLUDED.id,
             fim = EXCLUDED.fim,
             materia_id = EXCLUDED.materia_id,
             materia_nome = EXCLUDED.materia_nome,
             instrutor_id = EXCLUDED.instrutor_id,
             instrutor_nome = EXCLUDED.instrutor_nome,
             tipo = EXCLUDED.tipo,
             texto = EXCLUDED.texto,
             local_instrucao = EXCLUDED.local_instrucao,
             prova = EXCLUDED.prova,
             auxiliares = EXCLUDED.auxiliares,
             auxiliares_solicitados = EXCLUDED.auxiliares_solicitados,
             auxiliares_autorizados = EXCLUDED.auxiliares_autorizados,
             aula_corrente = EXCLUDED.aula_corrente,
             criado_em = NOW()
           RETURNING *`
        : `${insertSql} RETURNING *`,
      params
    );
    if (!isGestor && tipoRegistro === "aula") {
      const cargaPosInsercao = await getCargaMateriaNaTurma({
        turmaId: registro.turmaId,
        materiaId: registro.materiaId,
      });
      if (cargaPosInsercao.cargaHoraria > 0 && cargaPosInsercao.aulasLancadas > cargaPosInsercao.cargaHoraria) {
        await query("DELETE FROM horarios WHERE id = $1", [result.rows[0].id]);
        return res.status(400).json({
          ok: false,
          mensagem: "A carga horária da matéria já foi atingida. Somente o gestor pode lançar novas aulas dessa matéria.",
        });
      }
    }

    const horario = mapHorario(result.rows[0]);

    const depois = await getHorarioDetalhadoPorId(result.rows[0].id);
    if (isGestor) {
      await notificarMudancaDeAula({ antes, depois, usuario: req.user });
    }

    res.status(201).json({ ok: true, horario });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ ok: false, mensagem: "Este horário já está preenchido." });
    }
    throw error;
  }
}));

app.patch("/api/horarios/:id/auxiliares/solicitar", auth, asyncRoute(async (req, res) => {
  const horario = await getHorarioDetalhadoPorId(req.params.id);
  if (!horario) {
    return res.status(404).json({ ok: false, mensagem: "Horário não encontrado." });
  }

  if (horario.tipo !== "aula" || !horario.instrutor_id) {
    return res.status(400).json({ ok: false, mensagem: "Apenas aulas com instrutor podem receber solicitação de auxiliares." });
  }

  if (req.user.perfil !== "gestor" && horario.instrutor_id !== req.user.id) {
    return res.status(403).json({ ok: false, mensagem: "Somente o instrutor responsável pela aula pode solicitar auxiliares." });
  }

  if (req.user.perfil !== "gestor") {
    const bloqueado = await aulaTravadaPorConfirmacao({
      turmaId: horario.turma_id,
      semanaId: horario.semana_id,
      instrutorId: horario.instrutor_id,
      horarioCriadoEm: horario.criado_em,
    });
    if (bloqueado) {
      return res.status(403).json({
        ok: false,
        mensagem: "Esta aula já foi confirmada e está bloqueada para edição. Solicite modificação para a STE.",
      });
    }
  }

  const quantidade = inteiroNaoNegativo(req.body.quantidade);
  const result = await query(
    "UPDATE horarios SET auxiliares_solicitados = $1 WHERE id = $2 RETURNING *",
    [quantidade, req.params.id]
  );

  await criarMensagemParaGestores({
    titulo: "Solicitação de auxiliares",
    tipo: "solicitacao_auxiliares",
    texto: [
      `${req.user.nome} solicitou ${quantidade} auxiliar(es) para uma aula.`,
      "",
      descreverAula(horario),
      "",
      "Acesse Modificação de QTS para autorizar a quantidade e registrar os auxiliares.",
    ].join("\n"),
  });

  res.json({ ok: true, horario: mapHorario(result.rows[0]) });
}));

app.patch("/api/horarios/:id/auxiliares", auth, requireGestor, asyncRoute(async (req, res) => {
  const antes = await getHorarioDetalhadoPorId(req.params.id);
  if (!antes) {
    return res.status(404).json({ ok: false, mensagem: "Horário não encontrado." });
  }

  const auxiliares = String(req.body.auxiliares || "").trim();
  const auxiliaresAutorizados = inteiroNaoNegativo(req.body.auxiliaresAutorizados);
  const localInstrucao = req.body.localInstrucao !== undefined
    ? normalizarLocalInstrucao(req.body.localInstrucao, antes.tipo)
    : normalizarLocalInstrucao(antes.local_instrucao, antes.tipo);
  const prova = antes.tipo === "aula" && req.body.prova !== undefined
    ? Boolean(req.body.prova)
    : Boolean(antes.prova);
  const aulaCorrente = antes.tipo === "aula" && req.body.aulaCorrente !== undefined
    ? inteiroPositivoOuNulo(req.body.aulaCorrente)
    : antes.aula_corrente;
  const result = await query(
    `UPDATE horarios
     SET auxiliares = $1,
         auxiliares_autorizados = $2,
         local_instrucao = $3,
         prova = $4,
         aula_corrente = $5
     WHERE id = $6
     RETURNING *`,
    [auxiliares, auxiliaresAutorizados, localInstrucao, prova, aulaCorrente, req.params.id]
  );

  const depois = await getHorarioDetalhadoPorId(req.params.id);
  await notificarAlteracaoDeDetalhes({ antes, depois, gestor: req.user });

  res.json({ ok: true, horario: mapHorario(result.rows[0]) });
}));

app.patch("/api/horarios/:id/local", auth, asyncRoute(async (req, res) => {
  const horario = await getHorarioDetalhadoPorId(req.params.id);
  if (!horario) {
    return res.status(404).json({ ok: false, mensagem: "Horário não encontrado." });
  }

  if (req.user.perfil !== "gestor" && horario.instrutor_id !== req.user.id) {
    return res.status(403).json({ ok: false, mensagem: "Somente o gestor ou o instrutor responsável pode editar o local da instrução." });
  }

  if (req.user.perfil !== "gestor") {
    const bloqueado = await aulaTravadaPorConfirmacao({
      turmaId: horario.turma_id,
      semanaId: horario.semana_id,
      instrutorId: horario.instrutor_id,
      horarioCriadoEm: horario.criado_em,
    });
    if (bloqueado) {
      return res.status(403).json({
        ok: false,
        mensagem: "Esta aula já foi confirmada e está bloqueada para edição. Solicite modificação para a STE.",
      });
    }
  }

  const localInstrucao = normalizarLocalInstrucao(req.body.localInstrucao, horario.tipo);
  const result = await query(
    "UPDATE horarios SET local_instrucao = $1 WHERE id = $2 RETURNING *",
    [localInstrucao, req.params.id]
  );
  const depois = await getHorarioDetalhadoPorId(req.params.id);
  await notificarAlteracaoDeDetalhes({ antes: horario, depois, gestor: req.user });

  res.json({ ok: true, horario: mapHorario(result.rows[0]) });
}));

app.patch("/api/horarios/:id/prova", auth, asyncRoute(async (req, res) => {
  const horario = await getHorarioDetalhadoPorId(req.params.id);
  if (!horario) {
    return res.status(404).json({ ok: false, mensagem: "Horário não encontrado." });
  }

  if (horario.tipo !== "aula") {
    return res.status(400).json({ ok: false, mensagem: "Somente aulas podem ser marcadas como prova." });
  }

  if (req.user.perfil !== "gestor" && horario.instrutor_id !== req.user.id) {
    return res.status(403).json({ ok: false, mensagem: "Somente o gestor ou o instrutor responsável pode marcar a aula como prova." });
  }

  if (req.user.perfil !== "gestor") {
    const bloqueado = await aulaTravadaPorConfirmacao({
      turmaId: horario.turma_id,
      semanaId: horario.semana_id,
      instrutorId: horario.instrutor_id,
      horarioCriadoEm: horario.criado_em,
    });
    if (bloqueado) {
      return res.status(403).json({
        ok: false,
        mensagem: "Esta aula já foi confirmada e está bloqueada para edição. Solicite modificação para a STE.",
      });
    }
  }

  const result = await query(
    "UPDATE horarios SET prova = $1 WHERE id = $2 RETURNING *",
    [Boolean(req.body.prova), req.params.id]
  );
  const depois = await getHorarioDetalhadoPorId(req.params.id);
  await notificarAlteracaoDeDetalhes({ antes: horario, depois, gestor: req.user });

  res.json({ ok: true, horario: mapHorario(result.rows[0]) });
}));

app.delete("/api/horarios/:id", auth, asyncRoute(async (req, res) => {
  const antes = await getHorarioDetalhadoPorId(req.params.id);
  if (!antes) {
    return res.status(404).json({ ok: false, mensagem: "Horário não encontrado." });
  }

  const isGestor = req.user.perfil === "gestor";
  if (!isGestor) {
    if (antes.tipo !== "aula" || antes.instrutor_id !== req.user.id) {
      return res.status(403).json({
        ok: false,
        mensagem: "Somente o instrutor responsável pode remover esta aula.",
      });
    }

    const bloqueado = await aulaTravadaPorConfirmacao({
      turmaId: antes.turma_id,
      semanaId: antes.semana_id,
      instrutorId: antes.instrutor_id,
      horarioCriadoEm: antes.criado_em,
    });
    if (bloqueado) {
      return res.status(403).json({
        ok: false,
        mensagem: "Esta aula já foi confirmada e está bloqueada para edição. Solicite modificação para a STE.",
      });
    }
  }

  await query("DELETE FROM horarios WHERE id = $1", [req.params.id]);
  if (isGestor) {
    await notificarMudancaDeAula({
      antes,
      depois: null,
      usuario: req.user,
      enviarEmailCancelamento: req.body?.enviarEmailCancelamento === true,
    });
  }
  res.json({ ok: true });
}));

app.get("/api/relatorios/horas-aula", auth, asyncRoute(async (req, res) => {
  const intervaloMes = intervaloMesUtc(String(req.query.mes || new Date().toISOString().slice(0, 7)));
  if (!intervaloMes?.ok) {
    return res.status(400).json({ ok: false, mensagem: intervaloMes?.mensagem || "Informe o mês no formato aaaa-mm." });
  }
  const { mes, inicio, fim } = intervaloMes;

  const params = [inicio, fim];
  const filtroUsuario = req.user.perfil === "gestor" ? "" : "AND u.id = $3";

  if (req.user.perfil !== "gestor") {
    params.push(req.user.id);
  }

  const result = await query(
    `
      WITH aulas_mes AS (
        SELECT
          h.instrutor_id,
          COUNT(*)::int AS horas_aula
        FROM horarios h
        JOIN semanas s ON s.id = h.semana_id
        WHERE h.tipo = 'aula'
          AND h.instrutor_id IS NOT NULL
          AND (
            s.inicio + CASE h.dia
              WHEN 'Segunda' THEN 0
              WHEN 'Terca' THEN 1
              WHEN 'Terça' THEN 1
              WHEN 'TerÃ§a' THEN 1
              WHEN 'Quarta' THEN 2
              WHEN 'Quinta' THEN 3
              WHEN 'Sexta' THEN 4
              ELSE 0
            END
          ) >= $1::date
          AND (
            s.inicio + CASE h.dia
              WHEN 'Segunda' THEN 0
              WHEN 'Terca' THEN 1
              WHEN 'Terça' THEN 1
              WHEN 'TerÃ§a' THEN 1
              WHEN 'Quarta' THEN 2
              WHEN 'Quinta' THEN 3
              WHEN 'Sexta' THEN 4
              ELSE 0
            END
          ) < $2::date
        GROUP BY h.instrutor_id
      )
      SELECT
        u.id AS instrutor_id,
        u.nome,
        u.nome_grade,
        COALESCE(a.horas_aula, 0)::int AS horas_aula
      FROM usuarios u
      LEFT JOIN aulas_mes a ON a.instrutor_id = u.id
      WHERE u.perfil = 'instrutor'
        AND u.aprovado = TRUE
        ${filtroUsuario}
      ORDER BY u.nome
    `,
    params
  );

  const filtroAulasMes = req.user.perfil === "gestor" ? "" : "AND h.instrutor_id = $3";
  const aulasMes = await query(
    `
      SELECT
        h.instrutor_id,
        h.dia,
        h.inicio,
        h.fim,
        s.inicio AS semana_inicio
      FROM horarios h
      JOIN semanas s ON s.id = h.semana_id
      WHERE h.tipo = 'aula'
        AND h.instrutor_id IS NOT NULL
        AND (
          s.inicio + CASE h.dia
            WHEN 'Segunda' THEN 0
            WHEN 'Terca' THEN 1
            WHEN 'Terça' THEN 1
            WHEN 'TerÃ§a' THEN 1
            WHEN 'TerÃƒÂ§a' THEN 1
            WHEN 'Quarta' THEN 2
            WHEN 'Quinta' THEN 3
            WHEN 'Sexta' THEN 4
            ELSE 0
          END
        ) >= $1::date
        AND (
          s.inicio + CASE h.dia
            WHEN 'Segunda' THEN 0
            WHEN 'Terca' THEN 1
            WHEN 'Terça' THEN 1
            WHEN 'TerÃ§a' THEN 1
            WHEN 'TerÃƒÂ§a' THEN 1
            WHEN 'Quarta' THEN 2
            WHEN 'Quinta' THEN 3
            WHEN 'Sexta' THEN 4
            ELSE 0
          END
        ) < $2::date
        ${filtroAulasMes}
    `,
    params
  );

  const inicioMesMs = Date.parse(`${inicio}T00:00:00.000Z`);
  const fimMesMs = Date.parse(`${fim}T00:00:00.000Z`);
  const chavesUnicas = new Set();
  const horasUnicasPorInstrutor = new Map();

  for (const aula of aulasMes.rows) {
    const dataBase = dataBaseDaAula(aula);
    if (!dataBase) continue;
    const dataMs = Date.UTC(dataBase.getUTCFullYear(), dataBase.getUTCMonth(), dataBase.getUTCDate());
    if (!Number.isFinite(dataMs) || dataMs < inicioMesMs || dataMs >= fimMesMs) continue;

    const chave = `${aula.instrutor_id}|${dataBase.toISOString().slice(0, 10)}|${aula.inicio}|${aula.fim}`;
    if (chavesUnicas.has(chave)) continue;
    chavesUnicas.add(chave);

    const atual = Number(horasUnicasPorInstrutor.get(aula.instrutor_id) || 0);
    horasUnicasPorInstrutor.set(aula.instrutor_id, atual + 1);
  }

  const itens = result.rows.map((row) => ({
    instrutorId: row.instrutor_id,
    nome: row.nome,
    nomeGrade: row.nome_grade,
    horasAula: Number(horasUnicasPorInstrutor.get(row.instrutor_id) || 0),
  }));
  const total = itens.reduce((soma, row) => soma + Number(row.horasAula || 0), 0);

  res.json({
    ok: true,
    mes,
    total,
    itens,
  });
}));

app.get("/api/relatorios/carga-horaria", auth, requireGestor, asyncRoute(async (req, res) => {
  const intervaloMes = intervaloMesUtc(req.query.mes);
  if (intervaloMes && !intervaloMes.ok) {
    return res.status(400).json({ ok: false, mensagem: intervaloMes.mensagem });
  }

  const params = [];
  let filtroTurma = "";
  if (req.query.turmaId) {
    params.push(req.query.turmaId);
    filtroTurma = `AND t.id = $${params.length}`;
  }

  const dataAulaSql = `(
    s.inicio + CASE h.dia
      WHEN 'Segunda' THEN 0
      WHEN 'Terca' THEN 1
      WHEN 'TerÃ§a' THEN 1
      WHEN 'TerÃƒÂ§a' THEN 1
      WHEN 'TerÃƒÆ’Ã‚Â§a' THEN 1
      WHEN 'Quarta' THEN 2
      WHEN 'Quinta' THEN 3
      WHEN 'Sexta' THEN 4
      ELSE 0
    END
  )`;

  let filtroMesAulas = "";
  if (intervaloMes?.ok) {
    params.push(intervaloMes.inicio);
    const indiceInicio = params.length;
    params.push(intervaloMes.fim);
    const indiceFim = params.length;
    filtroMesAulas = `
      AND ${dataAulaSql} >= $${indiceInicio}::date
      AND ${dataAulaSql} < $${indiceFim}::date
    `;
  }

  const result = await query(
    `
      WITH aulas_lancadas AS (
        SELECT
          h.turma_id,
          h.materia_id,
          COUNT(*)::int AS aulas_lancadas
        FROM horarios h
        JOIN semanas s ON s.id = h.semana_id
        WHERE h.tipo = 'aula'
          AND h.materia_id IS NOT NULL
          ${filtroMesAulas}
        GROUP BY h.turma_id, h.materia_id
      )
      SELECT
        t.id AS turma_id,
        t.nome AS turma_nome,
        m.id AS materia_id,
        m.nome AS materia_nome,
        COALESCE(m.carga_horaria, 0)::int AS carga_horaria,
        COALESCE(a.aulas_lancadas, 0)::int AS aulas_lancadas
      FROM turma_materias tm
      JOIN turmas t ON t.id = tm.turma_id
      JOIN materias m ON m.id = tm.materia_id
      LEFT JOIN aulas_lancadas a
        ON a.turma_id = tm.turma_id
       AND a.materia_id = tm.materia_id
      WHERE 1 = 1
        ${filtroTurma}
      ORDER BY t.nome, m.nome
    `,
    params
  );

  const itens = result.rows.map((row) => {
    const cargaHoraria = Number(row.carga_horaria || 0);
    const aulasLancadas = Number(row.aulas_lancadas || 0);
    const saldo = cargaHoraria - aulasLancadas;
    const percentual = cargaHoraria > 0
      ? Math.min(100, Math.round((aulasLancadas / cargaHoraria) * 100))
      : (aulasLancadas > 0 ? 100 : 0);

    return {
      turmaId: row.turma_id,
      turmaNome: row.turma_nome,
      materiaId: row.materia_id,
      materiaNome: row.materia_nome,
      cargaHoraria,
      aulasLancadas,
      saldo,
      percentual,
      excedente: saldo < 0 ? Math.abs(saldo) : 0,
    };
  });

  res.json({
    ok: true,
    mes: intervaloMes?.ok ? intervaloMes.mes : "",
    itens,
    totalCargaHoraria: itens.reduce((total, item) => total + item.cargaHoraria, 0),
    totalAulasLancadas: itens.reduce((total, item) => total + item.aulasLancadas, 0),
    totalSaldo: itens.reduce((total, item) => total + item.saldo, 0),
  });
}));

app.get("/api/admin/banco/status", auth, requireGestor, asyncRoute(async (_req, res) => {
  const status = await getStatusArmazenamentoBanco();
  res.json({ ok: true, status });
}));

app.get("/api/admin/banco/backup-grades", auth, requireGestor, asyncRoute(async (req, res) => {
  const backup = await gerarBackupGradesPreenchidas({ gestor: req.user });
  const carimbo = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const nomeArquivo = `e-ste-backup-grades-${carimbo}.json`;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
  res.status(200).send(JSON.stringify(backup, null, 2));
}));

app.get("/api/cron/manutencao-banco", asyncRoute(async (req, res) => {
  if (!cronManutencaoAutorizado(req)) {
    return res.status(401).json({ ok: false, mensagem: "Cron nao autorizado." });
  }

  const resultado = await registrarManutencaoBanco({ origem: "cron" });
  res.json({
    ok: true,
    ...resultado,
  });
}));

app.post("/api/admin/banco/esvaziar-grades", auth, requireGestor, asyncRoute(async (req, res) => {
  if (!req.body?.confirmar) {
    return res.status(400).json({
      ok: false,
      mensagem: "Confirme o esvaziamento para remover as grades preenchidas.",
    });
  }

  const removidos = await limparGradesPreenchidas();
  const status = await getStatusArmazenamentoBanco();

  res.json({
    ok: true,
    mensagem: "Grades preenchidas removidas com sucesso. Instrutores e gestores foram preservados.",
    removidos,
    status,
  });
}));

app.use("/api", (_req, res) => {
  res.status(404).json({
    ok: false,
    mensagem: "Rota da API não encontrada. Verifique se a API está atualizada.",
  });
});

app.use(express.static(distDir));
app.get(/^(?!\/api).*/, async (_req, res, next) => {
  try {
    res.sendFile(path.join(distDir, "index.html"));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, mensagem: "Erro interno do servidor." });
});

const executadoDiretamente = process.argv[1]
  ? path.resolve(process.argv[1]) === __filename
  : false;

if (executadoDiretamente) {
  ensureDbInit()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`E-STE API rodando em http://127.0.0.1:${PORT}`);
        iniciarAgendadorManutencaoBanco();
        if (!smtpConfigured()) {
          console.warn("SMTP não configurado: notificações por e-mail estão desativadas.");
        }
      });
    })
    .catch((error) => {
      console.error("Falha ao iniciar banco/API:", error);
      process.exit(1);
    });
}

export { app, ensureDbInit };
