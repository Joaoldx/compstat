import { useEffect, useState } from "react"

import type { TerritoriosFeatureCollection } from "@/lib/parse-territorio-csv"
import type { TerritoriosApiLoadState } from "@/types/territorio"

const ENDPOINT = "/api/territorios"

async function fetchFeatureCollection(): Promise<TerritoriosFeatureCollection> {
  const response = await fetch(ENDPOINT)
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? response.statusText)
  }
  return response.json()
}

/** Carrega o GeoJSON gerado pela API de territórios (hoje CSV; amanhã pode ser proxy remoto). */
export function useTerritoriosGeoJson(): TerritoriosApiLoadState {
  const [state, setState] = useState<TerritoriosApiLoadState>({
    status: "loading",
  })

  useEffect(() => {
    let cancelled = false

    fetchFeatureCollection()
      .then((data) => {
        if (cancelled) return

        const count = data.features?.length ?? 0
        if (count === 0) {
          setState({ status: "empty" })
          return
        }

        setState({ status: "ready", data })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message =
          error instanceof Error ? error.message : "Falha ao carregar dados do mapa"
        setState({ status: "error", message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
