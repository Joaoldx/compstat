"use client"

import dynamic from "next/dynamic"

const RioMapDynamic = dynamic(
  () =>
    import("@/components/mapa/rio-map").then((mod) => ({ default: mod.RioMap })),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex min-h-[50vh] w-full items-center justify-center rounded-lg border bg-muted/40 text-sm">
        A inicializar mapa…
      </div>
    ),
  }
)

export function MapaInteractive() {
  return <RioMapDynamic />
}
