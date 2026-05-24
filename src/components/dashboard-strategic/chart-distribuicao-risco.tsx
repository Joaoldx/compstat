"use client"

import type { ReactNode } from "react"
import { Cell, Legend, Pie, PieChart, Tooltip, ResponsiveContainer } from "recharts"

import { ACCENT_PRIMARY, chartColor } from "@/components/dashboard-strategic/chart-palette"
import { StrategicChartEmpty } from "@/components/dashboard-strategic/dashboard-chart-card"
import type { DonutSlice } from "@/lib/dashboard-strategic/types"

type Row = DonutSlice & { fill?: string }

function MiniTooltip(payload: Row | undefined): ReactNode {
  if (!payload) return null
  const v = typeof payload.value === "number" ? payload.value : 0
  const pct =
    typeof payload.percent === "number" ? payload.percent : 0
  return (
    <div className="rounded-lg border border-white/15 bg-[#1a1a1a]/95 px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-white/95">{payload.name}</div>
      <div className="mt-1 text-[#26C2D1]">{`${pct.toFixed(1)}%`}</div>
      <div className="text-white/70">{`${Math.round(v)} ocorrências`}</div>
    </div>
  )
}

export function ChartDistribuicaoRisco(props: Readonly<{ data: DonutSlice[] }>) {
  const { data } = props
  if (data.length === 0)
    return <StrategicChartEmpty message="Sem dados nesta combinação de filtros." />

  const chartRows: Row[] = data.map((d, i) => ({
    ...d,
    fill: chartColor(i),
  }))

  return (
    <div className="h-[240px] w-full pb-8 sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <Pie
            data={chartRows}
            cx="42%"
            cy="48%"
            dataKey="value"
            nameKey="name"
            innerRadius={54}
            outerRadius={82}
            paddingAngle={1}
            stroke="none"
          >
            {chartRows.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={chartRows[idx]?.fill ?? ACCENT_PRIMARY} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              return MiniTooltip(payload[0]?.payload as Row | undefined)
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{
              paddingLeft: 8,
              color: "rgba(255,255,255,0.75)",
              fontSize: 11,
              maxHeight: "100%",
              overflowY: "auto",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
