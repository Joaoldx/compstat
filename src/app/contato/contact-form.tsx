"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CONTACT_DESTINATION_EMAIL } from "@/config/contact"
import { getContactMotiveSelectOptions } from "@/lib/contact/motives"

const motiveSelectOptions = getContactMotiveSelectOptions()

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string }

async function submitContact(payload: {
  nome: string
  motivo: string
  mensagem: string
}): Promise<void> {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const raw = await response.text()
  let message = "Pedido falhou."

  try {
    const data = JSON.parse(raw) as { error?: string }
    if (!response.ok && typeof data?.error === "string") {
      message = data.error
    }
  } catch {
    if (!response.ok) {
      message = `Servidor devolveu erro (${response.status}).`
    }
  }

  if (!response.ok) {
    throw new Error(message)
  }
}

export function ContactForm() {
  const [nome, setNome] = useState("")
  const [motivoCodigo, setMotivoCodigo] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" })

  const motivoErro =
    attemptedSubmit &&
    motivoCodigo.trim() === "" &&
    "Selecione o motivo do contacto."

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttemptedSubmit(true)

    const nomeLimpo = nome.trim()
    const motivoLimpo = motivoCodigo.trim()
    const msgLimpa = mensagem.trim()

    if (!nomeLimpo || !motivoLimpo || !msgLimpa) {
      return
    }

    setStatus({ kind: "submitting" })

    try {
      await submitContact({
        nome: nomeLimpo,
        motivo: motivoLimpo,
        mensagem: msgLimpa,
      })
      setStatus({ kind: "success" })
      setNome("")
      setMotivoCodigo("")
      setMensagem("")
      setAttemptedSubmit(false)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Não foi possível enviar."
      setStatus({ kind: "error", message })
    }
  }

  const showFieldErrors = attemptedSubmit && status.kind !== "success"
  const isSubmitting = status.kind === "submitting"

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-card rounded-lg border p-6 shadow-sm"
      noValidate
    >
      {status.kind === "success" ? (
        <p
          className="border-border mb-6 rounded-lg border bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
          role="status"
        >
          Mensagem enviada. Obrigado pelo contacto.
        </p>
      ) : null}

      {status.kind === "error" ? (
        <p
          className="border-destructive/30 bg-destructive/10 text-destructive mb-6 rounded-lg border px-3 py-2 text-sm"
          role="alert"
        >
          {status.message}
        </p>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="contato-nome" className="text-sm font-medium">
            Nome
          </label>
          <input
            id="contato-nome"
            type="text"
            name="nome"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none flex h-9 w-full rounded-lg border px-3 py-1 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Seu nome"
            disabled={isSubmitting}
            aria-invalid={
              showFieldErrors && nome.trim() === "" ? true : undefined
            }
          />
          {showFieldErrors && nome.trim() === "" ? (
            <p className="text-destructive text-xs">Informe seu nome.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="contato-motivo" className="text-sm font-medium">
            Motivo do contacto
          </label>
          <select
            id="contato-motivo"
            name="motivo"
            value={motivoCodigo}
            onChange={(e) => setMotivoCodigo(e.target.value)}
            className="border-input bg-background focus-visible:ring-ring ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none flex h-9 w-full rounded-lg border px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            aria-invalid={motivoErro ? true : undefined}
            disabled={isSubmitting}
          >
            {motiveSelectOptions.map((opt) => (
              <option
                key={opt.value === "" ? "_empty" : opt.value}
                value={opt.value}
                disabled={Boolean(opt.disabled)}
              >
                {opt.label}
              </option>
            ))}
          </select>
          {motivoErro ? (
            <p className="text-destructive text-xs">{motivoErro}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="contato-mensagem" className="text-sm font-medium">
            Mensagem
          </label>
          <textarea
            id="contato-mensagem"
            name="mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={6}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none placeholder:text-muted-foreground flex min-h-32 w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Descreva seu contacto em detalhes…"
            disabled={isSubmitting}
            aria-invalid={
              showFieldErrors && mensagem.trim() === "" ? true : undefined
            }
          />
          {showFieldErrors && mensagem.trim() === "" ? (
            <p className="text-destructive text-xs">
              Escreva a mensagem do contacto.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Enviando…" : "Enviar por e-mail"}
        </Button>
        <p className="text-muted-foreground text-xs leading-relaxed">
          A mensagem é enviada pelo servidor para{" "}
          <span className="text-foreground font-mono text-[11px]">
            {CONTACT_DESTINATION_EMAIL}
          </span>
          . O motivo que escolher também aparece no assunto da mensagem.
        </p>
      </div>
    </form>
  )
}
