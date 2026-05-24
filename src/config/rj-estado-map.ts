import { MAP_BASE_STYLE_URL } from "@/config/mapa"

/**
 * Enquadramento do Estado do Rio de Janeiro (longitude/latitude, graus WGS84).
 * Valores conservadores para vista regional; pode ser refinado para encaixe exacto.
 */
export const RJ_ESTADO_FIT_BOUNDS: [[number, number], [number, number]] = [
  [-44.95, -23.45],
  [-40.92, -20.73],
]

/**
 * Limita um pouco o pane para manter foco regional (margem maior que o bbox de encaixe).
 */
export const RJ_ESTADO_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-46.1, -24.05],
  [-39.75, -20.35],
]

/** Fallback antes do fitBounds. */
export const RJ_ESTADO_INITIAL_VIEW = {
  longitude: -42.93,
  latitude: -22.09,
  zoom: 6.85,
  pitch: 0,
  bearing: 0,
} as const

export const RJ_ESTADO_FIT_PADDING = {
  top: 24,
  bottom: 24,
  left: 24,
  right: 24,
} as const

/** Máximo de zoom inicial após focar no estado — evita aproximar demais. */
export const RJ_ESTADO_FIT_MAX_ZOOM = 8.6

/** Estilo Carto Positron (mesmo `/mapa`, tema claro). */
export const RADAR_MAP_LIGHT_STYLE_URL = MAP_BASE_STYLE_URL

/** Carto Dark Matter — alinhado ao tema escuro da app. */
export const RADAR_MAP_DARK_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/darkmatter-gl-style/style.json" as const

/** @deprecated Preferir `RADAR_MAP_DARK_STYLE_URL` ou estilo conforme tema. */
export const RADAR_MAP_BASE_STYLE_URL = RADAR_MAP_DARK_STYLE_URL

/** Camadas GeoJSON mock no mapa Radar. */
export const RADAR_MACRO_SOURCE_ID = "radar-macro-regiao"
export const RADAR_MACRO_FILL_LAYER_ID = `${RADAR_MACRO_SOURCE_ID}-fill`
export const RADAR_MACRO_LINE_LAYER_ID = `${RADAR_MACRO_SOURCE_ID}-line`
