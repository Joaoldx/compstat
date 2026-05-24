import type { RadarChatUIMessage } from "@/types/radar-chat-ui"

/**
 * Mensagem efémera (não fica na UI) para síntese em marcadores antes de exportar o PDF da conversa.
 * O servidor continua com o `system` padrão se nenhum `system` for enviado no array.
 */
const PDF_REFINE_USER_PROMPT_PT = `
[Pedido automático para exportação em PDF]

Com base apenas na conversa acima nesta sessão, produza uma síntese executiva em pt-BR:
• 5 a 8 marcadores curtos começados por um traço tipo "• " (marcador tipográfico), sem saudações nem fechos.
• Linguagem institucional, direta aos fatos e perguntas levantadas.
• Se não houver conteúdo suficiente, escreva um único marcador: "• Sessão sem conteúdo analítico adicional."
`.trim()

function buildRadarChatPayload(history: RadarChatUIMessage[]): Array<{
  role: "user" | "assistant"
  content: string
}> {
  return history.map(({ role, content }) => ({ role, content }))
}

/**
 * Uma segunda chamada a `/api/chat` para enriquecer o PDF (fallback: texto vazio ao falhar).
 */
export async function fetchRadarAssistantPdfExecutiveBullets(
  conversation: readonly RadarChatUIMessage[],
): Promise<string> {
  const refineTurn: RadarChatUIMessage = {
    id: "pdf-refine-ephemeral",
    role: "user",
    content: PDF_REFINE_USER_PROMPT_PT,
  }
  const payload = [...buildRadarChatPayload([...conversation, refineTurn])]

  let res: Response
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payload }),
    })
  } catch {
    throw new Error("Sem conexão com o servidor ao pedir síntese para PDF.")
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error("Resposta inesperada do servidor (JSON inválido).")
  }

  const envelope = data as { content?: unknown; error?: unknown }

  if (!res.ok) {
    throw new Error(
      typeof envelope.error === "string"
        ? envelope.error
        : "Não foi possível obter síntese para PDF.",
    )
  }

  if (typeof envelope.content !== "string" || envelope.content.trim() === "") {
    throw new Error("A síntese retornada pelo assistente ficou vazia.")
  }

  return envelope.content.trim()
}
