import Papa from "papaparse"
import wktParse from "wellknown"

import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson"

/** URL pública (pasta `public/data`). */
export const RADAR_RJ_CROSSED_CSV_URL = "/data/radar-rj-crossed.csv" as const

export type RadarCrimeSeverity = "critico" | "elevado" | "moderado" | "acompanhar"

export type RadarCrossedPolygonProperties = Readonly<{
  territorio_id: string
  nome_territorio: string
  dominio_orcrim: string
  total_ocorrencias: number
  indice_prioridade: number
  nivel: RadarCrimeSeverity
  delito_principal_cod: string
  delito_principal_desc: string
  /** Aliases utilizados pela camada do mapa */
  regiao: string
  tipo_crime: string
  ocorrencias: number
  ocorrencias_por_ano_json: string
  ocorrencias_por_delito_json: string
}>

type CsvRow = Readonly<
  Partial<Record<string, string>> & {
    geometria?: string
  }
>

const PAPA_PARSE_OPTIONS = {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h: string) => h.replace(/^\ufeff/, "").trim(),
} as const

function stripCrs<T extends Record<string, unknown>>(geometry: T): T {
  if ("crs" in geometry) {
    Reflect.deleteProperty(geometry, "crs")
  }
  return geometry
}

function isPolygonOrMultiPolygon(
  value: unknown
): value is Polygon | MultiPolygon {
  if (!value || typeof value !== "object") return false
  const g = value as { type?: string; coordinates?: unknown }
  const okType = g.type === "Polygon" || g.type === "MultiPolygon"
  return okType && Array.isArray(g.coordinates) && g.coordinates.length > 0
}

/**
 * Une `ocorrencias_por_ano_json` com colunas CSV `ano_YYYY`; previne dupla contagem
 * quando ambos indicam contagens usando o máximo por ano — ignorando anos zerados.
 */
function mergeOcurrenciasPorAnoJsonCsv(row: CsvRow): string {
  let fromJson: Record<string, number> = {}
  const rawJs = row.ocorrencias_por_ano_json?.trim()
  if (rawJs) {
    try {
      const p = JSON.parse(rawJs) as unknown
      if (p && typeof p === "object" && !Array.isArray(p)) {
        const o = p as Record<string, unknown>
        for (const [k, v] of Object.entries(o)) {
          const n =
            typeof v === "number"
              ? v
              : Number(typeof v === "string" ? v.trim() : String(v ?? ""))
          if (!Number.isFinite(n) || n <= 0) continue
          fromJson[String(k)] = Math.max(fromJson[String(k)] ?? 0, n)
        }
      }
    } catch {
      fromJson = {}
    }
  }

  for (const [k, v] of Object.entries(row)) {
    const m = /^ano_(\d{4})$/.exec(k)
    if (!m) continue
    const yearKey = m[1]
    const num = Number(typeof v === "string" ? String(v).trim() : String(v ?? ""))
    if (!Number.isFinite(num) || num <= 0) continue
    const prev = typeof fromJson[yearKey] === "number" ? fromJson[yearKey] : 0
    fromJson[yearKey] = Math.max(prev, num)
  }

  return JSON.stringify(fromJson)
}

function nivelFromCsv(raw: string | undefined): RadarCrimeSeverity | null {
  const s = typeof raw === "string" ? raw.trim() : ""
  if (
    s === "critico" ||
    s === "elevado" ||
    s === "moderado" ||
    s === "acompanhar"
  ) {
    return s
  }
  return null
}

export type RadarCrosswalkLoadStats = Readonly<{
  features: number
  totalTerritoryRows: number
  skippedGeometry: number
  sumOcorrenciasInPolygonos: number
}>

/** GeoJSON `{ type FeatureCollection Polygon|MultiPolygon, ...}` pronto para MapLibre. */
export async function fetchRadarRJCrosswalk(
  url: string = RADAR_RJ_CROSSED_CSV_URL
): Promise<
  FeatureCollection<Polygon | MultiPolygon, RadarCrossedPolygonProperties>
> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Radar: falha ao carregar CSV (${res.status})`)
  }
  const text = await res.text()
  const { result, stats } = parseRadarRJCrossCsvText(text)
  if (
    stats.skippedGeometry > 0 &&
    process.env.NODE_ENV === "development"
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Radar] Linhas territoriais ignoradas (geometria inválida): ${stats.skippedGeometry}`
    )
  }

  return result
}

export function parseRadarRJCrossCsvText(
  csvText: string
): {
  result: FeatureCollection<Polygon | MultiPolygon, RadarCrossedPolygonProperties>
  stats: RadarCrosswalkLoadStats
} {
  const parsed = Papa.parse<CsvRow>(csvText, PAPA_PARSE_OPTIONS)
  const rows = parsed.data ?? []
  const features: Feature<Polygon | MultiPolygon, RadarCrossedPolygonProperties>[] =
    []

  let skippedGeometry = 0
  let sumOcorrencias = 0

  for (const row of rows) {
    const wkt = row.geometria?.trim()
    const territorioId = row.territorio_id?.trim() ?? ""
    if (!wkt || !territorioId) {
      skippedGeometry++
      continue
    }

    const parsedGeometry = wktParse(wkt) as Record<string, unknown> | null
    if (!isPolygonOrMultiPolygon(parsedGeometry)) {
      skippedGeometry++
      continue
    }
    stripCrs(parsedGeometry)

    const total = Number(String(row.total_ocorrencias ?? "0"))
    const indice = Number(String(row.indice_prioridade ?? "0"))
    const nivel = nivelFromCsv(row.nivel ?? "")
    if (!Number.isFinite(total) || !Number.isFinite(indice) || !nivel) {
      skippedGeometry++
      continue
    }

    const nome = row.nome_territorio?.trim() ?? ""
    const dominio = row.dominio_orcrim?.trim() ?? ""

    sumOcorrencias += Math.max(0, total)

    features.push({
      type: "Feature",
      geometry: parsedGeometry as Polygon | MultiPolygon,
      properties: {
        territorio_id: territorioId,
        nome_territorio: nome,
        dominio_orcrim: dominio,
        total_ocorrencias: total,
        indice_prioridade: indice,
        nivel,
        delito_principal_cod: row.delito_principal_cod?.trim() ?? "",
        delito_principal_desc: row.delito_principal_desc?.trim() ?? "",
        regiao: nome,
        tipo_crime: row.delito_principal_desc?.trim() ?? "",
        ocorrencias: total,
        ocorrencias_por_ano_json: mergeOcurrenciasPorAnoJsonCsv(row),
        ocorrencias_por_delito_json:
          row.ocorrencias_por_delito_json?.trim() ?? "{}",
      },
    })
  }

  const stats = {
    features: features.length,
    totalTerritoryRows: rows.length,
    skippedGeometry,
    sumOcorrenciasInPolygonos: sumOcorrencias,
  }

  return { result: { type: "FeatureCollection", features }, stats }
}
