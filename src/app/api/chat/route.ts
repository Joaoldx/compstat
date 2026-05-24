import { NextResponse } from "next/server"

/**
 * OpenRouter — chave apenas no servidor (neste handler).
 * O ideal é `OPEN_ROUTER_API_KEY` (sem `NEXT_PUBLIC_`) para evitar exposição acidental ao bundle do cliente,
 * mesmo que em dev alguém coloque só `NEXT_PUBLIC_OPEN_ROUTER_API_KEY`.
 */
function getOpenRouterApiKey(): string | undefined {
  return (
    process.env.OPEN_ROUTER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY?.trim()
  )
}

const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions"

/** Lista verificada na documentação OpenRouter (slug concreto; reproduzível). Fallback em caso de indisponibilidade. */
const MODEL_PRIMARY = "anthropic/claude-sonnet-4"
const MODEL_FALLBACK = "anthropic/claude-3.5-sonnet"

const MAX_MESSAGES = 40
const MAX_MESSAGE_CHARS = 8_000
const MAX_REPLY_TOKENS = 4_096

/** Tom e idioma quando o cliente não envia mensagem `system`. */
const DEFAULT_SYSTEM_PROMPT =
  "Você é o assistente analista do Radar (CoPatrulha). Responda sempre em português do Brasil (pt-BR), com clareza e tom profissional. Se não tiver dados em tempo real do painel ou do mapa, diga explicitamente."

type ChatRole = "user" | "assistant" | "system"

type IncomingMessage = Readonly<{ role?: unknown; content?: unknown }>

type NormalizedChatMessage = Readonly<{ role: ChatRole; content: string }>

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function normalizeMessages(raw: unknown): NormalizedChatMessage[] | string {
  if (!Array.isArray(raw)) return "O campo «messages» tem de ser uma lista."

  if (raw.length === 0) return "É necessário pelo menos uma mensagem."
  if (raw.length > MAX_MESSAGES) {
    return `Limite de ${MAX_MESSAGES} mensagens por pedido foi excedido.`
  }

  const normalized: NormalizedChatMessage[] = []

  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      return "Cada mensagem tem de ser um objeto válido."
    }
    const m = item as IncomingMessage

    const roleRaw = m.role
    const contentRaw = m.content

    if (roleRaw !== "user" && roleRaw !== "assistant" && roleRaw !== "system") {
      return 'Cada mensagem deve ter «role»: «user», «assistant» ou «system».'
    }
    if (typeof contentRaw !== "string") {
      return 'Cada mensagem deve ter «content» em texto.'
    }

    const content = contentRaw.trim()
    if (content.length === 0) {
      continue
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return `Uma mensagem excedeu ${MAX_MESSAGE_CHARS} caracteres.`
    }

    normalized.push({ role: roleRaw, content })
  }

  if (normalized.length === 0) {
    return "Nenhuma mensagem com texto válido após remover entradas vazias."
  }

  return normalized
}

type OpenRouterChatResponse = Readonly<{
  choices?: ReadonlyArray<{
    message?: Readonly<{ content?: string | null }>
  }>
  error?: Readonly<{ message?: string; code?: number }>
}>

function resolveHttpRefererHeader(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel?.startsWith("http")) return vercel
  if (vercel) return `https://${vercel}`
  return "http://localhost:3000"
}

async function completionWithModel(
  apiKey: string,
  model: string,
  messages: NormalizedChatMessage[],
): Promise<Response> {
  const body = JSON.stringify({
    model,
    messages,
    max_tokens: MAX_REPLY_TOKENS,
    temperature: 0.6,
  })

  return fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": resolveHttpRefererHeader(),
      "X-Title": "CoPatrulha Radar",
    },
    body,
  })
}

export async function POST(request: Request) {
  const apiKey = getOpenRouterApiKey()
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Serviço de chat indisponível: configure OPEN_ROUTER_API_KEY (recomendado) ou NEXT_PUBLIC_OPEN_ROUTER_API_KEY no servidor.",
      },
      { status: 503 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Pedido JSON inválido ou corpo em falta." },
      { status: 400 },
    )
  }

  if (typeof body !== "object" || body === null) {
    return badRequest("Corpo do pedido inválido.")
  }

  const rawMessages = (body as Record<string, unknown>).messages

  const normalizedResult = normalizeMessages(rawMessages)
  if (typeof normalizedResult === "string") {
    return badRequest(normalizedResult)
  }

  const hasSystem = normalizedResult.some((m) => m.role === "system")
  const messagesForModel: NormalizedChatMessage[] = hasSystem
    ? normalizedResult
    : [{ role: "system", content: DEFAULT_SYSTEM_PROMPT }, ...normalizedResult]

  let res = await completionWithModel(apiKey, MODEL_PRIMARY, messagesForModel)

  let usedModel = MODEL_PRIMARY

  if (!res.ok && res.status === 404) {
    res = await completionWithModel(apiKey, MODEL_FALLBACK, messagesForModel)
    usedModel = MODEL_FALLBACK
  }

  let data: unknown

  try {
    data = await res.json()
  } catch {
    return NextResponse.json(
      { error: "Resposta inválida do serviço de IA. Tente novamente." },
      { status: 502 },
    )
  }

  const parsed = data as OpenRouterChatResponse

  if (!res.ok) {
    const msg =
      parsed.error?.message ??
      (typeof res.statusText === "string" && res.statusText.length > 0
        ? res.statusText
        : "O serviço de IA recusou o pedido.")

    console.error("[openrouter-chat]", usedModel, res.status, parsed.error ?? data)

    return NextResponse.json(
      {
        error: `Não foi possível obter resposta (${res.status}). ${msg}`,
      },
      { status: 502 },
    )
  }

  const contentRaw = parsed.choices?.[0]?.message?.content
  const content =
    typeof contentRaw === "string" ? contentRaw.trim() : ""

  if (!content) {
    return NextResponse.json(
      {
        error: "A IA devolveu uma resposta vazia. Tente reformular a pergunta.",
      },
      { status: 502 },
    )
  }

  return NextResponse.json({ content })
}
