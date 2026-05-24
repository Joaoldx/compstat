/**
 * Heurística pela URL do estilo MapLibre: define se convém tratamento típico de “fundos claros da cartografia”.
 * Serve para espessura/contorno dos polígonos Radar e filtros opcionais no canvas (tema `.dark`).
 */
export function basemapUsesDarkInk(styleUrl: string): boolean {
  const u = styleUrl.toLowerCase()

  const looksLightBasemap =
    u.includes("positron") ||
    u.includes("voyager") ||
    u.includes("/styles/liberty") ||
    u.includes("/styles/bright") ||
    u.includes("/styles/atlas") ||
    u.includes("demotiles") ||
    u.includes("demotiler")

  if (looksLightBasemap) return false

  return (
    u.includes("darkmatter") ||
    u.includes("dark-matter") ||
    u.includes("/styles/dark") ||
    u.includes("fiord")
  )
}
