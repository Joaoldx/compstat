import type { Metadata } from "next"

import { DashboardStrategic } from "@/components/dashboard-strategic/dashboard-strategic"

export const metadata: Metadata = {
  title: "Dashboard estratégico | CoPatrulha",
  description:
    "Painel com agregações de ocorrências em polígonos territoriais derivadas do arquivo radar-rj-crossed.csv.",
}

export default function DashboardEstrategicoPage() {
  return <DashboardStrategic />
}
