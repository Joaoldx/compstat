"use client"

import type { ReactNode } from "react"
import { useState } from "react"

import type { RadarFilterCatalog } from "@/lib/radar/radar-territory-filter"
import type { StrategicDashboardFilters } from "@/lib/dashboard-strategic/types"
import { cn } from "@/lib/utils"

export type TerritoryOptionStrategic = Readonly<{ id: string; nome: string }>

function Pill(props: Readonly<{ open?: boolean; children: ReactNode }>) {
  return (
    <span
      className={cn(
        "flex cursor-pointer list-none items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-[color,box-shadow,border-color]",
        props.open
          ? "border-[#26C2D1]/85 bg-[#26C2D1]/12 text-[#B8F9FF] shadow-[0_0_0_3px_rgba(38,194,209,0.15)]"
          : "border-white/12 bg-[#242424]/90 text-white/82 hover:border-white/22"
      )}
    >
      {props.children}
    </span>
  )
}

function SelectNative(props: Readonly<{ value: number; entries: readonly number[]; onPick: (n: number) => void }>) {
  const { value, entries, onPick } = props
  return (
    <select
      aria-label="Selecionar ano"
      className="mt-3 w-full rounded-lg border border-white/14 bg-[#1a1a1a] px-2 py-2 text-[13px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#26C2D1]/55"
      value={String(value)}
      onChange={(e) => {
        const n = Number.parseInt(e.target.value, 10)
        if (Number.isFinite(n)) onPick(n)
      }}
    >
      {entries.map((y) => (
        <option key={y} value={String(y)}>
          {y}
        </option>
      ))}
    </select>
  )
}

function PoligonoFilter(props: Readonly<{
  territoryOptions: readonly TerritoryOptionStrategic[]
  selectedIds: readonly string[]
  disabled: boolean
  onToggle: (id: string) => void
  onClear: () => void
}>) {
  const [q, setQ] = useState("")
  const filt = props.territoryOptions.filter((t) =>
    t.nome.toLowerCase().includes(q.trim().toLowerCase())
  )
  const resumo =
    props.selectedIds.length === 0
      ? `Todos (${props.territoryOptions.length})`
      : `${props.selectedIds.length} selec.`

  return (
    <details className="group relative">
      <summary className="list-none [&::-webkit-details-marker]:hidden">
        <Pill open={false}>
          Polígonos <span className="text-[#26C2D1]/95">▼</span>{" "}
          <span className="font-normal normal-case tracking-normal text-white/62">{resumo}</span>
        </Pill>
      </summary>
      <div
        className={cn(
          "absolute left-0 z-[60] mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-white/14 bg-[#1e1e1e] p-3 shadow-2xl",
          props.disabled && "opacity-55"
        )}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <input
          type="search"
          placeholder="Pesquisar território…"
          aria-label="Pesquisar território"
          className="w-full rounded-lg border border-white/12 bg-black/35 px-2 py-2 text-[13px] text-white outline-none placeholder:text-white/37 focus-visible:ring-2 focus-visible:ring-[#26C2D1]/45"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={props.disabled}
        />
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/8 bg-black/28">
          {filt.map((t) => {
            const on = props.selectedIds.includes(t.id)
            return (
              <label
                key={t.id}
                className="flex cursor-pointer items-start gap-2 border-b border-white/[0.04] px-3 py-2 text-[13px] last:border-none hover:bg-white/[0.04]"
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={props.disabled}
                  onChange={() => props.onToggle(t.id)}
                  className="mt-0.5 rounded border-white/35 text-[#26C2D1] accent-[#26C2D1]"
                />
                <span className="text-white/86">{t.nome}</span>
              </label>
            )
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={props.disabled}
            className="flex-1 rounded-lg border border-white/14 px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/[0.05]"
            onClick={props.onClear}
          >
            Limpar seleção
          </button>
        </div>
      </div>
    </details>
  )
}

export function StrategicDashboardFiltersToolbar(props: Readonly<{
  catalog: RadarFilterCatalog | null
  filters: StrategicDashboardFilters
  territoryOptions: readonly TerritoryOptionStrategic[]
  onChange: (next: StrategicDashboardFilters) => void
  disabledCatalog: boolean
}>) {
  const { catalog, filters, territoryOptions, onChange, disabledCatalog } = props
  const yearSpan =
    catalog === null ? [] : listYearsInclusive(catalog.yearMin, catalog.yearMax)

  return (
    <div className="flex flex-wrap items-end gap-3 lg:justify-end lg:gap-4">
      <span className="mb-px hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52 sm:inline">
        Filtros:
      </span>

      <PoligonoFilter
        territoryOptions={territoryOptions}
        selectedIds={filters.territorioIdsSeleccionados}
        disabled={disabledCatalog || territoryOptions.length === 0}
        onToggle={(id) =>
          toggleId(
            filters.territorioIdsSeleccionados,
            id,
            (next) =>
              onChange({
                ...filters,
                territorioIdsSeleccionados: next,
              })
          )
        }
        onClear={() =>
          onChange({
            ...filters,
            territorioIdsSeleccionados: [],
          })
        }
      />

      {/* Fonte = domínio OCRIM */}
      <details className="group relative">
        <summary className="list-none [&::-webkit-details-marker]:hidden">
          <Pill>
            Fonte <span className="text-[#26C2D1]/95">▼</span>{" "}
            <span className="font-normal normal-case tracking-normal text-white/62">
              {filters.dominioOrcrim.trim() ? filters.dominioOrcrim : "Todas"}
            </span>
          </Pill>
        </summary>
        <div className="absolute right-0 z-[60] mt-2 max-h-[min(60vh,20rem)] w-[min(100vw-2rem,17rem)] overflow-y-auto rounded-xl border border-white/14 bg-[#1e1e1e] p-3 shadow-xl">
          <RadiosDominio
            dominios={catalog?.dominios ?? []}
            disabled={disabledCatalog || !catalog?.dominios?.length}
            value={filters.dominioOrcrim}
            onPick={(dom) =>
              onChange({
                ...filters,
                dominioOrcrim: dom,
              })
            }
          />
        </div>
      </details>

      {/* Subtipo = código de delito (catálogo) */}
      <details className="group relative">
        <summary className="list-none [&::-webkit-details-marker]:hidden">
          <Pill>
            Subtipo <span className="text-[#26C2D1]/95">▼</span>{" "}
            <span className="font-normal normal-case tracking-normal text-white/62">
              {truncateLabel(filters.subtipoSeleccionCod, catalog)}
            </span>
          </Pill>
        </summary>
        <DelitoSelectList
          delitos={catalog?.delitos ?? []}
          disabled={disabledCatalog}
          valueCod={filters.subtipoSeleccionCod}
          onPick={(cod) =>
            onChange({
              ...filters,
              subtipoSeleccionCod: cod,
            })
          }
        />
      </details>

      {/* Período */}
      <details className="group relative">
        <summary className="list-none [&::-webkit-details-marker]:hidden">
          <Pill>
            Período <span className="text-[#26C2D1]/95">▼</span>{" "}
            <span className="font-normal normal-case tracking-normal text-white/62">
              {`${filters.anoMin} → ${filters.anoMax}`}
            </span>
          </Pill>
        </summary>
        <div className="absolute right-0 z-[60] mt-2 w-[min(100vw-2rem,17rem)] rounded-xl border border-white/14 bg-[#1e1e1e] px-4 py-3 shadow-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/43">
            Ano inicial
          </div>
          <SelectNative
            value={clampYear(filters.anoMin, catalog)}
            entries={yearSpan}
            onPick={(anoMin) => {
              const hi = filters.anoMax
              const loSafe = anoMin <= hi ? anoMin : hi
              const hiSafe = anoMin <= hi ? hi : anoMin
              onChange({ ...filters, anoMin: loSafe, anoMax: hiSafe })
            }}
          />
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/43">
            Ano final
          </div>
          <SelectNative
            value={clampYear(filters.anoMax, catalog)}
            entries={yearSpan}
            onPick={(anoMax) => {
              const lo = filters.anoMin
              const loSafe = anoMax >= lo ? lo : anoMax
              const hiSafe = anoMax >= lo ? anoMax : lo
              onChange({ ...filters, anoMin: loSafe, anoMax: hiSafe })
            }}
          />
        </div>
      </details>
    </div>
  )
}

function listYearsInclusive(a: number, b: number): number[] {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const out: number[] = []
  for (let y = lo; y <= hi; y++) out.push(y)
  return out
}

function toggleId(
  ids: readonly string[],
  id: string,
  set: (next: string[]) => void
) {
  const s = new Set(ids)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  set([...s].sort())
}

function truncateLabel(raw: string, catalog: RadarFilterCatalog | null): string {
  const c = raw.trim()
  if (!catalog || c === "") return "Todos"
  const hit = catalog.delitos.find((d) => d.cod === c)
  if (!hit) return c.length > 22 ? `${c.slice(0, 20)}…` : c
  const txt = hit.desc.trim() || hit.cod
  return txt.length > 38 ? `${txt.slice(0, 36)}…` : txt
}

function RadiosDominio(props: Readonly<{
  dominios: readonly string[]
  value: string
  disabled: boolean
  onPick: (dom: string) => void
}>) {
  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-white/[0.04]">
        <input
          type="radio"
          name="dash-fonte"
          checked={props.value.trim().length === 0}
          disabled={props.disabled}
          onChange={() => props.onPick("")}
          className="accent-[#26C2D1]"
        />
        Todas as fontes
      </label>
      {props.dominios.map((d) => (
        <label
          key={d}
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-white/[0.04]"
        >
          <input
            type="radio"
            name="dash-fonte"
            checked={props.value === d}
            disabled={props.disabled}
            onChange={() => props.onPick(d)}
            className="accent-[#26C2D1]"
          />
          {d}
        </label>
      ))}
    </div>
  )
}

function DelitoSelectList(props: Readonly<{
  delitos: ReadonlyArray<{ cod: string; desc: string }>
  disabled: boolean
  valueCod: string
  onPick: (cod: string) => void
}>) {
  const [busca, setBusca] = useState("")
  const q = busca.trim().toLowerCase()
  const mostrar = props.delitos
    .filter((d) => {
      const t = `${d.cod} ${d.desc}`.toLowerCase()
      return q === "" || t.includes(q)
    })
    .slice(0, 120)

  return (
    <div
      className="absolute right-0 z-[60] mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-white/14 bg-[#1e1e1e] p-3 shadow-xl"
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <input
        value={busca}
        aria-label="Pesquisar subtipo/delito"
        placeholder="Filtrar listagem…"
        disabled={props.disabled}
        className="w-full rounded-lg border border-white/12 bg-black/35 px-2 py-2 text-[13px] outline-none placeholder:text-white/37 focus-visible:ring-2 focus-visible:ring-[#26C2D1]/45"
        onChange={(e) => setBusca(e.target.value)}
      />
      <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-black/26">
        <button
          type="button"
          disabled={props.disabled}
          className={cn(
            "w-full px-3 py-2 text-left text-[13px] hover:bg-white/[0.05]",
            props.valueCod === "" ? "bg-[#26C2D1]/14 text-[#B8F9FF]" : "text-white/88"
          )}
          onClick={() => props.onPick("")}
        >
          Todos os subtipos
        </button>
        {mostrar.map((d) => (
          <button
            key={d.cod}
            type="button"
            disabled={props.disabled}
            className={cn(
              "w-full border-t border-white/[0.04] px-3 py-2 text-left text-[13px] leading-snug hover:bg-white/[0.05]",
              props.valueCod === d.cod ? "bg-[#26C2D1]/14 text-[#B8F9FF]" : "text-white/88"
            )}
            onClick={() => props.onPick(d.cod)}
            title={`${d.desc} (${d.cod})`}
          >
            {d.desc.trim() || d.cod}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-white/40">Últimos 120 registos encontrados pela busca.</p>
    </div>
  )
}

function clampYear(y: number, catalog: RadarFilterCatalog | null): number {
  if (!catalog) return y
  if (Number.isFinite(catalog.yearMin) && Number.isFinite(catalog.yearMax)) {
    const lo = Math.min(catalog.yearMin, catalog.yearMax)
    const hi = Math.max(catalog.yearMin, catalog.yearMax)
    return Math.min(Math.max(y, lo), hi)
  }
  return y
}
