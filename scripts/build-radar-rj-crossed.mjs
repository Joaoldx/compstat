#!/usr/bin/env node
/**
 * Gera `public/data/radar-rj-crossed.csv`: domínios territoriais (RJ filtrados) ×
 * agregados de `df_ocorrencias_tratado` por ponto‑em‑polígono + delito/ano.
 *
 * Schema CSV (cabeçalho = primeira linha, UTF‑8 com BOM opcional):
 * - territorio_id: índice estável dentro do RJ (0…N−1 no ficheiro gerado).
 * - nome_territorio, dominio_orcrim: OCRIM conforme CSV de entrada.
 * - geometria: WKT POLYGON ou MULTIPOLYGON, WGS‑84 lon/lat.
 * - total_ocorrencias: registos cuja longitude/latitude cai na geometria.
 * - indice_prioridade: 0–100 (índice visual).
 * - nivel: critico | elevado | moderado | acompanhar — quantis entre territórios com conta > 0.
 * - delito_principal_cod, delito_principal_desc, ocorrencias_delito_principal.
 * - ocorrencias_por_ano_json, ocorrencias_por_delito_json — JSON inline.
 * - ano_YYYY — colunas adicionadas para cada ano encontrado nos dados brutos (ex.: ano_2021).
 * - row_index_territorio_source — índice da linha no CSV de domínio (auditoria).
 *
 * Territórios fora da bbox RJ ampla são excluídos; ocorrências fora dessa bbox ignoradas.
 *
 * Caminho das fontes: `--sources=` ou env `RADAR_SOURCES_DIR`.
 * deps do projeto: papaparse, wellknown.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Papa from "papaparse"
import wkt from "wellknown"

/** Bbox amplo do RJ (~ WGS84) — exclui polígonos fora da região. */
const RJ_MIN_LON = -46.2
const RJ_MAX_LON = -39.65
const RJ_MIN_LAT = -24.1
const RJ_MAX_LAT = -20.25

/** Grelha para candidatos antes do ray‑casting (~3–4 km). */
const CELL_DEG = 0.035

/** Filtro preventivo antes do PIP. */
function isRJPoint(lng, lat) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= RJ_MIN_LON &&
    lng <= RJ_MAX_LON &&
    lat >= RJ_MIN_LAT &&
    lat <= RJ_MAX_LAT
  )
}

function bboxIntersectsRJ(minLon, minLat, maxLon, maxLat) {
  return !(
    maxLon < RJ_MIN_LON ||
    minLon > RJ_MAX_LON ||
    maxLat < RJ_MIN_LAT ||
    minLat > RJ_MAX_LAT
  )
}

function ringBBox(ring) {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of ring) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    minLon = Math.min(minLon, lng)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lng)
    maxLat = Math.max(maxLat, lat)
  }
  if (!Number.isFinite(minLon)) return null
  return { minLon, minLat, maxLon, maxLat }
}

function polygonBBox(coords) {
  const outer = coords[0]
  if (!outer?.length) return null
  return ringBBox(outer)
}

function geometryBBox(gj) {
  if (!gj) return null
  if (gj.type === "Polygon") return polygonBBox(gj.coordinates)
  if (gj.type === "MultiPolygon") {
    let acc = null
    for (const poly of gj.coordinates) {
      const b = polygonBBox(poly)
      if (!b) continue
      if (!acc) acc = { ...b }
      else {
        acc.minLon = Math.min(acc.minLon, b.minLon)
        acc.minLat = Math.min(acc.minLat, b.minLat)
        acc.maxLon = Math.max(acc.maxLon, b.maxLon)
        acc.maxLat = Math.max(acc.maxLat, b.maxLat)
      }
    }
    return acc
  }
  return null
}

function pointInRing(lng, lat, ring) {
  let inside = false
  const n = ring.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    if (xi === xj && yi === yj) continue
    const den = yj - yi
    const intersect =
      yi > lat !== yj > lat &&
      lng < (((xj - xi) * (lat - yi)) / (den !== 0 ? den : Number.EPSILON) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

/** Polígono GeoJSON exterior + buracos. */
function pointInPolygonLngLat(lng, lat, rings) {
  const outer = rings[0]
  if (!outer || !pointInRing(lng, lat, outer)) return false
  for (let r = 1; r < rings.length; r += 1) {
    const hole = rings[r]
    if (hole && pointInRing(lng, lat, hole)) return false
  }
  return true
}

function pointInGeoJSONGeometry(lng, lat, gj) {
  if (gj.type === "Polygon") {
    return pointInPolygonLngLat(lng, lat, gj.coordinates)
  }
  if (gj.type === "MultiPolygon") {
    return gj.coordinates.some((rings) =>
      rings.length ? pointInPolygonLngLat(lng, lat, rings) : false
    )
  }
  return false
}

function cellIx(lng) {
  return Math.floor(lng / CELL_DEG)
}
function cellIy(lat) {
  return Math.floor(lat / CELL_DEG)
}

function stampPolygonToCells(bbox, polyIndex, cellMap) {
  const ix0 = cellIx(bbox.minLon)
  const ix1 = cellIx(bbox.maxLon)
  const iy0 = cellIy(bbox.minLat)
  const iy1 = cellIy(bbox.maxLat)
  for (let ix = ix0; ix <= ix1; ix += 1) {
    for (let iy = iy0; iy <= iy1; iy += 1) {
      const k = `${ix},${iy}`
      let arr = cellMap.get(k)
      if (!arr) {
        arr = []
        cellMap.set(k, arr)
      }
      arr.push(polyIndex)
    }
  }
}

function nivelFromTotals(totalOcorrencias, sortedNonZero) {
  if (totalOcorrencias <= 0 || sortedNonZero.length === 0) return "acompanhar"
  const q = (p) =>
    sortedNonZero[Math.min(sortedNonZero.length - 1, Math.floor((sortedNonZero.length - 1) * p))]
  const t95 = q(0.95)
  const t80 = q(0.80)
  const t55 = q(0.55)
  if (totalOcorrencias >= t95) return "critico"
  if (totalOcorrencias >= t80) return "elevado"
  if (totalOcorrencias >= t55) return "moderado"
  return "acompanhar"
}

function indicePrioridade(sortedNonZero, total) {
  if (sortedNonZero.length === 0 || total <= 0) return 0
  const maxV = sortedNonZero[sortedNonZero.length - 1]
  if (maxV <= 0) return 0
  const rankFrac = sortedNonZero.filter((x) => x <= total).length / sortedNonZero.length
  return Math.min(
    100,
    Math.max(12, Math.round(12 + rankFrac * 88 + (total / maxV) * 8))
  )
}

function parseArgs(argv) {
  let sources = process.env.RADAR_SOURCES_DIR?.trim()
  let outCsv = ""
  const rest = [...argv.slice(2)]
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i]
    if (!a.startsWith("--")) continue
    const eq = a.indexOf("=")
    if (eq > 0) {
      const key = a.slice(0, eq)
      const val = a.slice(eq + 1).trim()
      if (key === "--sources") sources = val || sources
      if (key === "--out") outCsv = val
    }
  }
  if (!sources && rest[0] && !rest[0].startsWith("--")) sources = rest[0]
  if (!sources) return { error: "Defina RADAR_SOURCES_DIR ou --sources=/caminho/dados." }
  if (!outCsv) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const root = path.join(__dirname, "..")
    outCsv = path.join(root, "public", "data", "radar-rj-crossed.csv")
  }
  return {
    sources: path.resolve(sources.replace(/^~/, process.env.HOME || "")),
    outCsv,
  }
}

async function parseTerritorialRows(csvPath) {
  const txt = fs.readFileSync(csvPath, "utf8")
  const { data, meta } = Papa.parse(txt.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  if (meta?.aborted || !Array.isArray(data)) throw new Error("Falha ao ler territorial.")
  /** @type {Array<{ territorio_id: number, nome: string, dominio: string, wktRaw: string, gj: unknown, bbox: unknown }>} */
  const kept = []
  let skippedWJ = 0
  let skippedRJ = 0
  let rowIx = -1

  for (const row of data) {
    rowIx += 1
    const nome = row.nome_territorio?.trim() ?? ""
    const dominio = row.dominio_orcrim?.trim() ?? ""
    const geometriaRaw = row.geometria?.trim() ?? ""

    /** @type {any} */
    const gj =
      geometriaRaw && geometriaRaw.length > 16 ? wkt.parse(geometriaRaw) : null
    if (
      !gj ||
      (gj.type !== "Polygon" && gj.type !== "MultiPolygon") ||
      !gj.coordinates?.length
    ) {
      skippedWJ += 1
      continue
    }
    const bbox = geometryBBox(gj)
    if (!bbox || !bboxIntersectsRJ(bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat)) {
      skippedRJ += 1
      continue
    }
    kept.push({
      territorio_id: kept.length,
      nome,
      dominio,
      row_index_source: rowIx,
      wktRaw: geometriaRaw,
      gj,
      bbox,
    })
  }

  return { polygons: kept, skippedWJ, skippedRJ }
}

function candidatePolygons(cellMap, lng, lat) {
  const ix = cellIx(lng)
  const iy = cellIy(lat)
  const k = `${ix},${iy}`
  return cellMap.get(k) ?? []
}

async function aggregateOccurrences(occCsvPath, cellMap, polygons) {
  const statsPerPoly = polygons.map(() => ({
    total: 0,
    byYear: new Map(),
    byDelito: new Map(),
    /** @type Map<string,string> cod -> desc exemplo */
    delitoDescByCod: new Map(),
  }))
  /** @type Set<string> global years */
  const yearsSet = new Set()

  const stream = fs.createReadStream(occCsvPath, { encoding: "utf8" })
  let rowSeen = 0
  let rowBadCoord = 0
  let rowNoTerritory = 0

  await new Promise((resolve, reject) => {
    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      step: ({ data: raw }) => {
        rowSeen += 1
        /** @type {Record<string,string>} */
        const r = typeof raw === "object" && raw ? raw : {}
        const lng = Number(String(r.longitude ?? "").replace(",", "."))
        const lat = Number(String(r.latitude ?? "").replace(",", "."))
        const anoRaw = String(r.ano ?? "").trim()
        const ano = anoRaw.match(/^\d{4}$/) ? anoRaw : ""
        const codDelito = String(r.delito ?? "").trim()
        const descDelito = String(r.desc_delito ?? "").trim()

        if (!isRJPoint(lng, lat)) {
          rowBadCoord += 1
          return
        }

        const candidates = candidatePolygons(cellMap, lng, lat)
        if (!candidates.length) {
          rowNoTerritory += 1
          return
        }

        let matchedAny = false
        for (const pi of candidates) {
          /** @type {any} */
          const gj = polygons[pi]?.gj
          if (!gj) continue
          if (!pointInGeoJSONGeometry(lng, lat, gj)) continue
          matchedAny = true
          const st = statsPerPoly[pi]
          st.total += 1

          if (ano) {
            yearsSet.add(ano)
            st.byYear.set(ano, (st.byYear.get(ano) ?? 0) + 1)
          }

          const delKey = codDelito.length ? codDelito : "__sem_codigo"
          if (codDelito && descDelito && !st.delitoDescByCod.has(delKey))
            st.delitoDescByCod.set(delKey, descDelito)
          st.byDelito.set(delKey, (st.byDelito.get(delKey) ?? 0) + 1)
        }
        if (!matchedAny) rowNoTerritory += 1
      },
      error: (err) => reject(err),
      complete: () => resolve(),
    })
  })

  /** @type {string[]} years sorted */
  const years = [...yearsSet].sort()

  console.error(
    JSON.stringify({
      occurrences_rows: rowSeen,
      rows_bad_or_out_coords: rowBadCoord,
      rows_without_matching_polygon_estimate: rowNoTerritory,
    })
  )

  return { statsPerPoly, years }
}

async function main() {
  const args = parseArgs(process.argv)
  if ("error" in args) {
    console.error(args.error)
    process.exit(1)
    return
  }

  const territorialPath = path.join(
    args.sources,
    "outros dados",
    "dominio_territorial - Extração 1.csv"
  )
  const occurrencesPath = path.join(
    args.sources,
    "df_ocorrencias_tratado - Extração 1 .csv"
  )

  if (!fs.existsSync(territorialPath)) {
    console.error(`Não achei: ${territorialPath}`)
    process.exit(1)
  }
  if (!fs.existsSync(occurrencesPath)) {
    console.error(`Não achei: ${occurrencesPath}`)
    process.exit(1)
  }

  const { polygons, skippedRJ, skippedWJ } = await parseTerritorialRows(territorialPath)

  const cellMap = new Map()
  polygons.forEach((p, ix) => {
    stampPolygonToCells(p.bbox, ix, cellMap)
  })

  const { statsPerPoly, years } = await aggregateOccurrences(
    occurrencesPath,
    cellMap,
    polygons
  )

  const nonzeroTotals = polygons
    .map((_, ix) => statsPerPoly[ix].total)
    .filter((t) => t > 0)
    .sort((a, b) => a - b)

  console.error(
    JSON.stringify({
      polygons_kept_after_rj_bbox: polygons.length,
      polygons_skipped_wkt: skippedWJ,
      polygons_skipped_outside_rj: skippedRJ,
      years_in_data: years,
    })
  )

  const csvRows = polygons.map((p, ix) => {
    const st = statsPerPoly[ix]
    const total = st.total

    let topCod = "__sem_codigo"
    let topN = -1
    for (const [cod, n] of st.byDelito) {
      if (n > topN) {
        topN = n
        topCod = cod
      }
    }
    const topDesc =
      topCod === "__sem_codigo"
        ? "Sem classificação de delito no registro"
        : st.delitoDescByCod.get(topCod) || `Delito código ${topCod}`

    const nivel = nivelFromTotals(total, nonzeroTotals)

    /** @type {Record<string, number>} */
    const porAno = {}
    for (const [y, c] of st.byYear) porAno[y] = c
    /** @type {Record<string, number>} */
    const porDelito = {}
    for (const [d, c] of st.byDelito) porDelito[d] = c

    const anoCols = {}
    for (const y of years) {
      anoCols[`ano_${y}`] = st.byYear.get(y) ?? 0
    }

    const indice = indicePrioridade(nonzeroTotals, total)

    return {
      territorio_id: String(p.territorio_id),
      nome_territorio: p.nome,
      dominio_orcrim: p.dominio,
      geometria: p.wktRaw,
      total_ocorrencias: total,
      indice_prioridade: indice,
      nivel,
      delito_principal_cod: topCod,
      delito_principal_desc: topDesc,
      ocorrencias_delito_principal:
        total > 0 && topN >= 0 ? Math.max(topN, 0) : 0,
      ocorrencias_por_ano_json: JSON.stringify(porAno),
      ocorrencias_por_delito_json: JSON.stringify(porDelito),
      ...anoCols,
      row_index_territorio_source: String(p.row_index_source),
    }
  })

  fs.mkdirSync(path.dirname(args.outCsv), { recursive: true })
  /** @types — Papa espera objeto array */
  const out = Papa.unparse(csvRows)
  fs.writeFileSync(args.outCsv, "\uFEFF" + out, "utf8")
  console.log(`Escrito ${args.outCsv} (${csvRows.length} linhas territoriais)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
