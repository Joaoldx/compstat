"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import { useCallback, useEffect, useRef, useState } from "react"
import Map, { Layer, Popup, Source } from "react-map-gl/maplibre"
import type { MapLayerMouseEvent } from "maplibre-gl"
import type { MapRef } from "react-map-gl/maplibre"

import {
  MAP_BASE_STYLE_URL,
  RIO_INITIAL_VIEW,
  TERRITORIOS_LAYER_IDS,
  TERRITORIOS_MAP_FIT_PADDING,
  TERRITORIOS_MAP_MAX_ZOOM,
  TERRITORIOS_SOURCE_ID,
} from "@/config/mapa"
import { useTerritoriosGeoJson } from "@/hooks/use-territorios-geojson"
import { boundsFromTerritoriosCollection } from "@/lib/geo/polygon-feature-collection-bounds"
import type { TerritoriosFeatureCollection } from "@/lib/parse-territorio-csv"
import type { TerritorioHoverInfo } from "@/types/territorio"

const FILL_LAYER = {
  id: TERRITORIOS_LAYER_IDS.fill,
  type: "fill" as const,
  source: TERRITORIOS_SOURCE_ID,
  paint: {
    "fill-color": "hsla(217, 90%, 45%, 0.35)",
    "fill-outline-color": "hsla(217, 90%, 35%, 0.9)",
  },
}

const LINE_LAYER = {
  id: TERRITORIOS_LAYER_IDS.line,
  type: "line" as const,
  source: TERRITORIOS_SOURCE_ID,
  paint: {
    "line-color": "hsla(217, 95%, 32%, 0.95)",
    "line-width": 1.2,
  },
}

function readHoverFromEvent(
  event: MapLayerMouseEvent
): TerritorioHoverInfo | null {
  const raw = event.features?.[0]?.properties
  if (!raw) return null

  const nome =
    raw.nome_territorio != null ? String(raw.nome_territorio) : ""
  if (!nome) return null

  const organizacao =
    raw.organizacao_criminosa != null
      ? String(raw.organizacao_criminosa)
      : ""

  return {
    lng: event.lngLat.lng,
    lat: event.lngLat.lat,
    nome_territorio: nome,
    organizacao_criminosa: organizacao,
  }
}

function TerritoriosHoverPopup({ hover }: { hover: TerritorioHoverInfo }) {
  return (
    <Popup
      anchor="top-left"
      closeButton={false}
      latitude={hover.lat}
      longitude={hover.lng}
      maxWidth="320px"
      offset={16}
      style={{ pointerEvents: "none" }}
    >
      <div className="text-foreground text-sm leading-snug">
        <p className="font-medium">Território: {hover.nome_territorio}</p>
        <p className="mt-1 text-muted-foreground">
          Organização criminosa: {hover.organizacao_criminosa || "—"}
        </p>
      </div>
    </Popup>
  )
}

function MapStatus({
  variant,
  message,
}: {
  variant: "muted" | "destructive"
  message: string
}) {
  const color =
    variant === "destructive" ? "text-destructive" : "text-muted-foreground"

  return (
    <p
      className={`flex h-full items-center justify-center px-4 text-center text-sm ${color}`}
    >
      {message}
    </p>
  )
}

/** MapLibre interactivo dos domínios territoriais (RJ). */
export function RioMap({ className }: { className?: string }) {
  const loadState = useTerritoriosGeoJson()
  const mapRef = useRef<MapRef>(null)
  const [mapReady, setMapReady] = useState(false)
  const [hover, setHover] = useState<TerritorioHoverInfo | null>(null)

  const geojson: TerritoriosFeatureCollection | null =
    loadState.status === "ready" ? loadState.data : null

  useEffect(() => {
    if (!mapReady || !geojson?.features.length || !mapRef.current) return

    const bounds = boundsFromTerritoriosCollection(geojson)
    if (!bounds) return

    mapRef.current.getMap().fitBounds(bounds, {
      padding: TERRITORIOS_MAP_FIT_PADDING,
      maxZoom: TERRITORIOS_MAP_MAX_ZOOM,
      duration: 0,
    })
  }, [geojson, mapReady])

  const onMouseMove = useCallback((event: MapLayerMouseEvent) => {
    setHover(readHoverFromEvent(event))
  }, [])

  const onMouseLeave = useCallback(() => {
    setHover(null)
  }, [])

  const wrapperClass =
    className ??
    "relative h-[min(75vh,calc(100dvh-6rem))] w-full md:h-[calc(100dvh-10rem)]"

  if (loadState.status === "loading") {
    return (
      <div className={wrapperClass}>
        <MapStatus message="A carregar mapa…" variant="muted" />
      </div>
    )
  }

  if (loadState.status === "error") {
    return (
      <div className={wrapperClass}>
        <MapStatus message={loadState.message} variant="destructive" />
      </div>
    )
  }

  if (loadState.status === "empty") {
    return (
      <div className={wrapperClass}>
        <MapStatus
          message="Sem polígonos na área do Rio após o filtro configurado."
          variant="muted"
        />
      </div>
    )
  }

  const data = loadState.data

  return (
    <div className={wrapperClass}>
      <Map
        ref={mapRef}
        cursor={hover ? "pointer" : "grab"}
        initialViewState={RIO_INITIAL_VIEW}
        interactiveLayerIds={[TERRITORIOS_LAYER_IDS.fill]}
        mapStyle={MAP_BASE_STYLE_URL}
        maxPitch={0}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
        onLoad={() => setMapReady(true)}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
      >
        <Source data={data} id={TERRITORIOS_SOURCE_ID} type="geojson">
          <Layer {...FILL_LAYER} />
          <Layer {...LINE_LAYER} />
        </Source>

        {hover ? <TerritoriosHoverPopup hover={hover} /> : null}
      </Map>
    </div>
  )
}
