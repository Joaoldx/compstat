/** Bounding box aproximada do município do Rio (lon/lat graus decimais). Ajustável. */
export const RIO_MUNICIPAL_BBOX = {
  minLon: -43.85,
  minLat: -23.08,
  maxLon: -43.05,
  maxLat: -22.73,
} as const

export function pointInRioBBox(lon: number, lat: number): boolean {
  const { minLon, minLat, maxLon, maxLat } = RIO_MUNICIPAL_BBOX
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat
}

/** Centróide simples do anel exterior (média dos vértices). */
export function polygonRingCentroid(coords: number[][]): { lon: number; lat: number } {
  let sumLon = 0
  let sumLat = 0
  const n = coords.length
  for (const [lon, lat] of coords) {
    sumLon += lon
    sumLat += lat
  }
  return { lon: sumLon / n, lat: sumLat / n }
}

/** Mantém polígonos cuja média ou qualquer vértice do primeiro anel intersecta conceptualmente o bbox do Rio. */
export function polygonTouchesRioMunicipality(geometry: {
  type: "Polygon"
  coordinates: number[][][]
}): boolean {
  const ring = geometry.coordinates[0]
  if (!ring?.length) {
    return false
  }

  const { lon, lat } = polygonRingCentroid(ring)
  if (pointInRioBBox(lon, lat)) {
    return true
  }

  return ring.some(([lng, ltd]) => pointInRioBBox(lng, ltd))
}
