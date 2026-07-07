import "dotenv/config";
import pg from "pg";
import { buildPoolConfig } from "./db-config.mjs";

const { Pool } = pg;

const criticalQueries = [
  {
    name: "GET /api/horarios - lista geral",
    sql: `
      SELECT *
      FROM horarios
      ORDER BY dia, inicio
    `,
    params: [],
  },
  {
    name: "GET /api/horarios - filtros turma/semana",
    sql: `
      SELECT *
      FROM horarios
      WHERE turma_id = $1
        AND semana_id = $2
      ORDER BY dia, inicio
    `,
    params: ["__turma_check__", "__semana_check__"],
  },
  {
    name: "POST /api/horarios - validacao de carga horaria do instrutor",
    sql: `
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
    params: ["__turma_check__"],
  },
  {
    name: "POST /api/horarios/confirmacao - contagem de aulas",
    sql: `
      SELECT COUNT(*)::int AS total
      FROM horarios
      WHERE turma_id = $1
        AND semana_id = $2
        AND instrutor_id = $3
        AND tipo = 'aula'
    `,
    params: ["__turma_check__", "__semana_check__", "__instrutor_check__"],
  },
  {
    name: "Email de confirmacao do instrutor - aulas por periodo",
    sql: `
      SELECT
        h.*,
        t.nome AS turma_nome,
        s.nome AS semana_nome,
        s.inicio AS semana_inicio,
        u.email AS instrutor_email,
        u.nome AS usuario_nome,
        u.nome_grade AS usuario_nome_grade
      FROM horarios h
      JOIN turmas t ON t.id = h.turma_id
      JOIN semanas s ON s.id = h.semana_id
      JOIN usuarios u ON u.id = h.instrutor_id
      WHERE h.turma_id = $1
        AND h.semana_id = $2
        AND h.instrutor_id = $3
        AND h.tipo = 'aula'
      ORDER BY h.dia, h.inicio
    `,
    params: ["__turma_check__", "__semana_check__", "__instrutor_check__"],
  },
  {
    name: "Relatorio de horas-aula - base mensal",
    sql: `
      SELECT
        h.instrutor_id,
        h.instrutor_nome,
        h.dia,
        h.inicio,
        h.fim,
        s.inicio AS semana_inicio
      FROM horarios h
      JOIN semanas s ON s.id = h.semana_id
      WHERE h.tipo = 'aula'
        AND s.inicio >= $1::date
        AND s.inicio < $2::date
    `,
    params: ["2026-01-01", "2026-02-01"],
  },
];

const pool = new Pool(buildPoolConfig());

try {
  for (const item of criticalQueries) {
    await pool.query(`EXPLAIN ${item.sql}`, item.params);
    console.log(`[ok] ${item.name}`);
  }
  console.log("Consultas criticas verificadas com sucesso.");
} catch (error) {
  console.error("[erro] Consulta critica falhou antes do deploy.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
