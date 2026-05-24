import type { GeoJsonProperties } from "geojson"

import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"

export type RadarMapDataModePdf = "territorio" | "demo"

export type RadarTerritoryPdfDigest = Readonly<{
  dataMode: RadarMapDataModePdf
  featuresTotal: number
  featuresVisible: number
  sumOcorrenciasVisiveis: number
  byNivel: Readonly<Record<RadarCrimeSeverity, number>>
  territorioLabels: readonly string[]
  /** Nomes únicos que não entraram na lista por limite de linhas no PDF. */
  territoriosOmitted: number
}>

const NIVEIS_EMPTY: Record<RadarCrimeSeverity, number> = {
  critico: 0,
  elevado: 0,
  moderado: 0,
  acompanhar: 0,
}

const MAX_NAMES_UNIQUE = 45

function readOcorrencias(props: Record<string, string | number | undefined>): number {
  if (typeof props.total_ocorrencias === "number" && Number.isFinite(props.total_ocorrencias)) {
    return props.total_ocorrencias
  }
  if (typeof props.ocorrencias === "number" && Number.isFinite(props.ocorrencias)) {
    return props.ocorrencias
  }
  if (typeof props.ocorrencias_mock === "number" && Number.isFinite(props.ocorrencias_mock)) {
    return props.ocorrencias_mock
  }
  return 0
}

function territorioNome(
  props: Record<string, string | number | undefined>,
): string {
  const nome =
    typeof props.nome_territorio === "string" ? props.nome_territorio.trim() : ""
  if (nome.length > 0) return nome
  const regiao = typeof props.regiao === "string" ? props.regiao.trim() : ""
  return regiao.length > 0 ? regiao : "Território sem nome"
}

/**
 * Resumo determinístico dos polígonos visíveis (após filtros) para relatório PDF.
 */
export function buildRadarTerritoryPdfDigest(params: {
  dataMode: RadarMapDataModePdf
  featuresTotal: number
  featuresVisible: number
  features: ReadonlyArray<{ properties?: GeoJsonProperties | null }>
}): RadarTerritoryPdfDigest {
  const byNivel: Record<RadarCrimeSeverity, number> = { ...NIVEIS_EMPTY }
  let sumOc = 0
  const nomePorFeature: string[] = []

  for (const f of params.features) {
    const props =
      typeof f.properties === "object" && f.properties !== null
        ? (f.properties as Record<string, string | number | undefined>)
        : {}

    sumOc += readOcorrencias(props)

    const nivelRaw =
      typeof props.nivel === "string" ? props.nivel.trim() : ""
    if (
      nivelRaw === "critico" ||
      nivelRaw === "elevado" ||
      nivelRaw === "moderado" ||
      nivelRaw === "acompanhar"
    ) {
      byNivel[nivelRaw as RadarCrimeSeverity] += 1
    }

    nomePorFeature.push(territorioNome(props))
  }

  const uniqSorted = [...new Set(nomePorFeature)].sort((a, b) =>
    a.localeCompare(b, "pt"),
  )
  const territorioLabels = uniqSorted.slice(0, MAX_NAMES_UNIQUE)
  const territoriosOmitted = Math.max(0, uniqSorted.length - territorioLabels.length)

  return {
    dataMode: params.dataMode,
    featuresTotal: params.featuresTotal,
    featuresVisible: params.featuresVisible,
    sumOcorrenciasVisiveis: sumOc,
    byNivel,
    territorioLabels,
    territoriosOmitted,
  }
}
