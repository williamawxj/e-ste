// Suite de testes de integracao permanente. Roda contra o banco real (o
// mesmo usado em producao), mas so cria/altera linhas com prefixo
// "teste_" e sempre limpa tudo ao final, mesmo se um teste falhar no meio.
//
// NAO esta plugado em "npm run build"/"predeploy" de proposito: cada
// execucao grava e apaga linhas reais no banco de producao, entao deve ser
// rodado deliberadamente (npm run test:integracao), nao em todo build.
import "dotenv/config";
import crypto from "node:crypto";
import pg from "pg";
import { app, ensureDbInit } from "../server/index.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

let server;
let falhas = 0;
let total = 0;
const sufixo = Date.now();
const idsParaLimpar = { turmas: [], semanas: [], materias: [], usuarios: [], solicitacoes: [] };

function checar(descricao, condicao) {
  total += 1;
  if (condicao) {
    console.log(`[ok] ${descricao}`);
  } else {
    console.error(`[FALHOU] ${descricao}`);
    falhas += 1;
  }
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function loginMaster(baseUrl) {
  const resp = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.MASTER_EMAIL, senha: process.env.MASTER_PASSWORD }),
  });
  const body = await readJson(resp);
  return body.token;
}

async function testeRedefinicaoSenha(baseUrl, authMaster) {
  console.log("\n--- Redefinicao de senha ---");
  const usuarioId = `teste_usuario_${sufixo}`;
  const email = `teste.integracao.${sufixo}@example.com`;
  idsParaLimpar.usuarios.push(usuarioId);

  await pool.query(
    `INSERT INTO usuarios (id, nome, nome_grade, email, senha_hash, perfil, aprovado)
     VALUES ($1, 'Teste Integracao', 'Teste Integracao', $2, 'scrypt:x:y', 'instrutor', TRUE)`,
    [usuarioId, email]
  );

  const respSolicitar = await fetch(`${baseUrl}/auth/esqueci-senha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  checar("esqueci-senha aceita e-mail existente", respSolicitar.status === 200);

  // Simula o link do e-mail com um token conhecido, no mesmo esquema de hash do servidor.
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query("DELETE FROM redefinicoes_senha WHERE usuario_id = $1", [usuarioId]);
  await pool.query(
    "INSERT INTO redefinicoes_senha (token_hash, usuario_id, expira_em) VALUES ($1, $2, NOW() + interval '1 hour')",
    [hashToken(token), usuarioId]
  );

  const respValidar = await fetch(`${baseUrl}/auth/redefinir-senha/${token}`);
  checar("token valido e aceito", respValidar.status === 200);

  const novaSenha = "SenhaTesteIntegracao#2026";
  const respRedefinir = await fetch(`${baseUrl}/auth/redefinir-senha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, senha: novaSenha }),
  });
  checar("redefinicao com token valido funciona", respRedefinir.status === 200);

  const respLogin = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha: novaSenha }),
  });
  checar("login com a nova senha funciona", respLogin.status === 200);

  const respReuso = await fetch(`${baseUrl}/auth/redefinir-senha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, senha: "OutraSenha#123" }),
  });
  checar("token usado nao pode ser reaproveitado", respReuso.status === 400);

  const auditoria = await pool.query(
    "SELECT 1 FROM registros_auditoria WHERE usuario_id = $1 AND acao = 'redefinir_senha' LIMIT 1",
    [usuarioId]
  );
  checar("redefinicao de senha gerou registro de auditoria", auditoria.rowCount === 1);
}

async function testeCascataAulaCorrente(baseUrl, authMaster) {
  console.log("\n--- Cascata de renumeracao de aula ---");
  const turmaId = `teste_turma_${sufixo}`;
  const semanaId = `teste_semana_${sufixo}`;
  const materiaId = `teste_materia_${sufixo}`;
  const aulaIds = [`a1_${sufixo}`, `a2_${sufixo}`, `a3_${sufixo}`];
  idsParaLimpar.turmas.push(turmaId);
  idsParaLimpar.semanas.push(semanaId);
  idsParaLimpar.materias.push(materiaId);

  await pool.query("INSERT INTO turmas (id, nome) VALUES ($1, 'Turma Teste Integracao')", [turmaId]);
  await pool.query(
    "INSERT INTO semanas (id, nome, inicio, fim) VALUES ($1, 'Semana Teste Integracao', '2026-10-05', '2026-10-09')",
    [semanaId]
  );
  await pool.query("INSERT INTO materias (id, nome, carga_horaria) VALUES ($1, 'Materia Teste Integracao', 20)", [materiaId]);
  await pool.query(
    `INSERT INTO horarios (id, turma_id, semana_id, dia, inicio, fim, materia_id, materia_nome, tipo, aula_corrente)
     VALUES
       ($1, $4, $5, 'Segunda', '08:00', '08:45', $6, 'Materia Teste Integracao', 'aula', 5),
       ($2, $4, $5, 'Segunda', '08:45', '09:30', $6, 'Materia Teste Integracao', 'aula', 20),
       ($3, $4, $5, 'Segunda', '09:30', '10:15', $6, 'Materia Teste Integracao', 'aula', NULL)`,
    [...aulaIds, turmaId, semanaId, materiaId]
  );

  const resp = await fetch(`${baseUrl}/horarios/${aulaIds[0]}/auxiliares`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authMaster },
    body: JSON.stringify({ auxiliares: "", auxiliaresAutorizados: 0, localInstrucao: "", prova: false, aulaCorrente: "3" }),
  });
  checar("PATCH aula corrente respondeu 200", resp.status === 200);

  const linhas = await pool.query("SELECT id, aula_corrente FROM horarios WHERE id = ANY($1::text[])", [aulaIds]);
  const porId = new Map(linhas.rows.map((r) => [r.id, r.aula_corrente]));
  checar("aula editada ficou com o valor digitado (3)", porId.get(aulaIds[0]) === 3);
  checar("aula seguinte (era 20) foi recalculada em cascata para 4", porId.get(aulaIds[1]) === 4);
  checar("aula seguinte (era auto) foi recalculada em cascata para 5", porId.get(aulaIds[2]) === 5);
}

async function testeSolicitacaoToggle(baseUrl, authMaster) {
  console.log("\n--- Alternancia de status de solicitacao ---");
  const [turma, semana, instrutor] = await Promise.all([
    pool.query("SELECT id FROM turmas WHERE id NOT LIKE 'teste_%' LIMIT 1"),
    pool.query("SELECT id FROM semanas WHERE id NOT LIKE 'teste_%' LIMIT 1"),
    pool.query("SELECT id FROM usuarios WHERE perfil = 'instrutor' AND aprovado = TRUE AND id NOT LIKE 'teste_%' LIMIT 1"),
  ]);
  if (!turma.rows[0] || !semana.rows[0] || !instrutor.rows[0]) {
    console.log("[aviso] Sem turma/semana/instrutor reais disponiveis; pulando teste de solicitacao.");
    return;
  }

  const solicitacaoId = `teste_solicitacao_${sufixo}`;
  idsParaLimpar.solicitacoes.push(solicitacaoId);
  await pool.query(
    `INSERT INTO solicitacoes_modificacao_horario (id, instrutor_id, turma_id, semana_id, motivo, status)
     VALUES ($1, $2, $3, $4, 'Teste de integracao automatizado', 'pendente')`,
    [solicitacaoId, instrutor.rows[0].id, turma.rows[0].id, semana.rows[0].id]
  );

  const resp1 = await fetch(`${baseUrl}/solicitacoes-modificacao-horario/${solicitacaoId}/status`, {
    method: "PATCH",
    headers: authMaster,
  });
  const body1 = await readJson(resp1);
  checar("primeira alternancia muda para 'resolvida'", body1.solicitacao?.status === "resolvida");

  const resp2 = await fetch(`${baseUrl}/solicitacoes-modificacao-horario/${solicitacaoId}/status`, {
    method: "PATCH",
    headers: authMaster,
  });
  const body2 = await readJson(resp2);
  checar("segunda alternancia volta para 'pendente'", body2.solicitacao?.status === "pendente");
}

async function limpar() {
  // A auditoria referencia usuarios com ON DELETE SET NULL: precisa ser
  // apagada ANTES dos usuarios, ou o usuario_id vira NULL e a linha de
  // teste fica orfa (sem ser removida pelo filtro por id).
  await pool.query("DELETE FROM registros_auditoria WHERE usuario_id = ANY($1::text[])", [idsParaLimpar.usuarios]).catch(() => {});
  await pool.query("DELETE FROM solicitacoes_modificacao_horario WHERE id = ANY($1::text[])", [idsParaLimpar.solicitacoes]).catch(() => {});
  await pool.query("DELETE FROM horarios WHERE turma_id = ANY($1::text[])", [idsParaLimpar.turmas]).catch(() => {});
  await pool.query("DELETE FROM materias WHERE id = ANY($1::text[])", [idsParaLimpar.materias]).catch(() => {});
  await pool.query("DELETE FROM semanas WHERE id = ANY($1::text[])", [idsParaLimpar.semanas]).catch(() => {});
  await pool.query("DELETE FROM turmas WHERE id = ANY($1::text[])", [idsParaLimpar.turmas]).catch(() => {});
  await pool.query("DELETE FROM usuarios WHERE id = ANY($1::text[])", [idsParaLimpar.usuarios]).catch(() => {});
}

try {
  await ensureDbInit();
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  const token = await loginMaster(baseUrl);
  if (!token) throw new Error("Nao foi possivel autenticar como master para rodar os testes.");
  const authMaster = { Authorization: `Bearer ${token}` };

  await testeRedefinicaoSenha(baseUrl, authMaster);
  await testeCascataAulaCorrente(baseUrl, authMaster);
  await testeSolicitacaoToggle(baseUrl, authMaster);

  console.log(`\n${total - falhas}/${total} testes passaram.`);
  if (falhas > 0) {
    console.error(`${falhas} teste(s) falharam.`);
  }
} catch (error) {
  console.error("[erro] Suite de integracao falhou com excecao nao tratada.");
  console.error(error);
  falhas += 1;
} finally {
  await limpar();
  console.log("[limpeza] Dados de teste removidos.");
  await pool.end();
  if (server) await new Promise((resolve) => server.close(resolve));
  process.exitCode = falhas === 0 ? 0 : 1;
}
