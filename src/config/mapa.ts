/** Estilo vetorial neutro (claro); troca futura pode depender do tema da app. */
export const MAP_BASE_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

export const TERRITORIOS_SOURCE_ID = "territorios"

export const TERRITORIOS_LAYER_IDS = {
  fill: `${TERRITORIOS_SOURCE_ID}-fill`,
  line: `${TERRITORIOS_SOURCE_ID}-line`,
} as const

/** Vista inicial até `fitBounds` carregar dados. */
export const RIO_INITIAL_VIEW = {
  longitude: -43.225,
  latitude: -22.9,
  zoom: 10,
} as const

export const TERRITORIOS_MAP_FIT_PADDING = {
  top: 48,
  bottom: 48,
  left: 48,
  right: 48,
} as const

export const TERRITORIOS_MAP_MAX_ZOOM = 14
