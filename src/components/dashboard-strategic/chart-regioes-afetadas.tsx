"use client"

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"

import { ACCENT_PRIMARY } from "@/components/dashboard-strategic/chart-palette"
import { StrategicChartEmpty } from "@/components/dashboard-strategic/dashboard-chart-card"
import type { RegiaoBarPonto } from "@/lib/dashboard-strategic/types"

type Row = RegiaoBarPonto & { nomeCurto: string }

export function ChartRegioesAfetadas(props: Readonly<{ data: RegiaoBarPonto[] }>) {
  const { data } = props
  if (data.length === 0)
    return <StrategicChartEmpty message="Sem territórios com ocorrências no período." />

  const truncated: Row[] = data.map((d) => ({
    ...d,
    nomeCurto: d.nome.length > 42 ? `${d.nome.slice(0, 40)}…` : d.nome,
  }))

  return (
    <div className="h-[240px] w-full pb-8 sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={[...truncated].reverse()} margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.06)" horizontal />
          <XAxis
            type="number"
            stroke="rgba(255,255,255,0.35)"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
          />
          <YAxis
            type="category"
            width={148}
            dataKey="nomeCurto"
            stroke="rgba(255,255,255,0.35)"
            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 9 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(38,194,209,0.08)" }}
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "rgba(255,255,255,0.9)",
            }}
          />
          <Bar dataKey="casos" name="Casos" fill={ACCENT_PRIMARY} radius={[0, 6, 6, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
