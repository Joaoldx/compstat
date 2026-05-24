import {
  BREVO_CONTACT_TAG,
  CONTACT_DESTINATION_EMAIL,
} from "@/config/contact"

const BREVO_SMTP_ENDPOINT = "https://api.brevo.com/v3/smtp/email" as const

/** Corpo esperado pela API transaccional SMTP do Brevo (v3). */
export type BrevoTransactionalPayload = Readonly<{
  sender: { email: string; name?: string }
  to: { email: string; name?: string }[]
  replyTo?: { email: string; name?: string }
  textContent: string
  subject: string
  tags: string[]
}>

export class BrevoRequestError extends Error {
  readonly status: number
  readonly bodySnippet: string

  constructor(status: number, bodySnippet: string) {
    super(`Brevo: pedido falhou (${status})`)
    this.name = "BrevoRequestError"
    this.status = status
    this.bodySnippet = bodySnippet
  }
}

/**
 * Envio transaccional simples conforme exemplos REST do Brevo.
 * Corre apenas no servidor (nunca expor `api-key` ao cliente).
 */
export async function sendBrevoTransactionalEmail(
  payload: BrevoTransactionalPayload
): Promise<{ messageId?: string }> {
  const apiKey = process.env.BREVO_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      "Configuração em falta: defina a variável de ambiente BREVO_API_KEY."
    )
  }

  const response = await fetch(BREVO_SMTP_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  })

  const raw = await response.text()

  if (!response.ok) {
    const snippet = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw
    throw new BrevoRequestError(response.status, snippet)
  }

  try {
    const parsed = JSON.parse(raw) as { messageId?: string }
    return { messageId: parsed.messageId }
  } catch {
    return {}
  }
}

export function buildContactFormBrevoPayload(args: {
  senderEmail: string
  senderName?: string
  nome: string
  motivoLabel: string
  mensagem: string
}): BrevoTransactionalPayload {
  const {
    senderEmail,
    senderName = "CoPatrulha",
    nome,
    motivoLabel,
    mensagem,
  } = args

  const subject = `CoPatrulha — contacto (${motivoLabel})`
  const textContent = [
    `Nome: ${nome}`,
    `Motivo: ${motivoLabel}`,
    "",
    "Mensagem:",
    mensagem,
  ].join("\n")

  return {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: CONTACT_DESTINATION_EMAIL }],
    replyTo: { email: senderEmail, name: senderName },
    subject,
    textContent,
    tags: [BREVO_CONTACT_TAG],
  }
}
