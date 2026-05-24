import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson"

import type { RadarCrossedPolygonProperties } from "@/lib/radar/load-radar-rj-crossed"
import type {
  DonutSlice,
  MesCasosPonto,
  MesPrioridadePonto,
  RegiaoBarPonto,
  StrategicDashboardFilters,
} from "@/lib/dashboard-strategic/types"
import {
  lerPropsDeFeatureParaFiltro,
  somaOcurrenciasPorAnos,
} from "@/lib/radar/radar-territory-filter"
import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"

const MESES_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const

function matchSubtipoSeleccion(
  norm: ReturnType<typeof lerPropsDeFeatureParaFiltro>,
  delSel: string
): boolean {
  const inDelitoJson =
    Object.prototype.hasOwnProperty.call(norm.delitosJson, delSel) &&
    (norm.delitosJson[delSel] ?? 0) > 0
  const mesmoPrincipalCod =
    norm.principalCod.length > 0 && delSel === norm.principalCod
  const mesmoTipoDemonstracao =
    delSel.startsWith("__tipo:") &&
    delSel.slice("__tipo:".length).trim() === norm.principalDesc.trim()
  return inDelitoJson || mesmoPrincipalCod || mesmoTipoDemonstracao
}

export function filterFeaturesForStrategicDashboard(
  fc: FeatureCollection<Polygon | MultiPolygon, RadarCrossedPolygonProperties>,
  filters: StrategicDashboardFilters
): Feature<
  Polygon | MultiPolygon,
  RadarCrossedPolygonProperties
>[] {
  const idSet =
    filters.territorioIdsSeleccionados.length > 0
      ? new Set(filters.territorioIdsSeleccionados)
      : null

  const domF = filters.dominioOrcrim.trim()
  const delSel = filters.subtipoSeleccionCod.trim()

  const list: Feature<Polygon | MultiPolygon, RadarCrossedPolygonProperties>[] = []

  for (const feat of fc.features) {
    const props = feat.properties

    const norm = lerPropsDeFeatureParaFiltro(props as Record<string, string | number | undefined | null>)

    if (idSet !== null && !idSet.has(props.territorio_id)) continue
    if (domF.length > 0 && norm.dominio !== domF) continue

    if (delSel.length > 0 && !matchSubtipoSeleccion(norm, delSel)) continue

    const anoKeysLen = Object.keys(norm.anos).length
    if (anoKeysLen > 0) {
      const s = somaOcurrenciasPorAnos(norm.anos, filters.anoMin, filters.anoMax)
      if (s <= 0) continue
    } else continue

    list.push(feat)
  }

  return list
}

function prorrataAnualPorMesCasos(count: number, year: number, minY: number, maxY: number): MesCasosPonto[] {
  if (count <= 0) return []
  const lo = Math.min(minY, maxY)
  const hi = Math.max(minY, maxY)
  if (year < lo || year > hi) return []
  const perMonth = count / 12
  const out: MesCasosPonto[] = []
  for (let m = 0; m < 12; m++) {
    const mm = m + 1
    const chave = `${year}-${String(mm).padStart(2, "0")}`
    const rotulo = `${MESES_PT[m]}/${String(year).slice(-2)}`
    out.push({ chave, rotulo, casos: perMonth })
  }
  return out
}

function mergeMesCasosPontos(pontos: MesCasosPonto[]): MesCasosPonto[] {
  const map = new Map<string, { rotulo: string; casos: number }>()
  for (const p of pontos) {
    const cur = map.get(p.chave)
    if (cur) cur.casos += p.casos
    else map.set(p.chave, { rotulo: p.rotulo, casos: p.casos })
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt"))
    .map(([chave, v]) => ({ chave, rotulo: v.rotulo, casos: v.casos }))
}

export function aggregateDonutByDominio(
  feats: Feature<Polygon | MultiPolygon, RadarCrossedPolygonProperties>[],
  filters: StrategicDashboardFilters,
  otrosTop?: number
): DonutSlice[] {
  const acc = new Map<string, number>()
  for (const f of feats) {
    const norm = lerPropsDeFeatureParaFiltro(
      f.properties as Record<string, string | number | undefined | null>
    )
    const domRaw = norm.dominio.trim()
    const key = domRaw.length > 0 ? domRaw : "Sem OCRIM definido"
    const s = somaOcurrenciasPorAnos(norm.anos, filters.anoMin, filters.anoMax)
    if (s <= 0) continue
    acc.set(key, (acc.get(key) ?? 0) + s)
  }

  let entries = [...acc.entries()].sort((a, b) => b[1] - a[1])
  const topN = otrosTop ?? 6
  if (entries.length > topN) {
    const main = entries.slice(0, topN - 1)
    const rest = entries.slice(topN - 1)
    const outros = rest.reduce((s, [, v]) => s + v, 0)
    entries = [...main]
    if (outros > 0) entries.push(["Outros", outros])
  }

  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total <= 0) return []

  return entries.map(([name, value]) => ({
    name,
    value,
    percent: (value / total) * 100,
  }))
}

export function aggregateMesCasosDistribuidosPorAnual(
  feats: Feature<Polygon | MultiPolygon, RadarCrossedPolygonProperties>[],
  filters: StrategicDashboardFilters
): MesCasosPonto[] {
  const pontos: MesCasosPonto[] = []
  for (const f of feats) {
    const norm = lerPropsDeFeatureParaFiltro(
      f.properties as Record<string, string | number | undefined | null>
    )
    const lo = Math.min(filters.anoMin, filters.anoMax)
    const hi = Math.max(filters.anoMin, filters.anoMax)
    for (const [yk, ct] of Object.entries(norm.anos)) {
      const year = Number.parseInt(yk, 10)
      if (!Number.isFinite(year) || ct <= 0) continue
      pontos.push(...prorrataAnualPorMesCasos(ct, year, lo, hi))
    }
  }
  return mergeMesCasosPontos(pontos)
}


export function aggregateMesPrioridade(
  feats: Feature<Polygon | MultiPolygon, RadarCrossedPolygonProperties>[],
  filters: StrategicDashboardFilters
): MesPrioridadePonto[] {
  const nivelOrder: RadarCrimeSeverity[] = ["critico", "elevado", "moderado", "acompanhar"]
  const map = new Map<string, Partial<Record<RadarCrimeSeverity, number>>>()

  function add(chave: string, nivel: RadarCrimeSeverity, v: number) {
    if (v <= 0) return
    let row = map.get(chave)
    if (!row) {
      row = {}
      map.set(chave, row)
    }
    row[nivel] = (row[nivel] ?? 0) + v
  }

  for (const f of feats) {
    const props = f.properties
    const norm = lerPropsDeFeatureParaFiltro(
      props as Record<string, string | number | undefined | null>
    )
    const nivelRaw =
      typeof props.nivel === "string" ? props.nivel.trim() : ""
    let nivel: RadarCrimeSeverity | null = null
    if (
      nivelRaw === "critico" ||
      nivelRaw === "elevado" ||
      nivelRaw === "moderado" ||
      nivelRaw === "acompanhar"
    ) {
      nivel = nivelRaw
    }
    if (!nivel) continue

    const lo = Math.min(filters.anoMin, filters.anoMax)
    const hi = Math.max(filters.anoMin, filters.anoMax)
    for (const [yk, ct] of Object.entries(norm.anos)) {
      const year = Number.parseInt(yk, 10)
      if (!Number.isFinite(year) || ct <= 0) continue
      if (year < lo || year > hi) continue
      const perMonth = ct / 12
      for (let m = 0; m < 12; m++) {
        const mm = m + 1
        const chave = `${year}-${String(mm).padStart(2, "0")}`
        add(chave, nivel, perMonth)
      }
    }
  }

  const sortedKeys = [...map.keys()].sort((a, b) => a.localeCompare(b, "pt"))
  const out: MesPrioridadePonto[] = []
  for (const k of sortedKeys) {
    const partial = map.get(k) ?? {}
    const [yStr, moStr] = k.split("-")
    const yi = Number.parseInt(yStr ?? "0", 10)
    const moi = Number.parseInt(moStr ?? "1", 10) - 1
    const rotulo =
      yi >= 1900 &&
      moi >= 0 &&
      moi < 12 &&
      Number.isFinite(moi)
        ? `${MESES_PT[moi as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11]}/${String(yi).slice(-2)}`
        : k
    const row: MesPrioridadePonto = {
      chave: k,
      rotulo,
    }
    for (const nivel of nivelOrder) {
      const val = partial[nivel]
      if (val !== undefined && val > 0) {
        Reflect.set(row, nivel, val)
      }
    }
    out.push(row)
  }

  return out
}

export function aggregateRegioesMaisAtingidas(
  feats: Feature<Polygon | MultiPolygon, RadarCrossedPolygonProperties>[],
  filters: StrategicDashboardFilters,
  topN: number
): RegiaoBarPonto[] {
  const acc = new Map<string, number>()
  for (const f of feats) {
    const nome = (f.properties.nome_territorio ?? "").trim() || "(sem nome)"
    const norm = lerPropsDeFeatureParaFiltro(
      f.properties as Record<string, string | number | undefined | null>
    )
    const s = somaOcurrenciasPorAnos(norm.anos, filters.anoMin, filters.anoMax)
    if (s <= 0) continue
    acc.set(nome, (acc.get(nome) ?? 0) + s)
  }
  return [...acc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([nome, casos]) => ({ nome, casos }))
}
