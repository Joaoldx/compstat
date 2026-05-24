"use client"

import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"
import {
  RADAR_FILTROS_NIVEIS_TODOS,
  type RadarFilterCatalog,
  type RadarTerritoryFiltersState,
} from "@/lib/radar/radar-territory-filter"
import { cn } from "@/lib/utils"

const NIVEL_LABELS: Record<RadarCrimeSeverity, string> = {
  critico: "Crítico",
  elevado: "Elevado",
  moderado: "Moderado",
  acompanhar: "Baixa / acompanhar",
}

export type RadarLayerStats = Readonly<{ total: number; visible: number }>

type RadarTerritoryFiltersPanelProps = Readonly<{
  catalog: RadarFilterCatalog | null
  filters: RadarTerritoryFiltersState
  onChange: (next: RadarTerritoryFiltersState) => void
  stats: RadarLayerStats
  disabled?: boolean
}>

export function RadarTerritoryFiltersPanel({
  catalog,
  filters,
  onChange,
  stats,
  disabled,
}: RadarTerritoryFiltersPanelProps) {
  const atualizarCampo = <K extends keyof RadarTerritoryFiltersState>(
    campo: K,
    valor: RadarTerritoryFiltersState[K]
  ) => {
    onChange({ ...filters, [campo]: valor })
  }

  const anosDesativados =
    !catalog?.hasDistribuicaoPorAno ||
    !(catalog.yearMax >= catalog.yearMin)

  const dominioDesativado =
    disabled || !catalog?.hasDominioOrcrimColumn || catalog.dominios.length === 0

  const filtrosVaciosTodos =
    stats.total > 0 && stats.visible === 0 && !disabled

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card/90 p-4 shadow-sm ring-1 ring-border",
        "text-foreground backdrop-blur-sm md:p-5"
      )}
      aria-label="Filtros do mapa territorial"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-foreground">
            Filtrar polígonos
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Combine critérios — o tooltip e cores seguem apenas os territórios que
            passam nos filtros.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange({
              textoTerritorio: "",
              dominioOrcrim: "",
              niveis: [...RADAR_FILTROS_NIVEIS_TODOS],
              anoMin:
                catalog?.yearMin ??
                catalog?.yearMax ??
                new Date().getFullYear(),
              anoMax:
                catalog?.yearMax ??
                catalog?.yearMin ??
                new Date().getFullYear(),
              delitoSeleccionCod: "",
            })
          }
          className={cn(
            "shrink-0 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium transition",
            "hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          Limpar filtros
        </button>
      </header>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-5">
        <label className="flex flex-col gap-1 lg:col-span-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Nome ou território
          </span>
          <input
            type="search"
            value={filters.textoTerritorio}
            disabled={disabled}
            onChange={(e) =>
              atualizarCampo("textoTerritorio", e.target.value)
            }
            placeholder="Ex.: Alto Paraíba, morro…"
            className={cn(
              "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-sky-500/30",
              "placeholder:text-muted-foreground/70 focus-visible:ring-4",
              disabled && "opacity-50"
            )}
          />
        </label>

        <label className="flex flex-col gap-1 lg:col-span-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Domínio OCRIM
          </span>
          <select
            disabled={dominioDesativado}
            value={
              dominioDesativado
                ? ""
                : filters.dominioOrcrim.length > 0
                  ? filters.dominioOrcrim
                  : ""
            }
            onChange={(e) =>
              atualizarCampo(
                "dominioOrcrim",
                e.target.value === "" ? "" : e.target.value
              )
            }
            className={cn(
              "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-sky-500/30",
              "focus-visible:ring-4",
              dominioDesativado && "cursor-not-allowed opacity-50"
            )}
          >
            <option value="">Todos os domínios</option>
            {(catalog?.dominios ?? []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {!catalog?.hasDominioOrcrimColumn ? (
            <span className="text-[10px] text-muted-foreground">
              Indisponível nesta fonte de dados simulados.
            </span>
          ) : null}
        </label>

        <fieldset className="min-w-0 lg:col-span-5">
          <legend className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Prioridade territorial
          </legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {RADAR_FILTROS_NIVEIS_TODOS.map((nv) => {
              const marcado =
                filtrosPorNivelCompleto ||
                filters.niveis.some((x) => x === nv)
              return (
                <label
                  key={nv}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={marcado || filters.niveis.includes(nv)}
                    disabled={disabled}
                    className="size-4 rounded border-border accent-sky-500"
                    onChange={(ev) =>
                      filtrosPorNivelCompleto && !ev.target.checked
                        ? alternarNivel(nv, false)
                        : filtrosPorNivelCompleto && ev.target.checked
                          ? seleccionarTodosNiveis()
                          : alternarNivel(nv, ev.target.checked)
                    }
                  />
                  <span>{NIVEL_LABELS[nv]}</span>
                </label>
              )
            })}
          </div>
          {filters.niveis.length === 0 ? (
            <p className="mt-2 text-[10px] text-amber-500/90 dark:text-amber-400/90">
              Nenhuma prioridade marcada ocultará todos os polígonos.
            </p>
          ) : null}
        </fieldset>

        <div className="sm:col-span-2 lg:col-span-6">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Faixa de anos (somando ocorrências no intervalo)
          </span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                Desde (ano)
              </span>
              <input
                type="number"
                min={
                  anosDesativados
                    ? filters.anoMin
                    : catalog?.yearMin ?? filters.anoMin
                }
                max={
                  anosDesativados
                    ? filters.anoMin
                    : catalog?.yearMax ?? filters.anoMax
                }
                disabled={disabled || anosDesativados}
                value={filters.anoMin}
                onChange={(e) =>
                  atualizarCampo(
                    "anoMin",
                    Number.parseInt(e.target.value, 10) || filters.anoMin
                  )
                }
                className={cn(
                  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-sky-500/30",
                  "focus-visible:ring-4",
                  anosDesativados && "opacity-50"
                )}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                Até (ano)
              </span>
              <input
                type="number"
                min={
                  anosDesativados
                    ? filters.anoMin
                    : catalog?.yearMin ?? filters.anoMin
                }
                max={
                  anosDesativados
                    ? filters.anoMax
                    : catalog?.yearMax ?? filters.anoMax
                }
                disabled={disabled || anosDesativados}
                value={filters.anoMax}
                onChange={(e) =>
                  atualizarCampo(
                    "anoMax",
                    Number.parseInt(e.target.value, 10) || filters.anoMax
                  )
                }
                className={cn(
                  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-sky-500/30",
                  "focus-visible:ring-4",
                  anosDesativados && "opacity-50"
                )}
              />
            </label>
          </div>
          {catalog && !catalog.hasDistribuicaoPorAno ? (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Este conjunto não traz série por ano distribuída — filtros por ano são
              ignorados.
            </p>
          ) : (
            catalog ? (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Cobertura de anos nos dados: {catalog.yearMin} – {catalog.yearMax}.
              </p>
            ) : null
          )}
        </div>

        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-6">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Delito predominante ou presente nas agregações
          </span>
          <select
            disabled={
              disabled || catalog === null || (catalog.delitos?.length ?? 0) <= 1
            }
            value={
              catalog && catalog.delitos.length <= 1
                ? "__todos_delitos"
                : filters.delitoSeleccionCod.length > 0
                  ? filters.delitoSeleccionCod
                  : "__todos_delitos"
            }
            onChange={(e) =>
              atualizarCampo(
                "delitoSeleccionCod",
                e.target.value === "__todos_delitos"
                  ? ""
                  : e.target.value
              )
            }
            className={cn(
              "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-sky-500/30",
              "focus-visible:ring-4",
              (disabled || catalog === null || delitoDesativado) &&
                "cursor-not-allowed opacity-50"
            )}
          >
            <option value="__todos_delitos">Todos</option>
            {(catalog?.delitos ?? []).map((d) => (
              <option key={d.cod} value={d.cod}>
                {d.desc.length > 72 ? `${d.desc.slice(0, 71)}…` : d.desc}
              </option>
            ))}
          </select>
          {catalog &&
          !catalog.hasDistribuicaoDelitoExtra &&
          catalog.delitos.length > 1 ? (
            <span className="text-[10px] text-muted-foreground">
              Filtro aplica apenas ao delito predominante por território.
            </span>
          ) : null}
        </label>
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-[11px] text-muted-foreground">
        <p>
          Territórios visíveis:{" "}
          <span className="font-semibold text-foreground">
            {stats.visible}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-foreground">{stats.total}</span>
        </p>

        {filtrosVaciosTodos ? (
          <div
            className={cn(
              "rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950",
              "dark:border-amber-400/35 dark:bg-amber-950/35 dark:text-amber-50"
            )}
            role="status"
          >
            Nenhum território corresponde aos filtros ativos. Experimente remover
            critérios ou ampliar a faixa de anos.
          </div>
        ) : null}
      </footer>
    </section>
  )
}
