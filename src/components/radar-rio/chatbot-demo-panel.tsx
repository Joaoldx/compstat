"use client"

import { Bot, FileDown, Loader2 } from "lucide-react"
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { downloadRadarAssistantReportPdf } from "@/lib/radar/download-security-pdf"
import { fetchRadarAssistantPdfExecutiveBullets } from "@/lib/radar/radar-assistant-pdf-refine"
import { cn } from "@/lib/utils"
import type { RadarChatUIMessage, VisibleChatRole } from "@/types/radar-chat-ui"

/** Mensagens persistidas apenas no cliente até enviar novo pedido ao servidor — nunca exponha aqui uma chave de API. */

export type { RadarChatUIMessage } from "@/types/radar-chat-ui"

function createId(role: VisibleChatRole): string {
  try {
    return `${role}-${crypto.randomUUID()}`
  } catch {
    return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

type ChatbotDemoPanelProps = Readonly<{
  className?: string
  /** PDF do mapa (filtros visíveis) — mesmo fluxo que o botão sob o mapa. */
  onExportRadarPagePdf?: () => void
  /** CSV a carregar ou erro fatal — igual a `radarReportDisabled` no dashboard. */
  radarPagePdfDisabled?: boolean
}>

const MAX_INPUT_CHARS = 8_000

const GREETING_PT =
  "Olá — sou o analista e ajudo você a interpretar os dados que quer mitigar. O que você gostaria de fazer?"

const PILLS = [
  "Explique o que os filtros atuais do mapa devem destacar nos polígonos",
  "Trazer dados de Méier e Vila Valqueire em 2023",
] as const

const PLACEHOLDER = "Digite sua dúvida e observações"

const EMPTY_PROMPT_NOTICE =
  "Escreva uma dúvida no campo ou toque em uma das sugestões para continuar."

function buildApiPayload(history: RadarChatUIMessage[]) {
  return history.map(({ role, content }) => ({ role, content }))
}

async function fetchAssistantReply(
  historyIncludingLatestUser: RadarChatUIMessage[],
): Promise<string> {
  const payload = buildApiPayload(historyIncludingLatestUser)

  let res: Response
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payload }),
    })
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor ou a rede está indisponível. Verifique sua conexão.",
    )
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
        : "Não foi possível enviar o pedido. Tente mais tarde.",
    )
  }

  if (typeof envelope.content !== "string" || envelope.content.trim() === "") {
    throw new Error("O assistente retornou uma resposta estranha. Tente de novo.")
  }

  return envelope.content.trim()
}

export function ChatbotDemoPanel({
  className,
  onExportRadarPagePdf,
  radarPagePdfDisabled = false,
}: ChatbotDemoPanelProps) {
  const [messages, setMessages] = useState<RadarChatUIMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emptyActionHint, setEmptyActionHint] = useState<string | null>(null)

  const logRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    if (!emptyActionHint) return
    const t = window.setTimeout(() => setEmptyActionHint(null), 3200)
    return () => window.clearTimeout(t)
  }, [emptyActionHint])

  const disabledSubmit =
    loading || pdfLoading || draft.trim().length === 0 || draft.length > MAX_INPUT_CHARS

  const chatBusyOrBlocking = loading || pdfLoading

  const submit = useCallback(async () => {
    const text = draft.trim()
    if (text === "" || text.length > MAX_INPUT_CHARS || pdfLoading) return

    const userTurn: RadarChatUIMessage = {
      id: createId("user"),
      role: "user",
      content: text,
    }

    const nextHistory = [...messages, userTurn]
    setMessages(nextHistory)
    setDraft("")
    setError(null)
    setLoading(true)

    try {
      const assistantText = await fetchAssistantReply(nextHistory)
      setMessages((past) => [
        ...past,
        {
          id: createId("assistant"),
          role: "assistant",
          content: assistantText,
        },
      ])
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Ocorreu um erro ao falar com o assistente."

      setError(msg)
      setMessages((past) => past.filter((m) => m.id !== userTurn.id))
      setDraft(userTurn.content)
    } finally {
      setLoading(false)
    }
  }, [draft, messages, pdfLoading])

  async function handleAssistantPdfExport() {
    if (pdfLoading || loading) return
    setPdfLoading(true)
    setError(null)

    try {
      let bullets: string | null = null
      if (messages.length > 0) {
        try {
          bullets = await fetchRadarAssistantPdfExecutiveBullets(messages)
        } catch {
          bullets = null
        }
      }
      downloadRadarAssistantReportPdf({
        messages,
        executiveBulletsMarkdown: bullets,
      })
    } finally {
      setPdfLoading(false)
    }
  }

  function onSubmitForm(e: FormEvent) {
    e.preventDefault()
    if (draft.trim() === "") {
      setEmptyActionHint(EMPTY_PROMPT_NOTICE)
      return
    }
    void submit()
  }

  function onKeyDownArea(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return

    if (disabledSubmit) return
    e.preventDefault()
    void submit()
  }

  function applySuggestion(text: string) {
    setDraft(text)
    setEmptyActionHint(null)
  }

  return (
    <div
      className={cn(
        "text-zinc-100 flex min-h-0 flex-col overflow-hidden bg-transparent",
        className,
      )}
    >
      {emptyActionHint ? (
        <div
          role="status"
          aria-live="polite"
          className="animate-in fade-in mx-4 mt-3 rounded-xl border border-cyan-500/35 bg-zinc-950/90 px-3 py-2 text-[13px] leading-snug text-zinc-100 shadow-lg sm:mx-5"
        >
          {emptyActionHint}
        </div>
      ) : null}

      {/* Cabeçalho — mesmo tom do cartão; ícone circular */}
      <header className="shrink-0 px-5 pt-14 pb-4 sm:pr-14">
        <div className="flex gap-4">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#26C2D1]/40 bg-zinc-800/80 shadow-inner ring-1 ring-white/5"
            aria-hidden
          >
            <Bot className="size-6 text-[#26C2D1]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 space-y-1.5 pt-1">
            <p className="font-medium text-[15px] leading-snug text-zinc-100">{GREETING_PT}</p>
            <p className="text-zinc-500 text-[11px] leading-snug">
              Fonte: modelo via OpenRouter (respostas automáticas; podem estar incompletas).
            </p>
          </div>
        </div>
        {onExportRadarPagePdf ? (
          <div className="mt-4">
            <button
              type="button"
              disabled={radarPagePdfDisabled}
              onClick={onExportRadarPagePdf}
              title="Exportar filtros atuais e territórios visíveis em PDF"
              className="border-[#26C2D1]/40 text-[#cfeff3] hover:bg-[#26C2D1]/12 disabled:pointer-events-none disabled:opacity-50 inline-flex items-center gap-2 rounded-lg border bg-zinc-800/75 px-3 py-2 text-[13px] font-medium shadow-inner ring-1 ring-white/[0.06] transition-colors"
            >
              <FileDown className="size-3.5 shrink-0" aria-hidden />
              Gerar relatório
            </button>
          </div>
        ) : null}
      </header>

      {/* Zona principal — caixa mais escura sugerindo o mock */}
      <div className="border-zinc-700/55 mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-zinc-950/95 p-4 shadow-inner sm:mx-5 sm:p-5">
        {error ? (
          <div
            role="alert"
            className="border-red-400/35 bg-red-950/55 text-red-100 mb-3 rounded-xl border px-3 py-2 text-sm"
          >
            {error}
          </div>
        ) : null}

        <div
          ref={logRef}
          id="radar-chat-log-region"
          className="border-zinc-800/85 mb-3 min-h-[100px] max-h-[min(28vh,220px)] flex-1 overflow-y-auto rounded-xl border bg-black/35 p-3"
          role="log"
          aria-relevant="additions"
          aria-label="Respostas da conversa"
          aria-busy={loading}
        >
          {messages.length === 0 ? (
            <p className="text-zinc-500 text-[13px] leading-relaxed">
              As mensagens aparecem aqui depois que você enviar uma dúvida.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {messages.map((m) =>
                m.role === "user" ? (
                  <RadarUserBubble key={m.id}>{m.content}</RadarUserBubble>
                ) : (
                  <RadarAssistantBubble key={m.id}>{m.content}</RadarAssistantBubble>
                ),
              )}
              {loading ? (
                <div className="text-zinc-500 flex items-center gap-2 py-1 text-[13px]">
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  <span>Elaborando uma resposta…</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {PILLS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => applySuggestion(label)}
              disabled={chatBusyOrBlocking}
              className="border-zinc-600/80 text-zinc-100 hover:bg-zinc-800/85 disabled:pointer-events-none disabled:opacity-50 rounded-full border px-4 py-2 text-left text-[13px] leading-snug transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmitForm} className="mt-auto flex flex-col gap-3">
          <label className="sr-only" htmlFor="radar-chat-input-live">
            Dúvidas e observações
          </label>
          <textarea
            id="radar-chat-input-live"
            rows={4}
            value={draft}
            maxLength={MAX_INPUT_CHARS}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDownArea}
            placeholder={
              loading ? "Aguardando resposta…" : pdfLoading ? "Preparando PDF…" : PLACEHOLDER
            }
            aria-describedby="radar-chat-hint"
            className={cn(
              "border-zinc-700/85 bg-black/55 text-zinc-100 placeholder:text-zinc-600 w-full resize-y rounded-2xl border px-3.5 py-3 text-[14px] leading-relaxed outline-none ring-1 ring-transparent transition-[box-shadow] focus-visible:ring-[#26C2D1]/55",
              chatBusyOrBlocking && "pointer-events-none opacity-80",
            )}
            disabled={chatBusyOrBlocking}
          />

          <div className="pt-1">
            <p
              id="radar-chat-hint"
              className="text-zinc-500 mb-3 text-[11px] leading-relaxed sm:text-[12px]"
            >
              Enter envia mensagem ao assistente • Shift + Enter permite nova linha •{" "}
              {draft.length}/{MAX_INPUT_CHARS}
              caracteres. O botão PDF tenta primeiro pedir marcadores ao assistente a partir da
              conversa; se essa chamada falhar, o arquivo traz apenas o texto da sessão.
            </p>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleAssistantPdfExport()
                }}
                disabled={chatBusyOrBlocking}
                className="border-zinc-600/85 text-zinc-100 hover:bg-zinc-800/90 disabled:pointer-events-none disabled:opacity-50 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-medium transition-colors"
              >
                {pdfLoading ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <FileDown className="size-4 shrink-0" aria-hidden />
                )}
                Gerar PDF do assistente
              </button>
              <button
                type="submit"
                disabled={disabledSubmit}
                className={cn(
                  "hover:brightness-110 active:brightness-95 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold text-zinc-950 shadow-lg transition-[filter]",
                  disabledSubmit
                    ? "cursor-not-allowed bg-zinc-600 text-zinc-400 opacity-75"
                    : "",
                )}
                style={disabledSubmit ? undefined : { backgroundColor: "#26C2D1" }}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-zinc-950" aria-hidden />
                    Aguardando o assistente…
                  </span>
                ) : (
                  "Enviar ao assistente"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function RadarUserBubble({ children }: Readonly<{ children: string }>) {
  return (
    <article className="ml-4 flex justify-end">
      <div
        className="max-w-[96%] rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap shadow-sm"
        style={{ backgroundColor: "rgba(38,194,209,0.22)" }}
        lang="pt-BR"
      >
        {children}
      </div>
    </article>
  )
}

function RadarAssistantBubble({ children }: Readonly<{ children: string }>) {
  return (
    <article className="mr-4 flex justify-start">
      <div
        className="border-zinc-600/60 max-w-[96%] rounded-2xl rounded-bl-md border bg-zinc-900/95 px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap text-zinc-100 shadow-sm"
        lang="pt-BR"
      >
        {children}
      </div>
    </article>
  )
}
