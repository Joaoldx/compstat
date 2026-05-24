"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { ChartCasosPorMes } from "@/components/dashboard-strategic/chart-casos-mes"
import { ChartDistribuicaoRisco } from "@/components/dashboard-strategic/chart-distribuicao-risco"
import { ChartPrioridadePorMes } from "@/components/dashboard-strategic/chart-prioridade-mes"
import { ChartRegioesAfetadas } from "@/components/dashboard-strategic/chart-regioes-afetadas"
import {
  StrategicChartCard,
  StrategicChartEmpty,
} from "@/components/dashboard-strategic/dashboard-chart-card"
import type { TerritoryOptionStrategic } from "@/components/dashboard-strategic/strategic-dashboard-filters"
import { StrategicDashboardFiltersToolbar } from "@/components/dashboard-strategic/strategic-dashboard-filters"
import {
  aggregateDonutByDominio,
  aggregateMesCasosDistribuidosPorAnual,
  aggregateMesPrioridade,
  aggregateRegioesMaisAtingidas,
  filterFeaturesForStrategicDashboard,
} from "@/lib/dashboard-strategic/aggregate-crossed-features"
import { defaultStrategicDashboardFilters } from "@/lib/dashboard-strategic/types"
import {
  RADAR_RJ_CROSSED_CSV_URL,
  fetchRadarRJCrosswalk,
  type RadarCrossedPolygonProperties,
} from "@/lib/radar/load-radar-rj-crossed"
import {
  buildRadarFilterCatalog,
  type RadarFilterCatalog,
} from "@/lib/radar/radar-territory-filter"
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson"

function buildTerritoriesList(
  fc: FeatureCollection<Polygon | MultiPolygon, RadarCrossedPolygonProperties>
): TerritoryOptionStrategic[] {
  const map = new Map<string, string>()
  for (const f of fc.features) {
    const id = f.properties.territorio_id
    const nome = (f.properties.nome_territorio ?? "").trim()
    map.set(id, nome.length > 0 ? nome : id)
  }
  return [...map.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt"))
}

export function DashboardStrategic() {
  const [fc, setFc] =
    useState<FeatureCollection<Polygon | MultiPolygon, RadarCrossedPolygonProperties> | null>(
      null
    )
  const [catalog, setCatalog] = useState<RadarFilterCatalog | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [filters, setFilters] = useState(() =>
    defaultStrategicDashboardFilters(2000, new Date().getFullYear())
  )
  const syncAnosCatalogoCarregado = useRef(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await fetchRadarRJCrosswalk(RADAR_RJ_CROSSED_CSV_URL)
        if (!alive) return
        setFc(data)
        setCatalog(buildRadarFilterCatalog(data))
      } catch (e: unknown) {
        if (!alive) return
        setErr(e instanceof Error ? e.message : "Falha ao carregar dados.")
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!catalog || syncAnosCatalogoCarregado.current) return
    syncAnosCatalogoCarregado.current = true
    setFilters((f) => ({
      ...f,
      anoMin: catalog.yearMin,
      anoMax: catalog.yearMax,
    }))
  }, [catalog])

  const territoryOptions = useMemo(
    () => (fc !== null ? buildTerritoriesList(fc) : []),
    [fc]
  )

  const filteredFeatures = useMemo(() => {
    if (fc === null) return []
    return filterFeaturesForStrategicDashboard(fc, filters)
  }, [fc, filters])

  const donutData = useMemo(() => aggregateDonutByDominio(filteredFeatures, filters), [
    filteredFeatures,
    filters,
  ])

  const mesCasos = useMemo(
    () => aggregateMesCasosDistribuidosPorAnual(filteredFeatures, filters),
    [filteredFeatures, filters]
  )

  const regioes = useMemo(() => aggregateRegioesMaisAtingidas(filteredFeatures, filters, 14), [
    filteredFeatures,
    filters,
  ])

  const priorities = useMemo(
    () => aggregateMesPrioridade(filteredFeatures, filters),
    [filteredFeatures, filters]
  )

  if (err !== null)
    return (
      <div className="rounded-2xl border border-red-500/25 bg-[#241212]/90 p-8 text-center text-sm text-red-200">
        Não foi possível carregar o CSV do Radar:{" "}
        <span className="text-red-300">{err}</span>
      </div>
    )

  if (catalog === null || fc === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="animate-pulse text-sm text-white/62">Carregando dados territorializados…</p>
      </div>
    )
  }

  const estadoVazio = filteredFeatures.length === 0

  return (
    <div className="bg-[#121212] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 md:px-8">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
              CoPatrulha
            </h1>
            <p className="mt-1 text-sm tracking-wide text-white/58">Dashboard estratégico</p>
          </div>
          <StrategicDashboardFiltersToolbar
            catalog={catalog}
            territoryOptions={territoryOptions}
            filters={filters}
            disabledCatalog={false}
            onChange={setFilters}
          />
        </header>

        {estadoVazio ? (
          <div role="alert" className="rounded-2xl border border-amber-500/35 bg-[#2a2618]/95 px-4 py-12 text-center text-sm text-white/88">
            Nenhum polígono possui ocorrências no período e filtros atuais. Ajuste o intervalo de
            anos ou limite as fontes e subtipos.
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <StrategicChartCard
            title="Distribuição do risco"
            subtitle="Percentual de ocorrências por domínio OCRIM (fonte territorial)."
          >
            {estadoVazio ? (
              <StrategicChartEmpty message="Sem dados para exibir." />
            ) : (
              <ChartDistribuicaoRisco data={donutData} />
            )}
          </StrategicChartCard>

          <StrategicChartCard
            title="Quantidade de casos por mês"
            subtitle={
              estadoVazio
                ? ""
                : "Demonstração — totais só existem por ano no CSV; o gráfico reparte cada ano igualmente pelos doze meses."
            }
          >
            {estadoVazio ? (
              <StrategicChartEmpty message="Sem dados para exibir." />
            ) : (
              <ChartCasosPorMes data={mesCasos} />
            )}
          </StrategicChartCard>

          <StrategicChartCard
            title="Regiões mais atingidas"
            subtitle={`Top ${14} por soma das ocorrências no período (nome do território).`}
          >
            {estadoVazio ? (
              <StrategicChartEmpty message="Sem dados para exibir." />
            ) : (
              <ChartRegioesAfetadas data={regioes} />
            )}
          </StrategicChartCard>

          <StrategicChartCard
            title="Volume por nível de prioridade"
            subtitle="Demonstração — mesmos totais por ano distribuídos por mês; áreas empilhadas por nível local do CSV."
          >
            {estadoVazio ? (
              <StrategicChartEmpty message="Sem dados para exibir." />
            ) : (
              <ChartPrioridadePorMes data={priorities} />
            )}
          </StrategicChartCard>
        </div>

        {/* Rodapé ilustrativo mínimo */}
        <footer className="flex items-center justify-center gap-4 py-10">
          {[0.45, 0.55, 0.35].map((opacity, i) => (
            <span
              key={i}
              className="size-7 rounded-full border border-white/[0.12] bg-[#242424]"
              style={{ opacity }}
              aria-hidden
            />
          ))}
        </footer>
      </div>
    </div>
  )
}
