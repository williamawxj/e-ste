import { app, ensureDbInit } from "../server/index.js";

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function garantirInitComRetry(tentativas = 3) {
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    try {
      await ensureDbInit();
      return;
    } catch (error) {
      ultimoErro = error;
      if (tentativa < tentativas) {
        await esperar(250 * tentativa);
      }
    }
  }
  throw ultimoErro;
}

export default async function handler(req, res) {
  try {
    await garantirInitComRetry(3);
    return app(req, res);
  } catch (error) {
    console.error("Falha ao inicializar API:", error);
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        mensagem: "Erro interno do servidor.",
      });
    }
    return null;
  }
}
