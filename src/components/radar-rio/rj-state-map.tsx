"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import { useTheme } from "next-themes"
import { useCallback, useMemo, useRef, useState } from "react"
import Map, { Layer, NavigationControl, Popup, Source } from "react-map-gl/maplibre"
import type { MapLayerMouseEvent } from "maplibre-gl"
import type { MapRef } from "react-map-gl/maplibre"

import {
  RADAR_MACRO_FILL_LAYER_ID,
  RADAR_MACRO_LINE_LAYER_ID,
  RADAR_MACRO_SOURCE_ID,
  RADAR_MAP_DARK_STYLE_URL,
  RADAR_MAP_LIGHT_STYLE_URL,
  RJ_ESTADO_FIT_BOUNDS,
  RJ_ESTADO_FIT_MAX_ZOOM,
  RJ_ESTADO_FIT_PADDING,
  RJ_ESTADO_INITIAL_VIEW,
  RJ_ESTADO_MAX_BOUNDS,
} from "@/config/rj-estado-map"
import { cn } from "@/lib/utils"
import { RADAR_RJ_MACROREGIOES_GEOJSON } from "@/data/radar-rio/mock-macroregions"
import type { RadarMacroRegiaoScenario } from "@/data/radar-rio/mock-macroregions"

type RjStateMapProps = {
  className?: string
}

type RadarMacroHover = Readonly<{
  lng: number
  lat: number
  regiao: string
  tipoCrime: string
  indice: number
  nivel: RadarMacroRegiaoScenario
  ocorrencias: number
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

const NIVEL_LABEL: Record<RadarMacroRegiaoScenario, string> = {
  critico: "Crítico (simulado)",
  elevado: "Elevado (simulado)",
  moderado: "Moderado (simulado)",
  acompanhar: "Baixa / acompanhar (simulado)",
}

function readHover(ev: MapLayerMouseEvent): RadarMacroHover | null {
  const f = ev.features?.[0]?.properties as
    | Record<string, string | number | undefined>
    | undefined
  if (
    !f ||
    typeof f.regiao !== "string" ||
    typeof f.tipo_crime !== "string" ||
    typeof f.indice_prioridade !== "number"
  )
    return null

  const nivelRaw = typeof f.nivel === "string" ? f.nivel : ""
  if (
    nivelRaw !== "critico" &&
    nivelRaw !== "elevado" &&
    nivelRaw !== "moderado" &&
    nivelRaw !== "acompanhar"
  ) {
    return null
  }

  const nivel = nivelRaw as RadarMacroRegiaoScenario

  const ocorr = typeof f.ocorrencias_mock === "number" ? f.ocorrencias_mock : 0

  return {
    lng: ev.lngLat.lng,
    lat: ev.lngLat.lat,
    regiao: f.regiao,
    tipoCrime: f.tipo_crime,
    indice: f.indice_prioridade,
    nivel,
    ocorrencias: ocorr,
  }
}

function MacroPopup({ hover }: { hover: RadarMacroHover }) {
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
        <p className="text-muted-foreground mt-2 text-[10px] font-medium uppercase tracking-wider">
          Crimes simulados · não oficial
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Tipologia predominante:{" "}
          <span className="font-medium text-foreground">{hover.tipoCrime}</span>
        </p>
        <p className="text-muted-foreground mt-2 text-xs tracking-wide">
          Gravidade estimada:{" "}
          <span className="text-foreground">{NIVEL_LABEL[hover.nivel]}</span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Índice relativo (demo):{" "}
          <span className="text-foreground">{hover.indice}</span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Ocorrências sintéticas:{" "}
          <span className="text-foreground">{hover.ocorrencias}</span>
        </p>
      </div>
    </Popup>
  )
}

/** MapLibre: Estado do RJ com polígonos simulando incidência de crimes por área (fictício). */
export function RjStateMap({ className }: RjStateMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [hover, setHover] = useState<RadarMacroHover | null>(null)
  const { resolvedTheme } = useTheme()

  const isDarkBasemap = resolvedTheme === "dark"
  const mapStyleUrl = isDarkBasemap ? RADAR_MAP_DARK_STYLE_URL : RADAR_MAP_LIGHT_STYLE_URL

  const macroLayers = useMemo(() => {
    const outline = isDarkBasemap
      ? "rgba(250, 250, 250, 0.12)"
      : "rgba(30, 41, 59, 0.22)"
    const lineColor = isDarkBasemap ? "rgba(250, 250, 250, 0.38)" : "rgba(30, 41, 59, 0.45)"

    const fillPaint = {
      "fill-color": [...MACRO_FILL_MATCH],
      "fill-outline-color": outline,
      "fill-opacity": 1,
    }

    const linePaint = {
      "line-color": lineColor,
      "line-width": 1.35,
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
  }, [isDarkBasemap])

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

  return (
    <div
      className={cn(
        "relative isolate flex h-full min-h-[400px] w-full min-w-0 flex-1 flex-col",
        className
      )}
    >
      <div className="relative h-full min-h-[400px] min-w-0 flex-1">
        <Map
          key={mapStyleUrl}
          ref={mapRef}
          mapStyle={mapStyleUrl}
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
            applyStateBounds()
            requestAnimationFrame(() => {
              mapRef.current?.resize()
            })
          }}
        >
          <Source data={RADAR_RJ_MACROREGIOES_GEOJSON} id={RADAR_MACRO_SOURCE_ID} type="geojson">
            <Layer {...macroLayers.fillLayer} />
            <Layer {...macroLayers.lineLayer} />
          </Source>

          {hover ? <MacroPopup hover={hover} /> : null}

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

      <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[150px] text-[10px] leading-snug text-muted-foreground">
        <div className="bg-background/90 rounded-lg border border-border px-2.5 py-2 shadow-sm ring-1 ring-border backdrop-blur-sm">
          <p className="border-b border-border pb-1 font-semibold uppercase tracking-wider">
            Incidência (simulação)
          </p>
          <ul className="text-foreground mt-2 space-y-1.5 font-medium">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm bg-emerald-500/80" />
              Baixa · acompanhar
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm bg-amber-500/80" />
              Moderado
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm bg-orange-500/85" />
              Elevado
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm bg-red-500/85" />
              Crítico
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
          Polígonos simulados de crimes por área — dados não oficiais
        </span>
      </div>
    </div>
  )
}
