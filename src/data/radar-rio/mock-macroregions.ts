import type {
  Feature,
  FeatureCollection,
  Polygon,
} from "geojson"

import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"

/**
 * Polígonos fictícios em grelha sobre o Estado do RJ (/radar), com rótulos de
 * crimes simulados — não são contagens reais nem limites oficiais (IBGE/OCRIM).
 */

export type { RadarCrimeSeverity }

export type RadarMacroRegiaoScenario = RadarCrimeSeverity

export type RadarCrimeCellProps = Readonly<{
  /** Rótulo da área ou corredor dentro do mock. */
  regiao: string
  /** Tipologia criminal predominante (demonstração). */
  tipo_crime: string
  /** Índice 0–100 (mock) para calor / prioridade. */
  indice_prioridade: number
  nivel: RadarCrimeSeverity
  /** Quantidade simulada ligada ao índice — não é dado oficial. */
  ocorrencias_mock: number
}>

/** Bordas [min..max], 3 × 3 células. */
const LON_EDGES = [-44.88, -43.52, -42.24, -40.94] as const
const LAT_EDGES = [-23.42, -22.62, -21.76, -20.74] as const

/**
 * Uma matriz 3×3: por célula, região de referência fictícia + tipo de crime predominante (mock).
 */
const CELULAS_CRIME: readonly (readonly {
  regiao: string
  tipo_crime: string
}[])[] = [
  [
    {
      regiao: "Oeste serrano · corredor Alto Paraíba",
      tipo_crime: "Furtos e invasões a imóveis rurais/isolados",
    },
    {
      regiao: "Centro-sul integrado · eixo Volta Redonda",
      tipo_crime: "Roubos a estabelecimentos e caixas eletrônicos",
    },
    {
      regiao: "Baixada Lagoa · corredor Lagos",
      tipo_crime: "Furto e roubo de veículos e peças",
    },
  ],
  [
    {
      regiao: "Costa Verde · trecho Angra–Paraty",
      tipo_crime: "Tráfico ilícito e porte ilegal (simulado)",
    },
    {
      regiao: "Metrópole Norte–Sul · Grande Rio",
      tipo_crime: "Roubos e furtos a transeúntes e aplicativos",
    },
    {
      regiao: "Litorâneas sul · campo e BR-101",
      tipo_crime: "Roubos de carga e extravio em rodovias",
    },
  ],
  [
    {
      regiao: "Vale do Paraíba Norte · eixo industrial",
      tipo_crime: "Receptação e desmanche (simulado)",
    },
    {
      regiao: "Norte Centro Fluminense · aglomerações",
      tipo_crime: "Violência doméstica e lesão corporal (simulado)",
    },
    {
      regiao: "Nordeste do estado · limite entre municípios",
      tipo_crime: "Disputas e lesões ligadas ao tráfico (simulado)",
    },
  ],
]

function nivelFromPrioridade(prioridade: number): RadarCrimeSeverity {
  if (prioridade >= 82) return "critico"
  if (prioridade >= 62) return "elevado"
  if (prioridade >= 44) return "moderado"
  return "acompanhar"
}

function ringParaCelula(ci: number, ri: number): number[][][] {
  const lon0 = LON_EDGES[ci]
  const lon1 = LON_EDGES[ci + 1]
  const lat0 = LAT_EDGES[ri]
  const lat1 = LAT_EDGES[ri + 1]
  const ring = [
    [lon0, lat0],
    [lon1, lat0],
    [lon1, lat1],
    [lon0, lat1],
    [lon0, lat0],
  ]
  return [ring]
}

function buildFeatures() {
  const out: Feature<Polygon, RadarCrimeCellProps>[] = []

  for (let ri = 0; ri < 3; ri += 1) {
    for (let ci = 0; ci < 3; ci += 1) {
      const cell = CELULAS_CRIME[ri]![ci]!

      const indice_prioridade = Math.min(
        99,
        Math.max(
          22,
          40 +
            ci * 10 +
            ri * 9 +
            ((ci + ri) % 6) * 7 -
            (((ci ^ ri) & 1) as number) * 5
        )
      )
      const nivel = nivelFromPrioridade(indice_prioridade)
      const ocorrencias_mock = Math.round(
        indice_prioridade * 5.2 + ci * 12 + ri * 8
      )

      out.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: ringParaCelula(ci, ri),
        },
        properties: {
          regiao: cell.regiao,
          tipo_crime: cell.tipo_crime,
          indice_prioridade,
          nivel,
          ocorrencias_mock,
        },
      })
    }
  }

  return out
}

/** Áreas-polígonos simuladas (crimes fictícios) sobre o RJ. */
export const RADAR_RJ_MACROREGIOES_GEOJSON: FeatureCollection<
  Polygon,
  RadarCrimeCellProps
> = {
  type: "FeatureCollection",
  features: buildFeatures(),
}
