"use client"

import type { ReactNode } from "react"

import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"
import {
  defaultRadarTerritoryFilters,
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
  /** Carregamento do CSV público pelo mapa — mostra estado sem esconder o painel. */
  csvLoading: boolean
  /** Produção: falha grave sem modo demo — o mapa não abre e o painel fica apenas informativo. */
  csvFatalError: string | null
  /** Conteúdos à direita do título — ex.: botão "Gerar relatório" (PDF do mapa). */
  toolbarExtra?: ReactNode
}>

export function RadarTerritoryFiltersPanel({
  catalog,
  filters,
  onChange,
  stats,
  csvLoading,
  csvFatalError,
  toolbarExtra,
}: RadarTerritoryFiltersPanelProps) {
  const paneDisabled = Boolean(csvFatalError)
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
    paneDisabled ||
    catalog === null ||
    !catalog.hasDominioOrcrimColumn ||
    catalog.dominios.length === 0

  const delitosSelectOcioso =
    paneDisabled ||
    catalog === null ||
    (catalog.delitos?.length ?? 0) <= 1

  const filtrosVaciosTodos =
    stats.total > 0 && stats.visible === 0 && !paneDisabled

  const showDominioAusentePorFonte =
    catalog !== null && !catalog.hasDominioOrcrimColumn

  const showAjudaAoCarregarGeral = !paneDisabled && csvLoading

  return (
    <section
      id="radar-filtros"
      className={cn(
        "rounded-2xl border border-border bg-card/90 p-4 shadow-sm ring-1 ring-border",
        "text-foreground backdrop-blur-sm md:p-5",
        paneDisabled && "opacity-95"
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {toolbarExtra ?? null}
          <button
            type="button"
            disabled={paneDisabled}
            onClick={() => {
              const d = defaultRadarTerritoryFilters()
              onChange({
                ...d,
                anoMin: catalog?.yearMin ?? d.anoMin,
                anoMax: catalog?.yearMax ?? d.anoMax,
              })
            }}
            className={cn(
              "shrink-0 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium transition",
              "hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            Limpar filtros
          </button>
        </div>
      </header>

      {paneDisabled ? (
        <div
          role="alert"
          className={cn(
            "mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          )}
        >
          <p className="leading-snug font-medium">
            O mapa não carregou neste ambiente, por isso não é possível filtrar
            polígonos agora (não há catálogo a partir do CSV).
          </p>
          {csvFatalError ? (
            <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed tracking-wide dark:text-muted-foreground/95">
              Detalhes técnicos:{" "}
              <span className="break-words font-medium text-foreground">
                {csvFatalError}
              </span>
            </p>
          ) : null}
        </div>
      ) : showAjudaAoCarregarGeral ? (
        <>
          <div
            role="status"
            className="mt-4 rounded-xl border border-sky-500/35 bg-sky-500/[0.07] px-4 py-3 text-[11px] leading-relaxed text-muted-foreground shadow-sm dark:border-sky-400/25 dark:bg-sky-950/35"
          >
            <span className="font-semibold text-foreground">
              Carregando o CSV público…
            </span>{" "}
            Você já pode usar o campo de texto e os níveis de prioridade enquanto o mapa
            constrói o catálogo. Domínio OCRIM, faixa de anos e lista completa de
            delitos ativam automaticamente assim que os dados ficarem disponíveis.
          </div>
          <div className="mt-4 animate-pulse rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-14 rounded-lg bg-muted" />
              <div className="h-14 rounded-lg bg-muted" />
              <div className="h-14 rounded-lg bg-muted sm:col-span-1" />
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-5">
        <label className="flex flex-col gap-1 lg:col-span-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Nome ou território
          </span>
          <input
            type="search"
            value={filters.textoTerritorio}
            disabled={paneDisabled}
            onChange={(e) =>
              atualizarCampo("textoTerritorio", e.target.value)
            }
            placeholder="Ex.: Alto Paraíba, morro…"
            className={cn(
              "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-sky-500/30",
              "placeholder:text-muted-foreground/70 focus-visible:ring-4",
              paneDisabled && "opacity-50"
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
          {showDominioAusentePorFonte ? (
            <span className="text-[10px] text-muted-foreground">
              Indisponível nesta fonte de dados simulados.
            </span>
          ) : showAjudaAoCarregarGeral ? (
            <span className="text-[10px] text-muted-foreground">
              Lista de domínios preenchida assim que o mapa ler o CSV.
            </span>
          ) : null}
        </label>

        <fieldset className="min-w-0 lg:col-span-5">
          <legend className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Prioridade territorial
          </legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {RADAR_FILTROS_NIVEIS_TODOS.map((nv) => (
              <label
                key={nv}
                className={cn(
                  "flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground",
                  paneDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={filters.niveis.includes(nv)}
                  disabled={paneDisabled}
                  className="size-4 rounded border-border accent-sky-500"
                  onChange={(ev) => {
                    const marcado = ev.target.checked
                    if (marcado) {
                      const setAtual = new Set<RadarCrimeSeverity>(filters.niveis)
                      setAtual.add(nv)
                      atualizarCampo(
                        "niveis",
                        RADAR_FILTROS_NIVEIS_TODOS.filter((x) => setAtual.has(x))
                      )
                    } else {
                      atualizarCampo(
                        "niveis",
                        filters.niveis.filter((x) => x !== nv)
                      )
                    }
                  }}
                />
                <span>{NIVEL_LABELS[nv]}</span>
              </label>
            ))}
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
                disabled={paneDisabled || anosDesativados}
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
                disabled={paneDisabled || anosDesativados}
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
            disabled={delitosSelectOcioso}
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
              delitosSelectOcioso && "cursor-not-allowed opacity-50"
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
