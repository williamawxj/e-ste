CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_grade TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL DEFAULT '',
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('gestor', 'instrutor')),
  chefe_ste BOOLEAN NOT NULL DEFAULT FALSE,
  aprovado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS chefe_ste BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS materias (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  carga_horaria INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usuario_materias (
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  materia_id TEXT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, materia_id)
);

CREATE TABLE IF NOT EXISTS materia_chefes (
  materia_id TEXT PRIMARY KEY REFERENCES materias(id) ON DELETE CASCADE,
  instrutor_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS turmas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS turma_materias (
  turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  materia_id TEXT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  PRIMARY KEY (turma_id, materia_id)
);

CREATE TABLE IF NOT EXISTS semanas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  inicio DATE NOT NULL,
  fim DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS horarios (
  id TEXT PRIMARY KEY,
  turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  semana_id TEXT NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  dia TEXT NOT NULL,
  inicio TEXT NOT NULL,
  fim TEXT NOT NULL,
  materia_id TEXT REFERENCES materias(id) ON DELETE SET NULL,
  materia_nome TEXT NOT NULL DEFAULT '',
  instrutor_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  instrutor_nome TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'aula',
  texto TEXT NOT NULL DEFAULT '',
  local_instrucao TEXT NOT NULL DEFAULT '',
  prova BOOLEAN NOT NULL DEFAULT FALSE,
  auxiliares TEXT NOT NULL DEFAULT '',
  auxiliares_solicitados INTEGER NOT NULL DEFAULT 0 CHECK (auxiliares_solicitados >= 0),
  auxiliares_autorizados INTEGER NOT NULL DEFAULT 0 CHECK (auxiliares_autorizados >= 0),
  aula_corrente INTEGER CHECK (aula_corrente > 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (turma_id, semana_id, dia, inicio)
);

ALTER TABLE horarios ADD COLUMN IF NOT EXISTS local_instrucao TEXT NOT NULL DEFAULT '';
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS prova BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS auxiliares TEXT NOT NULL DEFAULT '';
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS auxiliares_solicitados INTEGER NOT NULL DEFAULT 0;
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS auxiliares_autorizados INTEGER NOT NULL DEFAULT 0;
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS aula_corrente INTEGER;

CREATE TABLE IF NOT EXISTS confirmacoes_horarios_instrutor (
  id TEXT PRIMARY KEY,
  turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  semana_id TEXT NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  instrutor_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  confirmado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (turma_id, semana_id, instrutor_id)
);

CREATE TABLE IF NOT EXISTS qts_confirmacoes (
  id TEXT PRIMARY KEY,
  turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  semana_id TEXT NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  gestor_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  estado_instrutores JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (turma_id, semana_id)
);

CREATE TABLE IF NOT EXISTS solicitacoes_modificacao_horario (
  id TEXT PRIMARY KEY,
  instrutor_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  semana_id TEXT NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  resposta_ste TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE solicitacoes_modificacao_horario
  ADD COLUMN IF NOT EXISTS resposta_ste TEXT NOT NULL DEFAULT '';
ALTER TABLE solicitacoes_modificacao_horario
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS mensagens (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  referencia_id TEXT NOT NULL DEFAULT '',
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mensagens
  ADD COLUMN IF NOT EXISTS referencia_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT '',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registros_manutencao_banco (
  id TEXT PRIMARY KEY,
  origem TEXT NOT NULL DEFAULT '',
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registros_manutencao_banco_registrado_em
  ON registros_manutencao_banco (registrado_em DESC);
