"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import type { FeatureCollection, MultiPolygon, Polygon } from "geojson"
import { useTheme } from "next-themes"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useHtmlHasDarkClass } from "@/hooks/use-html-dark-class"
import Map, { Layer, NavigationControl, Popup, Source } from "react-map-gl/maplibre"
import type { MapLayerMouseEvent } from "maplibre-gl"
import type { MapRef } from "react-map-gl/maplibre"

import {
  RADAR_MACRO_FILL_LAYER_ID,
  RADAR_MACRO_LINE_LAYER_ID,
  RADAR_MACRO_SOURCE_ID,
  RADAR_MAP_DARK_STYLE_CASCADE,
  RADAR_MAP_LIGHT_STYLE_CASCADE,
  RJ_ESTADO_FIT_BOUNDS,
  RJ_ESTADO_FIT_MAX_ZOOM,
  RJ_ESTADO_FIT_PADDING,
  RJ_ESTADO_INITIAL_VIEW,
  RJ_ESTADO_MAX_BOUNDS,
} from "@/config/rj-estado-map"
import { basemapUsesDarkInk } from "@/lib/radar/radar-basemap-contrast"
import {
  buildRadarTerritoryPdfDigest,
  type RadarTerritoryPdfDigest,
} from "@/lib/radar/build-radar-territory-pdf-digest"
import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"
import {
  fetchRadarRJCrosswalk,
  RADAR_RJ_CROSSED_CSV_URL,
} from "@/lib/radar/load-radar-rj-crossed"
import {
  aplicarRadarTerritoryFiltersToFeatureCollection,
  buildRadarFilterCatalog,
  type RadarFilterCatalog,
  type RadarTerritoryFiltersState,
} from "@/lib/radar/radar-territory-filter"
import { RADAR_RJ_MACROREGIOES_GEOJSON } from "@/data/radar-rio/mock-macroregions"
import { useMapStyleWithNetworkFallback } from "@/hooks/use-map-style-with-network-fallback"
import { cn } from "@/lib/utils"

type RadarMapLayers = FeatureCollection<
  Polygon | MultiPolygon,
  Record<string, string | number | undefined>
>

type DataMode = "territorio" | "demo"

type RadarLayerBriefStats = Readonly<{ total: number; visible: number }>

export type RadarMapDataStatus = Readonly<{
  /** Aguardando resposta ou leitura do CSV de territórios × ocorrências. */
  csvLoading: boolean
  /** Produção: CSV inválido ou indisponível e sem modo demo — o mapa interativo não abre. */
  csvFatalError: string | null
}>

type RjStateMapProps = {
  className?: string
  /** Origem CSV (defaults `RADAR_RJ_CROSSED_CSV_URL`). */
  csvUrl?: string
  filters: RadarTerritoryFiltersState
  onLayerStats?: (stats: RadarLayerBriefStats) => void
  onFilterCatalog?: (catalog: RadarFilterCatalog | null) => void
  /** Estado de dados para mensagens UX fora do mapa (ex.: filtros). */
  onMapDataStatus?: (status: RadarMapDataStatus) => void
  /** Resumo leve das features visíveis para exportação PDF (sem geometrias). */
  onTerritoryPdfDigest?: (digest: RadarTerritoryPdfDigest | null) => void
}

type RadarMacroHover = Readonly<{
  lng: number
  lat: number
  regiao: string
  tipoCrime: string
  indice: number
  nivel: RadarCrimeSeverity
  ocorrencias: number
  dominioOrcrim?: string
}>

/** Expressão MapLibre `fill-color`; outline/linhas variam com o tema do mapa base. */
const MACRO_FILL_MATCH = [
  "match",
  ["get", "nivel"],
  "critico",
  "rgba(239, 68, 68, 0.52)",
  "elevado",
  "rgba(249, 115, 22, 0.5)",
  "moderado",
  "rgba(234, 179, 8, 0.48)",
  "acompanhar",
  "rgba(34, 197, 94, 0.45)",
  "rgba(100, 116, 139, 0.4)",
] as const

const NIVEL_LABEL_DEMO: Record<RadarCrimeSeverity, string> = {
  critico: "Crítico",
  elevado: "Elevado",
  moderado: "Moderado",
  acompanhar: "Baixa / acompanhar",
}

const NIVEL_LABEL_POPUP_DEMO: Record<RadarCrimeSeverity, string> = {
  critico: `${NIVEL_LABEL_DEMO.critico} (demo)`,
  elevado: `${NIVEL_LABEL_DEMO.elevado} (demo)`,
  moderado: `${NIVEL_LABEL_DEMO.moderado} (demo)`,
  acompanhar: `${NIVEL_LABEL_DEMO.acompanhar} (demo)`,
}

/** Texto só no tooltip — relativos aos quantis dentro dos polígonos com ocorrências. */
const NIVEL_LABEL_POPUP_TERRITORIO: Record<RadarCrimeSeverity, string> = {
  critico:
    `${NIVEL_LABEL_DEMO.critico} — classe relativa (entre territórios com contagens positivas).`,
  elevado: `${NIVEL_LABEL_DEMO.elevado} — classe relativa (entre contagens positivas).`,
  moderado: `${NIVEL_LABEL_DEMO.moderado} — classe relativa (entre contagens positivas).`,
  acompanhar: `${NIVEL_LABEL_DEMO.acompanhar} — menor volume relativo.`,
}

function readHover(ev: MapLayerMouseEvent): RadarMacroHover | null {
  const f = ev.features?.[0]?.properties as
    | Record<string, string | number | undefined>
    | undefined
  if (!f) return null

  const nome =
    typeof f.nome_territorio === "string" ? f.nome_territorio.trim() : ""
  const regiao =
    typeof f.regiao === "string"
      ? f.regiao.trim()
      : nome.length > 0
        ? nome
        : ""

  const tipoCrimeBruto =
    typeof f.tipo_crime === "string" ? f.tipo_crime.trim() : ""
  const tipoCrime =
    tipoCrimeBruto.length > 0
      ? tipoCrimeBruto
      : "Sem descrição de delito disponível"

  const nivelRaw = typeof f.nivel === "string" ? f.nivel : ""
  if (
    nivelRaw !== "critico" &&
    nivelRaw !== "elevado" &&
    nivelRaw !== "moderado" &&
    nivelRaw !== "acompanhar"
  )
    return null

  const nivel = nivelRaw as RadarCrimeSeverity

  const idxRaw = f.indice_prioridade
  const idxNum =
    typeof idxRaw === "number"
      ? idxRaw
      : Number(typeof idxRaw === "string" ? idxRaw.trim() : String(idxRaw ?? ""))
  const idx = Number.isFinite(idxNum) ? idxNum : 0

  let ocorr = 0
  if (typeof f.total_ocorrencias === "number") {
    ocorr = f.total_ocorrencias
  } else if (typeof f.ocorrencias === "number") {
    ocorr = f.ocorrencias
  } else if (typeof f.ocorrencias_mock === "number") {
    ocorr = f.ocorrencias_mock
  }

  const dominio =
    typeof f.dominio_orcrim === "string" ? f.dominio_orcrim.trim() : ""

  return {
    lng: ev.lngLat.lng,
    lat: ev.lngLat.lat,
    regiao: regiao.length > 0 ? regiao : "Território",
    tipoCrime,
    indice: idx,
    nivel,
    ocorrencias: ocorr,
    ...(dominio.length > 0 ? { dominioOrcrim: dominio } : {}),
  }
}

function MacroPopup({
  hover,
  nivelLabels,
  dataMode,
}: {
  hover: RadarMacroHover
  nivelLabels: Record<RadarCrimeSeverity, string>
  dataMode: DataMode
}) {
  return (
    <Popup
      anchor="bottom"
      closeButton={false}
      latitude={hover.lat}
      longitude={hover.lng}
      maxWidth="300px"
      offset={24}
      style={{ pointerEvents: "none" }}
    >
      <div className="text-[13px] leading-snug">
        <p className="border-b border-border pb-1 font-semibold text-foreground">
          {hover.regiao}
        </p>
        {hover.dominioOrcrim ? (
          <p className="text-muted-foreground mt-1 text-[11px]">
            Domínio (OCRIM):{" "}
            <span className="font-medium text-foreground">{hover.dominioOrcrim}</span>
          </p>
        ) : null}
        <p className="text-muted-foreground mt-2 text-[10px] font-medium uppercase tracking-wider">
          {dataMode === "demo" ? "Dados apenas ilustrativos" : "Contagens no polígono"}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Tipologia predominante registrada (agregação):{" "}
          <span className="font-medium text-foreground">{hover.tipoCrime}</span>
        </p>
        <p className="text-muted-foreground mt-2 text-xs tracking-wide">
          Gravidade (relativa):{" "}
          <span className="text-foreground">{nivelLabels[hover.nivel]}</span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Índice sintético:{" "}
          <span className="text-foreground">{hover.indice}</span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Registros com localização dentro do polígono:{" "}
          <span className="text-foreground">{hover.ocorrencias}</span>
        </p>
      </div>
    </Popup>
  )
}

const EMPTY_FEATURES: RadarMapLayers = {
  type: "FeatureCollection",
  features: [],
}

/** MapLibre: Estado do RJ — polígonos de território + ocorrências agregadas (CSV) ou modo demo. */
export function RjStateMap({
  className,
  csvUrl = RADAR_RJ_CROSSED_CSV_URL,
  filters,
  onLayerStats,
  onFilterCatalog,
  onMapDataStatus,
  onTerritoryPdfDigest,
}: RjStateMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [hover, setHover] = useState<RadarMacroHover | null>(null)
  const { resolvedTheme } = useTheme()
  const htmlDark = useHtmlHasDarkClass()

  const [layers, setLayers] = useState<RadarMapLayers | null>(null)
  const [dataMode, setDataMode] = useState<DataMode>("territorio")
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)
  /** Só permite fallback demo em falha ao carregar; evita regressão silenciosa em produção. */
  const [allowDemoFallback] = useState(() => process.env.NODE_ENV !== "production")

  const nivelLegend = NIVEL_LABEL_DEMO

  const nivelPopupLabels =
    dataMode === "demo" ? NIVEL_LABEL_POPUP_DEMO : NIVEL_LABEL_POPUP_TERRITORIO

  /** Camada GeoJSON já carregada (CSV válido ou grelha demo). Antes da carga inicial = null. */
  const baseTerritoryFc = layers

  const filterCatalog = useMemo(() => {
    if (!baseTerritoryFc) return null
    return buildRadarFilterCatalog(baseTerritoryFc)
  }, [baseTerritoryFc])

  useEffect(() => {
    onFilterCatalog?.(filterCatalog ?? null)
  }, [filterCatalog, onFilterCatalog])

  const filteredPack = useMemo(() => {
    if (!baseTerritoryFc) {
      return { filtradas: EMPTY_FEATURES, total: 0, visible: 0 }
    }
    return aplicarRadarTerritoryFiltersToFeatureCollection(
      baseTerritoryFc,
      filters
    )
  }, [baseTerritoryFc, filters])

  const territoryPdfDigest = useMemo((): RadarTerritoryPdfDigest | null => {
    if (!baseTerritoryFc) return null
    return buildRadarTerritoryPdfDigest({
      dataMode,
      featuresTotal: filteredPack.total,
      featuresVisible: filteredPack.visible,
      features: filteredPack.filtradas.features,
    })
  }, [baseTerritoryFc, dataMode, filteredPack])

  useEffect(() => {
    onTerritoryPdfDigest?.(territoryPdfDigest)
  }, [onTerritoryPdfDigest, territoryPdfDigest])

  useEffect(() => {
    if (!onLayerStats) return
    onLayerStats({
      total: filteredPack.total,
      visible: filteredPack.visible,
    })
  }, [filteredPack, onLayerStats])

  /** Features efetivamente desenhadas (respeita filtros do painel). */
  const displayLayersFiltered = filteredPack.filtradas as RadarMapLayers

  useEffect(() => {
    setHover(null)
  }, [displayLayersFiltered])

  useEffect(() => {
    let cancel = false
    setLayers(null)

    fetchRadarRJCrosswalk(csvUrl)
      .then((fc) => {
        if (!cancel) {
          setDataMode("territorio")
          setLoadErrorMessage(null)
          setLayers(fc as RadarMapLayers)
        }
      })
      .catch((e: unknown) => {
        if (cancel) return
        const msg = e instanceof Error ? e.message : String(e ?? "erro desconhecido")
        setLoadErrorMessage(msg)
        if (allowDemoFallback) {
          setDataMode("demo")
          setLayers(RADAR_RJ_MACROREGIOES_GEOJSON as RadarMapLayers)
        } else {
          setLayers(null)
        }
      })

    return () => {
      cancel = true
    }
  }, [csvUrl, allowDemoFallback])

  const isDarkBasemap = htmlDark || resolvedTheme === "dark"
  const radarStyleCascade = isDarkBasemap
    ? RADAR_MAP_DARK_STYLE_CASCADE
    : RADAR_MAP_LIGHT_STYLE_CASCADE

  const {
    effectiveStyleUrl,
    onStyleLoadSuccess,
    onStyleLoadError,
    usingFallbackBasemap,
    fallbackBasemapUserHint,
  } = useMapStyleWithNetworkFallback(radarStyleCascade)

  const macroInkIsDarkBasemap = basemapUsesDarkInk(effectiveStyleUrl)

  const macroLayers = useMemo(() => {
    const outline = macroInkIsDarkBasemap
      ? "rgba(255, 255, 255, 0.3)"
      : "rgba(30, 41, 59, 0.26)"
    const lineColor = macroInkIsDarkBasemap
      ? "rgba(248, 250, 252, 0.62)"
      : "rgba(30, 41, 59, 0.5)"

    const fillPaint = {
      "fill-color": [...MACRO_FILL_MATCH],
      "fill-outline-color": outline,
      "fill-opacity": 1,
    }

    const linePaint = {
      "line-color": lineColor,
      "line-width": macroInkIsDarkBasemap ? 1.6 : 1.35,
    }

    const fillLayer = {
      id: RADAR_MACRO_FILL_LAYER_ID,
      type: "fill" as const,
      source: RADAR_MACRO_SOURCE_ID,
      paint: fillPaint as unknown as Record<string, unknown>,
    }

    const lineLayer = {
      id: RADAR_MACRO_LINE_LAYER_ID,
      type: "line" as const,
      source: RADAR_MACRO_SOURCE_ID,
      paint: linePaint as unknown as Record<string, unknown>,
    }

    return { fillLayer, lineLayer }
  }, [macroInkIsDarkBasemap])

  const applyStateBounds = useCallback(() => {
    const raw = mapRef.current?.getMap()
    if (!raw) return
    raw.fitBounds(RJ_ESTADO_FIT_BOUNDS, {
      padding: RJ_ESTADO_FIT_PADDING,
      maxZoom: RJ_ESTADO_FIT_MAX_ZOOM,
      duration: 0,
    })
  }, [])

  const onMove = useCallback((ev: MapLayerMouseEvent) => {
    setHover(readHover(ev))
  }, [])

  const onLeave = useCallback(() => {
    setHover(null)
  }, [])

  const stillLoadingTerritorio =
    layers === null && dataMode !== "demo" && loadErrorMessage === null

  const failedProdWithoutLayers =
    Boolean(loadErrorMessage) && layers === null && !allowDemoFallback

  useEffect(() => {
    onMapDataStatus?.({
      csvLoading: stillLoadingTerritorio,
      csvFatalError: failedProdWithoutLayers ? loadErrorMessage : null,
    })
  }, [
    failedProdWithoutLayers,
    loadErrorMessage,
    onMapDataStatus,
    stillLoadingTerritorio,
  ])

  if (stillLoadingTerritorio) {
    return (
      <div
        className={cn(
          "relative flex min-h-[400px] w-full flex-1 items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground",
          className
        )}
      >
        Carregando território e agregações (CSV público)…
      </div>
    )
  }

  if (failedProdWithoutLayers) {
    return (
      <div
        className={cn(
          "relative flex min-h-[400px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 text-center text-sm text-muted-foreground",
          className
        )}
      >
        <p className="font-medium text-destructive">Não foi possível carregar o mapa Radar.</p>
        <p className="max-w-md text-xs">{loadErrorMessage}</p>
      </div>
    )
  }

  return (
    <div
      data-radar-basemap-ink={macroInkIsDarkBasemap ? "dark" : "light"}
      data-radar-map
      className={cn(
        "relative isolate flex h-full min-h-[400px] w-full min-w-0 flex-1 flex-col",
        className
      )}
    >
      <div className="relative h-full min-h-[400px] min-w-0 flex-1">
        <Map
          key={effectiveStyleUrl}
          ref={mapRef}
          mapStyle={effectiveStyleUrl}
          reuseMaps
          initialViewState={RJ_ESTADO_INITIAL_VIEW}
          maxBounds={RJ_ESTADO_MAX_BOUNDS}
          maxPitch={0}
          minZoom={6}
          maxZoom={13}
          style={{ width: "100%", height: "100%", minHeight: 400 }}
          interactiveLayerIds={[RADAR_MACRO_FILL_LAYER_ID]}
          cursor={hover ? "pointer" : "grab"}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onLoad={() => {
            onStyleLoadSuccess()
            applyStateBounds()
            requestAnimationFrame(() => {
              mapRef.current?.resize()
            })
          }}
          onError={onStyleLoadError}
        >
          <Source data={displayLayersFiltered} id={RADAR_MACRO_SOURCE_ID} type="geojson">
            <Layer {...macroLayers.fillLayer} />
            <Layer {...macroLayers.lineLayer} />
          </Source>

          {hover ? (
            <MacroPopup
              dataMode={dataMode}
              hover={hover}
              nivelLabels={nivelPopupLabels}
            />
          ) : null}

          <NavigationControl
            visualizePitch={false}
            position="bottom-left"
            style={{
              opacity: 0.92,
              borderRadius: 10,
              overflow: "hidden",
            }}
          />
        </Map>
      </div>

      {usingFallbackBasemap ? (
        <div className="absolute top-3 right-3 z-20 md:left-[13.5rem] md:right-auto">
          <span
            role="note"
            className="bg-background/90 hover:bg-accent/40 border-border hover:border-border cursor-help rounded-md border px-2 py-1 text-[10px] leading-snug text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur-sm"
            tabIndex={0}
            aria-label={fallbackBasemapUserHint}
            title={fallbackBasemapUserHint}
          >
            Mapa base (reserva)
          </span>
        </div>
      ) : null}

      <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[180px] text-[10px] leading-snug text-muted-foreground">
        <div className="bg-background/90 rounded-lg border border-border px-2.5 py-2 shadow-sm ring-1 ring-border backdrop-blur-sm">
          <p className="border-b border-border pb-1 font-semibold uppercase tracking-wider">
            Prioridade territorial
          </p>
          <ul className="text-foreground mt-2 space-y-1.5 font-medium">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm bg-emerald-500/80" />
              {nivelLegend.acompanhar}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm bg-amber-500/80" />
              {nivelLegend.moderado}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm bg-orange-500/85" />
              {nivelLegend.elevado}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm bg-red-500/85" />
              {nivelLegend.critico}
            </li>
          </ul>
        </div>
      </div>

      <div
        className={cn(
          "text-muted-foreground pointer-events-none absolute bottom-14 left-2 right-14 z-10 text-[11px]",
          "drop-shadow-[0_1px_3px_rgb(0,0,0,0.35)] dark:drop-shadow-[0_1px_4px_rgb(0,0,0,0.9)]",
          "md:bottom-auto md:right-auto md:left-3 md:top-3 md:text-xs"
        )}
      >
        <span className="bg-background/90 rounded-md border border-border px-2 py-1 backdrop-blur-sm">
          {dataMode === "demo"
            ? "Demonstração sem CSV — dados de grade não são oficiais."
            : loadErrorMessage
              ? `Modo fallback (dev): erro ao ler CSV (${loadErrorMessage.slice(0, 90)}…) — utilizando dados simulados.`
              : "Polígonos de território (fonte OCRIM) × ocorrências com localização no polígono — apenas georreferências coincidentes."}
        </span>
      </div>
    </div>
  )
}
