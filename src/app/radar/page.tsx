import type { Metadata } from "next"

import { RadarDashboard } from "./radar-dashboard"

export const metadata: Metadata = {
  title: "Radar | CoPatrulha",
  description:
    "Mapa demonstrativo do Estado do Rio com macro-regiões fictícias e assistente de exemplo.",
}

export default function RadarPage() {
  return <RadarDashboard />
}
