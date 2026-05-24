import Papa from "papaparse"
import wktParse from "wellknown"

import { polygonTouchesRioMunicipality } from "@/config/rio-bbox"

import type { TerritoriosParseStats } from "@/types/territorio"

export type TerritorioProperties = {
  nome_territorio: string
  organizacao_criminosa: string
}

export type TerritoriosFeatureCollection = {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    geometry: PolygonGeometry
    properties: TerritorioProperties
  }>
}

export type PolygonGeometry = {
  type: "Polygon"
  coordinates: number[][][]
}

type CsvRow = {
  nome_territorio?: string
  dominio_orcrim?: string
  geometria?: string
}

function stripCrs<T extends Record<string, unknown>>(geometry: T): T {
  if ("crs" in geometry) {
    Reflect.deleteProperty(geometry, "crs")
  }
  return geometry
}

function isPolygonGeometry(value: unknown): value is PolygonGeometry {
  if (!value || typeof value !== "object") return false
  const obj = value as Record<string, unknown>
  return (
    obj.type === "Polygon" &&
    Array.isArray(obj.coordinates) &&
    obj.coordinates.length > 0
  )
}

const PAPA_PARSE_OPTIONS = {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h: string) => h.trim(),
} as const

export type TerritoriosBuildResult = {
  data: TerritoriosFeatureCollection
  stats: TerritoriosParseStats
}

/** Converte texto CSV de domínio territorial em GeoJSON filtrado à área aproximada do Rio. */
export function buildTerritoriosFeatureCollection(
  csvText: string
): TerritoriosBuildResult {
  const parsed = Papa.parse<CsvRow>(csvText, PAPA_PARSE_OPTIONS)

  let skippedInvalid = 0
  let skippedOutsideRio = 0
  const features: TerritoriosFeatureCollection["features"] = []

  for (const row of parsed.data) {
    const wkt = row.geometria?.trim()
    const nome = row.nome_territorio?.trim() ?? ""
    const dominio = row.dominio_orcrim?.trim() ?? ""

    if (!wkt || !nome) {
      skippedInvalid++
      continue
    }

    const parsedGeometry = wktParse(wkt) as Record<string, unknown> | null
    if (!isPolygonGeometry(parsedGeometry)) {
      skippedInvalid++
      continue
    }

    stripCrs(parsedGeometry)

    if (!polygonTouchesRioMunicipality(parsedGeometry)) {
      skippedOutsideRio++
      continue
    }

    features.push({
      type: "Feature",
      geometry: parsedGeometry,
      properties: {
        nome_territorio: nome,
        organizacao_criminosa: dominio,
      },
    })
  }

  return {
    data: { type: "FeatureCollection", features },
    stats: {
      parsedRows: parsed.data.length,
      skippedInvalid,
      skippedOutsideRio,
    },
  }
}
