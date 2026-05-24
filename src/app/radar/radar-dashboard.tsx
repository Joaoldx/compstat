"use client"

import dynamic from "next/dynamic"
import { Bot } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { RadarAssistantSheet } from "@/components/radar/radar-assistant-sheet"
import type { RadarMapDataStatus } from "@/components/radar-rio/rj-state-map"
import { RadarTerritoryFiltersPanel } from "@/components/radar-rio/radar-territory-filters"
import {
  defaultRadarTerritoryFilters,
  type RadarFilterCatalog,
  type RadarTerritoryFiltersState,
} from "@/lib/radar/radar-territory-filter"
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
  const [filters, setFilters] = useState<RadarTerritoryFiltersState>(() =>
    defaultRadarTerritoryFilters()
  )
  const [catalog, setCatalog] = useState<RadarFilterCatalog | null>(null)
  const [layerStats, setLayerStats] = useState<{ total: number; visible: number }>(
    () => ({
      total: 0,
      visible: 0,
    })
  )
  const [mapDataStatus, setMapDataStatus] = useState<RadarMapDataStatus>(() => ({
    csvLoading: true,
    csvFatalError: null,
  }))
  /** Aplica a faixa de anos do CSV uma vez quando o catálogo chega */
  const syncAnoDosDadosCarregadosRef = useRef(false)

  const openAssist = useCallback(() => {
    setAssistOpen(true)
  }, [])

  useEffect(() => {
    if (!catalog || syncAnoDosDadosCarregadosRef.current) return
    syncAnoDosDadosCarregadosRef.current = true
    setFilters((f) => ({
      ...f,
      anoMin: catalog.yearMin,
      anoMax: catalog.yearMax,
    }))
  }, [catalog])

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
          Vista do Estado do RJ com polígonos de território (OCRIM) e registros de
          ocorrências cujo ponto geométrico cai dentro de cada área — agregações por ano
          e delito predominante vêm do ficheiro CSV gerado pelo script{" "}
          <code className="rounded bg-muted px-1 py-px text-xs">
            npm run radar:crossed
          </code>
          . Os controles para filtrar território ficam{" "}
          <span className="font-medium text-foreground">
            sempre abaixo do mapa nesta página
          </span>
          ; pode ser necessário percorrer a página um pouco se o seu ecrã for baixo.
        </p>
      </header>

      <div className="relative mx-auto mt-6 w-full max-w-6xl min-w-0 space-y-6 pb-28 md:pb-32">
        <div className="relative z-0 flex h-[min(56vh,640px)] min-h-[340px] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-border">
          <RjStateMap
            className="h-full min-h-0 min-w-0 w-full flex-1"
            filters={filters}
            onFilterCatalog={setCatalog}
            onLayerStats={setLayerStats}
            onMapDataStatus={setMapDataStatus}
          />
        </div>

        <div className="w-full shrink-0 scroll-mt-[calc(env(safe-area-inset-bottom,0px)+8rem)]">
          <RadarTerritoryFiltersPanel
            csvFatalError={mapDataStatus.csvFatalError}
            csvLoading={mapDataStatus.csvLoading}
            catalog={catalog}
            filters={filters}
            stats={layerStats}
            onChange={setFilters}
          />
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
