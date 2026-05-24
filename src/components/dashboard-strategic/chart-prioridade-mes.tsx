"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"

import { PRIORITY_SERIES_COLORS } from "@/components/dashboard-strategic/chart-palette"
import { StrategicChartEmpty } from "@/components/dashboard-strategic/dashboard-chart-card"
import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"
import {
  RADAR_PRIORITY_LABEL_PT,
  type MesPrioridadePonto,
} from "@/lib/dashboard-strategic/types"

type StackedRow = Readonly<{
  rotulo: string
  critico: number
  elevado: number
  moderado: number
  acompanhar: number
}>

const ORDEM: RadarCrimeSeverity[] = ["critico", "elevado", "moderado", "acompanhar"]

function normalize(data: MesPrioridadePonto[]): StackedRow[] {
  return data.map((row) => ({
    rotulo: row.rotulo,
    critico: row.critico ?? 0,
    elevado: row.elevado ?? 0,
    moderado: row.moderado ?? 0,
    acompanhar: row.acompanhar ?? 0,
  }))
}

export function ChartPrioridadePorMes(props: Readonly<{ data: MesPrioridadePonto[] }>) {
  const { data } = props
  if (data.length === 0)
    return <StrategicChartEmpty message="Sem dados de nível de prioridade no período." />

  const stacked = normalize(data)

  return (
    <div className="h-[230px] w-full sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={stacked} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="rotulo"
            stroke="rgba(255,255,255,0.35)"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            stroke="rgba(255,255,255,0.35)"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              fontSize: "11px",
              color: "rgba(255,255,255,0.9)",
            }}
            formatter={(value, name) => [
              `${typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : String(value ?? "")}`,
              String(name ?? ""),
            ]}
          />
          {ORDEM.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={RADAR_PRIORITY_LABEL_PT[key]}
              stackId="p"
              stroke={PRIORITY_SERIES_COLORS[key]}
              fill={PRIORITY_SERIES_COLORS[key]}
              fillOpacity={0.75}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
