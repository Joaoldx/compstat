import type { TerritoriosFeatureCollection } from "@/lib/parse-territorio-csv"

export type LngLatBoundsCorner = [number, number]

/**
 * Retorna cantos SW e NE que envolvem todos os anéis de todos os polígonos.
 * Útil para `map.fitBounds` no MapLibre.
 */
export function boundsFromTerritoriosCollection(
  collection: TerritoriosFeatureCollection
): [LngLatBoundsCorner, LngLatBoundsCorner] | null {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const feat of collection.features) {
    for (const ring of feat.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        west = Math.min(west, lng)
        south = Math.min(south, lat)
        east = Math.max(east, lng)
        north = Math.max(north, lat)
      }
    }
  }

  if (!Number.isFinite(west)) return null

  return [
    [west, south],
    [east, north],
  ]
}
