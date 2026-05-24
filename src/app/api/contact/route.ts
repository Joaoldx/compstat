import { NextResponse } from "next/server"

import {
  buildContactFormBrevoPayload,
  BrevoRequestError,
  sendBrevoTransactionalEmail,
} from "@/lib/email/brevo-transactional"
import {
  getContactMotiveLabel,
  isContactMotiveCode,
} from "@/lib/contact/motives"

/** Limites modestos para mitigar abuse; ajustável conforme necessidade. */
const MAX_NOME_LENGTH = 200
const MAX_MENSAGEM_LENGTH = 8_000

type ContactPayload = Readonly<{
  nome?: unknown
  motivo?: unknown
  mensagem?: unknown
}>

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export async function POST(request: Request) {
  let body: ContactPayload

  try {
    body = (await request.json()) as ContactPayload
  } catch {
    return NextResponse.json(
      { error: "Pedido JSON inválido ou corpo em falta." },
      { status: 400 }
    )
  }

  const nome =
    typeof body.nome === "string" ? body.nome.trim() : ""
  const mensagem =
    typeof body.mensagem === "string" ? body.mensagem.trim() : ""
  const motivoCode = typeof body.motivo === "string" ? body.motivo : ""

  if (!nome.length) {
    return badRequest("Nome é obrigatório.")
  }
  if (nome.length > MAX_NOME_LENGTH) {
    return badRequest(`Nome demasiado longo (máx. ${MAX_NOME_LENGTH} caracteres).`)
  }

  if (!isContactMotiveCode(motivoCode)) {
    return badRequest("Motivo do contacto inválido.")
  }

  if (!mensagem.length) {
    return badRequest("Mensagem é obrigatória.")
  }
  if (mensagem.length > MAX_MENSAGEM_LENGTH) {
    return badRequest(
      `Mensagem demasiado longa (máx. ${MAX_MENSAGEM_LENGTH} caracteres).`
    )
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim()
  if (!senderEmail) {
    console.error("[api/contact] BREVO_SENDER_EMAIL não definido.")
    return NextResponse.json(
      {
        error:
          "O servidor não está configurado para enviar e-mail. Contacte o administrador.",
      },
      { status: 503 }
    )
  }

  try {
    const motivoLabel = getContactMotiveLabel(motivoCode)
    const payload = buildContactFormBrevoPayload({
      senderEmail,
      nome,
      motivoLabel,
      mensagem,
    })

    const { messageId } = await sendBrevoTransactionalEmail(payload)

    return NextResponse.json(
      messageId !== undefined ? { ok: true, messageId } : { ok: true },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof BrevoRequestError) {
      console.error("[api/contact] Brevo:", error.status, error.bodySnippet)
      return NextResponse.json(
        { error: "Não foi possível enviar o e-mail. Tente mais tarde." },
        { status: 502 }
      )
    }

    const msg = error instanceof Error ? error.message : "Erro desconhecido"
    console.error("[api/contact]", msg)

    if (msg.includes("BREVO_API_KEY")) {
      return NextResponse.json(
        {
          error:
            "Serviço de e-mail não configurado. Defina BREVO_API_KEY no servidor.",
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: "Erro ao processar o pedido." }, { status: 500 })
  }
}
