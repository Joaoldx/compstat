"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { MAP_STYLE_NETWORK_FALLBACK_URL } from "@/config/maplibre-style-fallback"

function normalizeStyleCascade(
  primaryOrCascade: string | readonly string[],
): readonly string[] {
  if (typeof primaryOrCascade === "string") {
    return primaryOrCascade === MAP_STYLE_NETWORK_FALLBACK_URL
      ? [MAP_STYLE_NETWORK_FALLBACK_URL]
      : [primaryOrCascade, MAP_STYLE_NETWORK_FALLBACK_URL]
  }
  return primaryOrCascade.length > 0
    ? primaryOrCascade
    : [MAP_STYLE_NETWORK_FALLBACK_URL]
}

/**
 * Tenta cada URL em sequência até o estilo ficar válido (MapLibre não emite erro fatal)
 * ou se esgotar a lista — a última entrada deve ser o demótiles MapLibre quando possível.
 */
export function useMapStyleWithNetworkFallback(
  primaryOrCascade: string | readonly string[],
) {
  const cascadeUrls = useMemo(() => normalizeStyleCascade(primaryOrCascade), [
    primaryOrCascade,
  ])

  const cascadeJoined = cascadeUrls.join("|")
  const [stageIndex, setStageIndex] = useState(0)
  const loadSucceededRef = useRef(false)

  // Reset ao mudar modo claro/escuro ou a lista encadeada; mapa já remonta com `key={effectiveStyleUrl}`.
  /* eslint-disable react-hooks/set-state-in-effect -- ciclo inicial necessário quando muda RADAR_*_STYLE_CASCADE */
  useEffect(() => {
    loadSucceededRef.current = false
    setStageIndex(0)
  }, [cascadeJoined])
  /* eslint-enable react-hooks/set-state-in-effect */

  const effectiveStyleUrl = cascadeUrls[Math.min(stageIndex, cascadeUrls.length - 1)]!

  const onStyleLoadSuccess = useCallback(() => {
    loadSucceededRef.current = true
  }, [])

  const onStyleLoadError = useCallback(() => {
    if (loadSucceededRef.current) return
    setStageIndex((i) => {
      const next = i + 1
      return next < cascadeUrls.length ? next : i
    })
  }, [cascadeUrls.length])

  const usingFallbackBasemap = stageIndex > 0

  const fallbackBasemapUserHint =
    stageIndex <= 0
      ? ""
      : effectiveStyleUrl === MAP_STYLE_NETWORK_FALLBACK_URL
        ? "Mapa base com tiles públicos de demonstração MapLibre: as CDNs de vetores anteriores falharam. Os dados e polígonos do Radar continuam disponíveis."
        : "Mapa base alternativo: o primeiro URL da cascata falhou nesta rede; outra origem de mapa compatível com MapLibre está em uso. Os dados e polígonos do Radar continuam válidos."

  return {
    effectiveStyleUrl,
    /** Chamar dentro do `onLoad` do `<Map>` após um carregamento bem-sucedido. */
    onStyleLoadSuccess,
    /** Encadear no `onError` do `<Map>`. */
    onStyleLoadError,
    usingFallbackBasemap,
    fallbackBasemapUserHint,
  } as const
}
