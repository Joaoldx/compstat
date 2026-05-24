import { NextResponse } from "next/server"

import { getTerritoriosGeoJson } from "@/lib/data/territorios"

export const dynamic = "force-dynamic"

function logTerritoriosStatsInDev(stats: Record<string, number>) {
  if (process.env.NODE_ENV !== "development") return
  console.info("[api/territorios]", stats)
}

export async function GET() {
  try {
    const { data, stats } = await getTerritoriosGeoJson()
    logTerritoriosStatsInDev(stats)
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar dados"
    console.error("[api/territorios]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
