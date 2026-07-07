export function decodeUrlPart(value = "") {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildPoolConfig() {
  const ambienteServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const maxConexoesPadrao = ambienteServerless ? 1 : 3;
  const maxConexoes = Number(process.env.DB_POOL_MAX || maxConexoesPadrao);
  const connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS || (ambienteServerless ? 8000 : 30000));
  const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS || (ambienteServerless ? 7000 : 5000));
  const maxUses = Number(process.env.DB_MAX_USES || (ambienteServerless ? 2000 : 7500));
  const ssl = process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined;
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurado. As verificacoes criticas dependem do banco real.");
  }

  const baseConfig = {
    ssl,
    max: Number.isFinite(maxConexoes) && maxConexoes > 0 ? maxConexoes : maxConexoesPadrao,
    connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis) && connectionTimeoutMillis > 0
      ? connectionTimeoutMillis
      : 30000,
    idleTimeoutMillis: Number.isFinite(idleTimeoutMillis) && idleTimeoutMillis >= 0
      ? idleTimeoutMillis
      : 5000,
    maxUses: Number.isFinite(maxUses) && maxUses > 0 ? maxUses : 7500,
    allowExitOnIdle: true,
    keepAlive: true,
  };

  try {
    const url = new URL(connectionString);
    let host = url.hostname;
    let user = decodeUrlPart(url.username);

    if (host.toLowerCase().includes("regiao.pooler.supabase.com")) {
      const projectRef = user.match(/^postgres\.([a-z0-9]+)$/i)?.[1];
      if (projectRef) {
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
