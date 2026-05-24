"use client"

import dynamic from "next/dynamic"
import { Bot, FileDown } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { RadarAssistantSheet } from "@/components/radar/radar-assistant-sheet"
import type { RadarMapDataStatus } from "@/components/radar-rio/rj-state-map"
import { RadarTerritoryFiltersPanel } from "@/components/radar-rio/radar-territory-filters"
import type { RadarTerritoryPdfDigest } from "@/lib/radar/build-radar-territory-pdf-digest"
import { downloadRadarPagePdf } from "@/lib/radar/generate-radar-page-pdf"
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
  const territoryPdfDigestRef = useRef<RadarTerritoryPdfDigest | null>(null)

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

  const onTerritoryPdfDigest = useCallback((digest: RadarTerritoryPdfDigest | null) => {
    territoryPdfDigestRef.current = digest
  }, [])

  const handleExportRadarPagePdf = useCallback(() => {
    downloadRadarPagePdf({
      filters,
      catalog,
      territoryDigest: territoryPdfDigestRef.current,
    })
  }, [catalog, filters])

  const radarReportDisabled =
    mapDataStatus.csvFatalError !== null || mapDataStatus.csvLoading

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col bg-background px-4 py-6 text-foreground md:px-8 md:py-8">
      <header className="mx-auto w-full max-w-6xl text-center lg:text-left">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Radar{" "}
          <span className="font-semibold text-sky-700 dark:text-sky-400">
            Rio
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:mx-0">
          Esta página apoia o raciocínio territorial no Estado do Rio: no mapa, você enxerga onde
          se desenham os polígonos de referência e como se acumulam, ano a ano e por área, as ocorrências
          cuja georreferência coincide com esse recorte — útil antes de decisões ou reuniões rápidas.
          Você pode explorar combinando filtros (sempre abaixo do mapa), gerar um PDF com o que está visível
          quando precisa registrar ou dar apoio textual, ou abrir o assistente para detalhar o cenário
          atual. Além das contagens, há agregações já calculadas, como o delito predominante por recorte
          territorial. Em telas menores, pode ser preciso rolar um pouco a página para acessar todos os
          controles do mapa.
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
            onTerritoryPdfDigest={onTerritoryPdfDigest}
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
            toolbarExtra={
              <button
                type="button"
                disabled={radarReportDisabled}
                onClick={handleExportRadarPagePdf}
                title="Exportar filtros atuais e territórios visíveis em PDF"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-background/95 px-3 py-1.5 text-xs font-medium text-primary",
                  "hover:bg-muted/85 disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <FileDown className="size-3.5 shrink-0" aria-hidden />
                Gerar relatório
              </button>
            }
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
          Conteúdo meramente ilustrativo — o PDF &quot;Gerar relatório&quot; usa só os filtros e o estado
          do mapa neste navegador; o assistente continua isolado até você escrever no painel da
          conversa e enviar cada pedido ao servidor.
        </p>
      </div>

      <RadarAssistantSheet
        open={assistOpen}
        onOpenChange={setAssistOpen}
        onExportRadarPagePdf={handleExportRadarPagePdf}
        radarPagePdfDisabled={radarReportDisabled}
      />
    </div>
  )
}
