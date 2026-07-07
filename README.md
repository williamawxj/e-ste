# E-STE - versao reconstruida
<!-- teste-git-vercel-autodeploy -->


Sistema React + Vite + Tailwind para gestao de horarios, instrutores e gestores.

Agora o app usa uma API Node/Express com PostgreSQL para salvar usuarios, materias, turmas, semanas e horarios.

## Login inicial

Antes da primeira inicializacao do banco, defina no `.env`:

- `MASTER_EMAIL`: login do gestor master
- `MASTER_PASSWORD`: senha forte do gestor master

O sistema nao cria gestor master com senha padrao. Se a senha estiver vazia, curta ou for um valor conhecido como `123456789`, a inicializacao falha ate a configuracao ser corrigida.

Para ambientes controlados em que o gestor decida assumir esse risco, `MASTER_ALLOW_WEAK_PASSWORD=true` permite senha fraca e `MASTER_PASSWORD_SYNC=true` força o banco a sincronizar a senha do master com `MASTER_PASSWORD` na inicialização.

## Requisitos

- Node.js
- PostgreSQL
- Um banco criado para o sistema, por exemplo `este`

## Configuracao

Crie um arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell, se preferir:

```powershell
Copy-Item .env.example .env
```

Edite o `DATABASE_URL`:

```env
DATABASE_URL=postgres://usuario:senha@localhost:5432/este
DATABASE_SSL=false
```

Para subir um PostgreSQL local com Docker:

```bash
docker compose up -d
```

Nesse caso, use:

```env
DATABASE_URL=postgres://este:este@localhost:5432/este
DATABASE_SSL=false
```

Em provedores como Render, Railway, Neon ou Supabase, use a URL fornecida pelo servico. Se o provedor exigir SSL, use:

```env
DATABASE_SSL=true
```

## Como executar em desenvolvimento

Em um terminal, rode a API:

```bash
npm run server
```

Em outro terminal, rode o frontend:

```bash
npm run dev
```

Abra o endereco mostrado pelo Vite, normalmente:

```text
http://localhost:5173
```

O Vite encaminha chamadas `/api` para `http://127.0.0.1:3001`.

## Como executar em producao

Gere o build do frontend:

```bash
npm run build
```

Depois suba o servidor:

```bash
npm start
```

O Express serve a API e tambem os arquivos estaticos da pasta `dist`.

## Aviso por WhatsApp

Quando o gestor altera, atribui ou remove aulas da grade, a tela de modificacao gera um link do WhatsApp com mensagem pronta para o instrutor afetado. O gestor confere a mensagem, abre o WhatsApp e envia manualmente.

Para isso, cadastre o campo `WhatsApp com DDD` no perfil do instrutor. Se o numero for informado sem codigo do pais, o sistema adiciona `55` automaticamente.

## Banco de dados

O schema fica em:

```text
server/schema.sql
```

Na inicializacao, a API cria as tabelas se elas ainda nao existirem e cria o usuario master caso ele nao exista.

## Manutencao anti-pausa do banco

O sistema cria registros periodicos na tabela `registros_manutencao_banco` para manter interacao com o PostgreSQL. Quando cria um novo registro automatico, ele apaga somente o registro automatico anterior; nenhum outro registro do banco e removido por essa rotina.

Em producao na Vercel, o `vercel.json` agenda a rota:

```text
/api/cron/manutencao-banco
```

O agendamento padrao chama a rota diariamente as 06:00 UTC. A propria rota so cria um novo registro quando o ultimo registro ja tem 3 dias ou mais. Em servidores Node persistentes, a API tambem verifica periodicamente se ja esta na hora de criar um novo registro.

Variaveis opcionais:

```env
CRON_SECRET=
DB_KEEPALIVE_INTERVAL_DAYS=3
DB_KEEPALIVE_CHECK_INTERVAL_HOURS=12
DB_KEEPALIVE_DISABLED=false
```

Se `CRON_SECRET` estiver configurado na Vercel, a plataforma envia esse valor no header `Authorization` e a rota valida a chamada automaticamente.

Principais tabelas:

- `usuarios`
- `materias`
- `turmas`
- `turma_materias`
- `usuario_materias`
- `semanas`
- `horarios`
- `sessoes`
- `registros_manutencao_banco`

## Estrutura

```text
server/
  index.js
  schema.sql
src/
  components/
  pages/
  utils/
    apiClient.js
    usuariosDB.js
    academicoDB.js
    exportUtils.js
```
