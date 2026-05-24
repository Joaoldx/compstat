"use client"

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"

import { ACCENT_PRIMARY } from "@/components/dashboard-strategic/chart-palette"
import { StrategicChartEmpty } from "@/components/dashboard-strategic/dashboard-chart-card"
import type { MesCasosPonto } from "@/lib/dashboard-strategic/types"

export function ChartCasosPorMes(props: Readonly<{ data: MesCasosPonto[] }>) {
  const { data } = props
  if (data.length === 0)
    return <StrategicChartEmpty message="Sem pontos mensais nos filtros atuais." />

  const rows = [...data]

  return (
    <div className="h-[230px] w-full sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="fillCasos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT_PRIMARY} stopOpacity={0.85} />
              <stop offset="95%" stopColor={ACCENT_PRIMARY} stopOpacity={0.06} />
            </linearGradient>
          </defs>
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
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0]?.payload as MesCasosPonto | undefined
              const v = row?.casos ?? 0
              return (
                <div className="rounded-lg border border-white/15 bg-[#1a1a1a]/95 px-3 py-2 text-xs shadow-lg">
                  <div className="font-medium text-white/95">{row?.rotulo}</div>
                  <div className="mt-1 text-[#26C2D1]">{`${v.toFixed(1)} (est.)`}</div>
                  <div className="text-white/50">Mensal proporcional ao total anual.</div>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="casos"
            name="Casos"
            stroke={ACCENT_PRIMARY}
            strokeWidth={2}
            fill="url(#fillCasos)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
