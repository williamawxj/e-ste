import { apiFetch } from "./apiClient";

export async function getMensagens() {
  const response = await apiFetch("/mensagens");
  return response.mensagens;
}

export async function marcarMensagemComoLida(id) {
  const response = await apiFetch(`/mensagens/${id}/lida`, { method: "PATCH" });
  return response.mensagem;
}

export async function marcarMensagensComoLidas() {
  await apiFetch("/mensagens/lidas", { method: "PATCH" });
}
