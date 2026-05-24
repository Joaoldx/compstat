/** Estilo de demonstração do projeto MapLibre (demótiles). */
export const MAPLIBRE_DEMOTILES_STYLE_URL =
  "https://demotiles.maplibre.org/style.json" as const

/**
 * Reserva de rede para ambientes que bloqueiam `basemaps.cartocdn.com` (firewall
 * corporativo, DNS, etc.): hospedagem em domínios distintos do Carto.
 */
export const MAP_STYLE_NETWORK_FALLBACK_URL = MAPLIBRE_DEMOTILES_STYLE_URL
