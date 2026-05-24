import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson"

import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"

export const RADAR_FILTROS_NIVEIS_TODOS: readonly RadarCrimeSeverity[] = [
  "critico",
  "elevado",
  "moderado",
  "acompanhar",
] as const

export type RadarTerritoryFiltersState = Readonly<{
  textoTerritorio: string
  dominioOrcrim: string
  niveis: readonly RadarCrimeSeverity[]
  anoMin: number
  anoMax: number
  delitoSeleccionCod: string
}>

export function defaultRadarTerritoryFilters(): RadarTerritoryFiltersState {
  return {
    textoTerritorio: "",
    dominioOrcrim: "",
    niveis: [...RADAR_FILTROS_NIVEIS_TODOS],
    anoMin: 2000,
    anoMax: new Date().getFullYear(),
    delitoSeleccionCod: "",
  }
}

export type RadarFilterCatalog = Readonly<{
  dominios: readonly string[]
  yearMin: number
  yearMax: number
  delitos: ReadonlyArray<{ cod: string; desc: string }>
  hasDominioOrcrimColumn: boolean
  hasDistribuicaoPorAno: boolean
  hasDistribuicaoDelitoExtra: boolean
}>

/** Contagens `{ "2020": n }` por território. */
export function parseOcurrenciasPorAnoJson(raw: unknown): Record<number, number> {
  if (typeof raw !== "string" || raw.trim().length === 0) return {}
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== "object" || Array.isArray(o)) return {}
    const out: Record<number, number> = {}
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      const y = Number.parseInt(k, 10)
      const n =
        typeof v === "number"
          ? v
          : Number(typeof v === "string" ? v.trim() : String(v ?? ""))
      if (
        Number.isFinite(y) &&
        y >= 1900 &&
        y <= 2100 &&
        Number.isFinite(n) &&
        n > 0
      ) {
        out[y] = n
      }
    }
    return out
  } catch {
    return {}
  }
}

/** Contagens por código `{ "15": count }`. */
export function parseOcurrenciasPorDelitoJson(
  raw: unknown
): Record<string, number> {
  if (typeof raw !== "string" || raw.trim().length === 0) return {}
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== "object" || Array.isArray(o)) return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      const ck = typeof k === "string" ? k.trim() : String(k ?? "")
      if (!ck.length) continue
      const n =
        typeof v === "number"
          ? v
          : Number(typeof v === "string" ? v.trim() : String(v ?? ""))
      if (!Number.isFinite(n) || n <= 0) continue
      out[ck] = n
    }
    return out
  } catch {
    return {}
  }
}

export type NormalizadoTerritorioFiltro = Readonly<{
  nome: string
  dominio: string
  nivel: RadarCrimeSeverity | null
  principalCod: string
  principalDesc: string
  anos: Record<number, number>
  delitosJson: Record<string, number>
}>

export function lerPropsDeFeatureParaFiltro(
  props: Record<string, string | number | undefined | null>
): NormalizadoTerritorioFiltro {
  const nomeTer =
    typeof props.nome_territorio === "string"
      ? props.nome_territorio.trim()
      : ""
  const regiao =
    typeof props.regiao === "string" ? props.regiao.trim() : ""

  const dominioRaw =
    typeof props.dominio_orcrim === "string"
      ? props.dominio_orcrim.trim()
      : ""

  const nivelRaw =
    typeof props.nivel === "string" ? props.nivel.trim() : ""

  let nivel: RadarCrimeSeverity | null = null
  if (
    nivelRaw === "critico" ||
    nivelRaw === "elevado" ||
    nivelRaw === "moderado" ||
    nivelRaw === "acompanhar"
  )
    nivel = nivelRaw as RadarCrimeSeverity

  const principalCodRaw =
    typeof props.delito_principal_cod === "string"
      ? props.delito_principal_cod.trim()
      : ""
  const principalDescRaw =
    typeof props.delito_principal_desc === "string"
      ? props.delito_principal_desc.trim()
      : ""

  const tipoFallback =
    typeof props.tipo_crime === "string" ? props.tipo_crime.trim() : ""

  const principalCod = principalCodRaw || "__mock_sem_codigo"
  const principalDesc =
    principalDescRaw ||
    tipoFallback ||
    (principalCod === "__mock_sem_codigo" ? "" : principalCod)

  return {
    nome: nomeTer || regiao,
    dominio: dominioRaw,
    nivel,
    principalCod:
      principalCod === "__mock_sem_codigo" || principalCod === "__sem_codigo"
        ? ""
        : principalCod,
    principalDesc,
    anos: parseOcurrenciasPorAnoJson(props.ocorrencias_por_ano_json ?? ""),
    delitosJson: parseOcurrenciasPorDelitoJson(
      props.ocorrencias_por_delito_json ?? ""
    ),
  }
}

/** Acumula opções úteis para o painel a partir das features carregadas. */
export function buildRadarFilterCatalog<Props extends GeoJsonProperties>(
  fc: FeatureCollection<Polygon | MultiPolygon, Props>
): RadarFilterCatalog {
  let hasDominio = false
  const dominioSet = new Set<string>()
  let ymin = Infinity
  let ymax = -Infinity
  const delitos = new Map<string, string>()
  let hasAnoDistrib = false
  let hasDelitoExtraDistrib = false

  for (const f of fc.features) {
    const p = (
      typeof f.properties === "object" && f.properties !== null
        ? f.properties
        : {}
    ) as Record<string, string | number | undefined | null>
    const n = lerPropsDeFeatureParaFiltro(p)
    const dom = n.dominio.trim()
    if (dom.length > 0) {
      dominioSet.add(dom)
      hasDominio = true
    }

    const yks = Object.keys(n.anos)
    if (yks.length > 0) {
      hasAnoDistrib = true
      for (const y of Object.keys(n.anos)) {
        const yi = Number.parseInt(y, 10)
        if (Number.isFinite(yi)) {
          ymin = Math.min(ymin, yi)
          ymax = Math.max(ymax, yi)
        }
      }
    }

    const jks = Object.keys(n.delitosJson)
    if (jks.length > 0) hasDelitoExtraDistrib = true

    if (n.principalCod.length > 0) {
      delitos.set(n.principalCod, n.principalDesc || n.principalCod)
    } else if (n.principalDesc.trim().length > 0) {
      delitos.set(`__tipo:${n.principalDesc}`, n.principalDesc)
    }

    if (Object.keys(n.delitosJson).length > 0) {
      for (const c of Object.keys(n.delitosJson)) {
        if (!delitos.has(c)) delitos.set(c, `Código ${c}`)
      }
    }
  }

  const listaDelitos = [...delitos.entries()]
    .map(([cod, desc]) => ({ cod, desc }))
    .sort((a, b) => a.cod.localeCompare(b.cod, "pt"))

  const listaDominios = [...dominioSet.values()].sort((a, b) =>
    a.localeCompare(b, "pt")
  )

  let yearMin = Number.isFinite(ymin) ? ymin : new Date().getFullYear()
  let yearMax = Number.isFinite(ymax) ? ymax : new Date().getFullYear()
  if (yearMin > yearMax)[yearMin, yearMax] = [yearMax, yearMin]

  return {
    dominios: listaDominios,
    yearMin,
    yearMax,
    delitos: listaDelitos,
    hasDominioOrcrimColumn: hasDominio,
    hasDistribuicaoPorAno: hasAnoDistrib,
    hasDistribuicaoDelitoExtra: hasDelitoExtraDistrib,
  }
}

export function somaOcurrenciasPorAnos(
  anos: Record<number, number>,
  minY: number,
  maxY: number
): number {
  const lo = Math.min(minY, maxY)
  const hi = Math.max(minY, maxY)
  let s = 0
  for (const [yk, ct] of Object.entries(anos)) {
    const y = Number(yk)
    if (!Number.isFinite(y) || ct <= 0) continue
    if (y >= lo && y <= hi) s += ct
  }
  return s
}

export function aplicarRadarTerritoryFiltersToFeatureCollection<
  Props extends GeoJsonProperties,
>(
  fc: FeatureCollection<Polygon | MultiPolygon, Props>,
  filters: RadarTerritoryFiltersState
): {
  filtradas: FeatureCollection<Polygon | MultiPolygon, Props>
  total: number
  visible: number
} {
  const total = fc.features.length
  if (filters.niveis.length === 0) {
    return {
      filtradas: { type: "FeatureCollection", features: [] },
      total,
      visible: 0,
    }
  }

  const q = filters.textoTerritorio.trim().toLowerCase()
  const nivelSet = new Set(filters.niveis)
  const domF = filters.dominioOrcrim.trim()
  const delSel = filters.delitoSeleccionCod.trim()

  const out: Feature<Polygon | MultiPolygon, Props>[] = []

  for (const feat of fc.features) {
    const props = (
      typeof feat.properties === "object" && feat.properties !== null
        ? feat.properties
        : {}
    ) as Record<string, string | number | undefined | null>

    const n = lerPropsDeFeatureParaFiltro(props)

    if (q.length > 0 && !n.nome.toLowerCase().includes(q)) continue

    if (domF.length > 0 && n.dominio !== domF) continue

    if (n.nivel && !nivelSet.has(n.nivel)) continue
    if (!n.nivel && filters.niveis.length < RADAR_FILTROS_NIVEIS_TODOS.length)
      continue

    const anoKeysLen = Object.keys(n.anos).length
    if (anoKeysLen > 0) {
      const s = somaOcurrenciasPorAnos(n.anos, filters.anoMin, filters.anoMax)
      if (s <= 0) continue
    }

    if (delSel.length > 0) {
      const inDelitoJson =
        Object.prototype.hasOwnProperty.call(n.delitosJson, delSel) &&
        (n.delitosJson[delSel] ?? 0) > 0
      const mesmoPrincipalCod =
        n.principalCod.length > 0 && delSel === n.principalCod
      const mesmoTipoDemonstracao =
        delSel.startsWith("__tipo:") &&
        delSel.slice("__tipo:".length).trim() === n.principalDesc.trim()
      if (!inDelitoJson && !mesmoPrincipalCod && !mesmoTipoDemonstracao)
        continue
    }

    out.push(feat)
  }

  return {
    filtradas: { type: "FeatureCollection", features: out },
    total,
    visible: out.length,
  }
}
