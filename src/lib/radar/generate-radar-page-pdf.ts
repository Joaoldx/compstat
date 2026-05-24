import { jsPDF } from "jspdf"

import type {
  RadarFilterCatalog,
  RadarTerritoryFiltersState,
} from "@/lib/radar/radar-territory-filter"
import {
  pdfDemonstrationDisclaimerParagraph,
  pdfEnsureSpace,
  pdfGeneratedAtPtBr,
  pdfNextLine,
  pdfSafeFilenameStamp,
  PDF_LINE_PT,
  PDF_MARGIN_PT,
} from "@/lib/radar/pdf-layout"
import type { RadarTerritoryPdfDigest } from "@/lib/radar/build-radar-territory-pdf-digest"
import type { RadarCrimeSeverity } from "@/lib/radar/load-radar-rj-crossed"

const NIVEL_PT: Record<string, string> = {
  critico: "Crítico",
  elevado: "Elevado",
  moderado: "Moderado",
  acompanhar: "Baixa / acompanhar",
}

function describeFilters(
  filters: RadarTerritoryFiltersState,
  catalog: RadarFilterCatalog | null,
): string[] {
  const anos =
    catalog && catalog.hasDistribuicaoPorAno
      ? `Anos (${filters.anoMin}–${filters.anoMax})`
      : "Anos (sem distribuição por ano na fonte — faixa só aplicável quando há JSON por ano)"

  const niveis =
    filters.niveis.length === 0
      ? "Gravidades: (nenhum nível selecionado — mapa sem polígonos)"
      : `Gravidades: ${filters.niveis.map((n) => NIVEL_PT[n] ?? n).join(", ")}`

  const txt = filters.textoTerritorio.trim()
  const texto = txt.length > 0 ? `Texto territorial: "${txt}"` : "Texto territorial: (vazio)"

  const dominio =
    filters.dominioOrcrim.trim().length > 0
      ? `Domínio OCRIM: "${filters.dominioOrcrim.trim()}"`
      : catalog && !catalog.hasDominioOrcrimColumn
        ? "Domínio OCRIM: (coluna ausente nos dados)"
        : "Domínio OCRIM: (todos)"

  let delito = "Tipo / delito: (todos)"
  const cod = filters.delitoSeleccionCod.trim()
  if (cod.length > 0 && catalog?.delitos) {
    const row = catalog.delitos.find((d) => d.cod === cod)
    delito =
      row && row.cod !== cod
        ? `Tipo / delito: ${row.desc} (${cod})`
        : `Tipo / delito: ${cod}`
  } else if (cod.length > 0) {
    delito = `Tipo / delito: ${cod}`
  }

  return [anos, niveis, texto, dominio, delito]
}

export type RadarPagePdfInput = Readonly<{
  filters: RadarTerritoryFiltersState
  catalog: RadarFilterCatalog | null
  territoryDigest: RadarTerritoryPdfDigest | null
}>

/** PDF do contexto do mapa Radar (filtros + territórios visíveis) — não inclui conversa do assistente. */
export function downloadRadarPagePdf(input: RadarPagePdfInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - PDF_MARGIN_PT * 2

  let y = PDF_MARGIN_PT

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("CoPatrulha — Relatório do Radar Rio (mapa)", PDF_MARGIN_PT, y)
  y += PDF_LINE_PT * 1.4

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  y = pdfNextLine(
    doc,
    y,
    "Sumário correspondente aos filtros atuais e aos polígonos visíveis no mapa neste momento. " +
      "Os totais por território vêm das propriedades do CSV cruzado quando o modo é territorial.",
    maxW,
  )
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  y = pdfNextLine(doc, y, `Documento gerado em: ${pdfGeneratedAtPtBr()}`, maxW)
  doc.setTextColor(0, 0, 0)
  y += 12

  y = pdfEnsureSpace(doc, y, 40)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("1. Filtros aplicados", PDF_MARGIN_PT, y)
  y += PDF_LINE_PT * 1.2

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  for (const line of describeFilters(input.filters, input.catalog)) {
    y = pdfEnsureSpace(doc, y, PDF_LINE_PT * 2)
    y = pdfNextLine(doc, y, `• ${line}`, maxW)
  }

  y += 16
  y = pdfEnsureSpace(doc, y, 60)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("2. Territórios visíveis e contagens agregadas", PDF_MARGIN_PT, y)
  y += PDF_LINE_PT * 1.2

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  if (!input.territoryDigest) {
    y = pdfNextLine(
      doc,
      y,
      "Os dados do mapa ainda não estão disponíveis para sumarização (carregamento em curso ou mapa indisponível).",
      maxW,
    )
  } else {
    const d = input.territoryDigest
    const modo =
      d.dataMode === "demo"
        ? "Modo demonstração (grade ilustrativa — não oficial)."
        : "Modo territorial (polígonos OCRIM × registros no CSV cruzado)."

    y = pdfNextLine(
      doc,
      y,
      `${modo} Polígonos visíveis: ${d.featuresVisible} de ${d.featuresTotal}. Soma das ocorrências (propriedade do polígono): ${d.sumOcorrenciasVisiveis}.`,
      maxW,
    )
    y += 10

    y = pdfEnsureSpace(doc, y, PDF_LINE_PT * 3)
    doc.setFont("helvetica", "bold")
    y = pdfNextLine(doc, y, "Distribuição por gravidade (contagem de polígonos visíveis):", maxW)
    doc.setFont("helvetica", "normal")

    const ordem: readonly RadarCrimeSeverity[] = [
      "critico",
      "elevado",
      "moderado",
      "acompanhar",
    ]
    for (const k of ordem) {
      const label = NIVEL_PT[k] ?? k
      y = pdfNextLine(doc, y, `• ${label}: ${d.byNivel[k]}`, maxW)
    }

    y += 12
    y = pdfEnsureSpace(doc, y, PDF_LINE_PT * 2)
    doc.setFont("helvetica", "bold")
    y = pdfNextLine(doc, y, "Amostra de designações (ordenado, até 45 únicos nesta página):", maxW)
    doc.setFont("helvetica", "normal")

    if (d.territorioLabels.length === 0) {
      y = pdfNextLine(doc, y, "(nenhum território listado nesta amostra)", maxW)
    } else {
      for (const name of d.territorioLabels) {
        y = pdfEnsureSpace(doc, y, PDF_LINE_PT * 1.5)
        y = pdfNextLine(doc, y, `• ${name}`, maxW)
      }
    }

    if (d.territoriosOmitted > 0) {
      y += 8
      y = pdfNextLine(
        doc,
        y,
        `Nota: há mais ${d.territoriosOmitted} nome(s) único(s) além dos listados — limite do relatório.`,
        maxW,
      )
    }
  }

  y += 20
  y = pdfEnsureSpace(doc, y, 50)
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  y = pdfNextLine(doc, y, pdfDemonstrationDisclaimerParagraph(), maxW)

  doc.save(`relatorio-radar-${pdfSafeFilenameStamp()}.pdf`)
}
