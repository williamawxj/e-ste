import "dotenv/config";
import { app, ensureDbInit } from "../server/index.js";

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta nao JSON: ${text.slice(0, 120)}`);
  }
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} retornou ${response.status}: ${body.mensagem || JSON.stringify(body)}`);
  }
  return body;
}

function startServer() {
  const server = app.listen(0, "127.0.0.1");
  return new Promise((resolve, reject) => {
    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });
}

function getServerBaseUrl(server) {
  const address = server.address();
  return `http://127.0.0.1:${address.port}/api`;
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

function envFlag(name) {
  return ["1", "true", "yes", "sim"].includes(
    String(process.env[name] || "").trim().toLowerCase()
  );
}

function getRequiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} deve estar configurado para executar o smoke test da API.`);
  }
  return value;
}

function getSmokeMasterPassword() {
  const senha = getRequiredEnv("MASTER_PASSWORD");
  const senhaInsegura = senha.length < 12 || SENHAS_MASTER_BLOQUEADAS.has(senha.toLowerCase());
  if (senhaInsegura && !envFlag("MASTER_ALLOW_WEAK_PASSWORD")) {
    throw new Error("MASTER_PASSWORD inseguro. Configure uma senha forte para o smoke test.");
  }
  return senha;
}

let server;
let token = "";

try {
  await ensureDbInit();
  server = await startServer();
  const baseUrl = getServerBaseUrl(server);

  await requestJson(baseUrl, "/health");

  const login = await requestJson(baseUrl, "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: getRequiredEnv("MASTER_EMAIL"),
      senha: getSmokeMasterPassword(),
    }),
  });
  token = login.token || "";
  if (!token) throw new Error("Login de smoke nao retornou token.");

  const authHeaders = { Authorization: `Bearer ${token}` };
  const [turmas, semanas] = await Promise.all([
    requestJson(baseUrl, "/turmas", { headers: authHeaders }),
    requestJson(baseUrl, "/semanas", { headers: authHeaders }),
    requestJson(baseUrl, "/materias", { headers: authHeaders }),
    requestJson(baseUrl, "/horarios", { headers: authHeaders }),
  ]).then(([turmasBody, semanasBody]) => [turmasBody.turmas || [], semanasBody.semanas || []]);

  const turmaId = turmas[0]?.id || "";
  const semanaId = semanas[0]?.id || "";
  if (turmaId) {
    await requestJson(baseUrl, `/horarios?${new URLSearchParams({ turmaId }).toString()}`, { headers: authHeaders });
  }
  if (semanaId) {
    await requestJson(baseUrl, `/horarios?${new URLSearchParams({ semanaId }).toString()}`, { headers: authHeaders });
  }
  if (turmaId && semanaId) {
    await requestJson(baseUrl, `/horarios?${new URLSearchParams({ turmaId, semanaId }).toString()}`, { headers: authHeaders });
  }

  console.log("Smoke test da API concluido com sucesso.");
} catch (error) {
  console.error("[erro] Smoke test da API falhou.");
  console.error(error);
  process.exitCode = 1;
} finally {
  if (server && token) {
    try {
      const baseUrl = getServerBaseUrl(server);
      await fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // A sessao expira automaticamente; o logout aqui e apenas limpeza de smoke.
    }
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}
