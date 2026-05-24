/** Cores para gráficos alinhadas ao tema do produto (#26C2D1). */
export const ACCENT_PRIMARY = "#26C2D1"

export const CHART_FILL_SEQUENCE = [
  "#26C2D1",
  "#5DD4DE",
  "#1FA3B0",
  "#7FEAF3",
  "#B3F6FC",
  "#0D7480",
  "#94A3B8",
] as const

export function chartColor(index: number): string {
  return CHART_FILL_SEQUENCE[index % CHART_FILL_SEQUENCE.length] ?? ACCENT_PRIMARY
}

/** Séries empilhadas por nível de prioridade — tons distintos. */
export const PRIORITY_SERIES_COLORS: Record<
  "critico" | "elevado" | "moderado" | "acompanhar",
  string
> = {
  critico: "#F87171",
  elevado: "#FBBF24",
  moderado: "#26C2D1",
  acompanhar: "#64748B",
}
