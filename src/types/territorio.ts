import type { TerritoriosFeatureCollection } from "@/lib/parse-territorio-csv"

export type TerritoriosParseStats = {
  parsedRows: number
  skippedInvalid: number
  skippedOutsideRio: number
}

export type TerritorioHoverInfo = {
  lng: number
  lat: number
  nome_territorio: string
  organizacao_criminosa: string
}

export type TerritoriosApiLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; data: TerritoriosFeatureCollection }
