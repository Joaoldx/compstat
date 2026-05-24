import { MAP_BASE_STYLE_URL } from "@/config/mapa"
import { MAP_STYLE_NETWORK_FALLBACK_URL } from "@/config/maplibre-style-fallback"

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

/**
 * Carto Dark Matter — primeira opção para o tema escuro do Radar (qualidade habitual).
 */
export const RADAR_MAP_DARK_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/darkmatter-gl-style/style.json" as const

/**
 * OpenFreeMap Liberty — alto contraste e boa legibilidade mesmo com UI em tema escuro;
 * primeira opção quando o Radar está em modo escuro (evita “mar de preto”).
 */
export const RADAR_OPENFREEMAP_LIBERTY_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty" as const

/** OpenFreeMap bright — segunda origem diferente dos domínios Carto. */
export const RADAR_OPENFREEMAP_BRIGHT_STYLE_URL =
  "https://tiles.openfreemap.org/styles/bright" as const

/**
 * Basemap bem escuro (OpenFreeMap) — mantido só se precisar de referência pontual ou futuras cascatas.
 *
 * Preferir cascata Radar em modo escuro: Liberty → Bright → Carto fallback.
 */
export const RADAR_OPENFREEMAP_DARK_STYLE_URL =
  "https://tiles.openfreemap.org/styles/dark" as const

/** Cascata clara: Positron → demótiles MapLibre. */
export const RADAR_MAP_LIGHT_STYLE_CASCADE = [
  RADAR_MAP_LIGHT_STYLE_URL,
  MAP_STYLE_NETWORK_FALLBACK_URL,
] as const

/**
 * Cascata “modo escuro” da UI: primeiro basemap vetorial mais legível; depois estética escura (Carto);
 * depois segunda origem OpenFreeMap; por fim demótiles MapLibre.
 */
export const RADAR_MAP_DARK_STYLE_CASCADE = [
  RADAR_OPENFREEMAP_LIBERTY_STYLE_URL,
  RADAR_MAP_DARK_STYLE_URL,
  RADAR_OPENFREEMAP_BRIGHT_STYLE_URL,
  MAP_STYLE_NETWORK_FALLBACK_URL,
] as const

/** @deprecated Preferir `RADAR_MAP_DARK_STYLE_URL` ou estilo conforme tema. */
export const RADAR_MAP_BASE_STYLE_URL = RADAR_MAP_DARK_STYLE_URL

/** Camadas GeoJSON mock no mapa Radar. */
export const RADAR_MACRO_SOURCE_ID = "radar-macro-regiao"
export const RADAR_MACRO_FILL_LAYER_ID = `${RADAR_MACRO_SOURCE_ID}-fill`
export const RADAR_MACRO_LINE_LAYER_ID = `${RADAR_MACRO_SOURCE_ID}-line`
