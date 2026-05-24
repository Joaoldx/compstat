"use client"

import dynamic from "next/dynamic"
import { Bot } from "lucide-react"
import { useCallback, useState } from "react"

import { RadarAssistantSheet } from "@/components/radar/radar-assistant-sheet"
import { cn } from "@/lib/utils"

const RjStateMap = dynamic(
  () => import("@/components/radar-rio/rj-state-map").then((m) => m.RjStateMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] w-full animate-pulse items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
        Carregando mapa do Estado do Rio…
      </div>
    ),
  }
)

const FAB_CLASSES =
  "bg-sky-500 hover:bg-sky-400 shadow-sky-500/40 hover:shadow-sky-400/50 focus-visible:ring-sky-300"

export function RadarDashboard() {
  const [assistOpen, setAssistOpen] = useState(false)

  const openAssist = useCallback(() => {
    setAssistOpen(true)
  }, [])

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col bg-background px-4 py-6 text-foreground md:px-8 md:py-8">
      <header className="mx-auto w-full max-w-6xl text-center lg:text-left">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Radar{" "}
          <span className="font-semibold text-sky-700 dark:text-sky-400">
            Rio
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground lg:mx-0">
          Mapa do Estado do Rio com polígonos simulados de incidência de crimes por área —
          dados apenas ilustrativos.
        </p>
      </header>

      <div className="relative mx-auto mt-6 flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col pb-20 lg:pb-24">
        <div className="relative z-0 flex h-[min(72vh,820px)] min-h-[400px] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-border">
          <RjStateMap className="h-full min-h-0 min-w-0 w-full flex-1" />
        </div>

        <button
          type="button"
          onClick={openAssist}
          title="Abrir assistente analista — demonstração"
          aria-label="Abrir assistente analista — demonstração"
          className={cn(
            FAB_CLASSES,
            "fixed bottom-8 right-6 z-40 flex size-14 items-center justify-center rounded-full text-white shadow-xl transition focus-visible:ring-4 focus-visible:outline-none md:bottom-10 md:right-10"
          )}
        >
          <Bot className="size-7" strokeWidth={1.75} aria-hidden />
        </button>

        <p className="mt-4 text-center text-[11px] text-muted-foreground lg:text-left">
          Conteúdo meramente ilustrativo — o assistente só envia o texto da conversa ao
          servidor para gerar uma resposta; não enviamos filtros do mapa automaticamente.
        </p>
      </div>

      <RadarAssistantSheet open={assistOpen} onOpenChange={setAssistOpen} />
    </div>
  )
}
