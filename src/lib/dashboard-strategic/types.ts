import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"

export type StrategicDashboardFilters = Readonly<{
  /** Vazio = todas as áreas; caso contrário, apenas estes `territorio_id`. */
  territorioIdsSeleccionados: readonly string[]
  /** Vazio = todos os domínios OCRIM (“fonte”). */
  dominioOrcrim: string
  /** Vazio = todos os subtipos (delito principal ou JSON por código). */
  subtipoSeleccionCod: string
  anoMin: number
  anoMax: number
}>

export function defaultStrategicDashboardFilters(
  yearMin: number,
  yearMax: number
): StrategicDashboardFilters {
  return {
    territorioIdsSeleccionados: [],
    dominioOrcrim: "",
    subtipoSeleccionCod: "",
    anoMin: yearMin,
    anoMax: yearMax,
  }
}

export type DonutSlice = Readonly<{
  name: string
  value: number
  percent: number
}>

export type MesCasosPonto = Readonly<{
  /** Chave de ordenação YYYY-MM */
  chave: string
  /** Rótulo curto p.ex. "jan/24" */
  rotulo: string
  casos: number
}>

export type RegiaoBarPonto = Readonly<{
  nome: string
  casos: number
}>

export type MesPrioridadePonto = Readonly<{
  chave: string
  rotulo: string
} & Partial<Record<RadarCrimeSeverity, number>>>

export const RADAR_PRIORITY_LABEL_PT: Record<RadarCrimeSeverity, string> = {
  critico: "Crítico",
  elevado: "Elevado",
  moderado: "Moderado",
  acompanhar: "Acompanhar",
}
