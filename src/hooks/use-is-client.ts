"use client"

import * as React from "react"

/**
 * true após hidratar no cliente. Evita ler estado do browser durante o SSR
 * e remove avisos de hidratação em componentes que dependem disso (ex.: `useTheme`).
 */
export function useIsClient(): boolean {
  const [client, setClient] = React.useState(false)

  React.useEffect(() => {
    queueMicrotask(() => {
      setClient(true)
    })
  }, [])

  return client
}
