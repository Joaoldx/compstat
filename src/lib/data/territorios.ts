import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  buildTerritoriosFeatureCollection,
  type TerritoriosBuildResult,
} from "@/lib/parse-territorio-csv"

export const TERRITORIOS_CSV_FILENAME = "dominio_territorial - Extração 1.csv"

/** Único ponto de leitura: hoje CSV em `public/`; mais tarde pode ser HTTP interno/remoto mantendo esta assinatura. */
export async function getTerritoriosGeoJson(): Promise<TerritoriosBuildResult> {
  const filePath = path.join(process.cwd(), "public", TERRITORIOS_CSV_FILENAME)
  const csvText = await readFile(filePath, "utf-8")
  return buildTerritoriosFeatureCollection(csvText)
}
