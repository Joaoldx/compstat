import type { jsPDF } from "jspdf"

/** Layout compartilhado entre PDFs do Radar — evita acoplar páginas distintas. */
export const PDF_LINE_PT = 16
export const PDF_MARGIN_PT = 48
export const PDF_PAGE_BOTTOM_PT = 780

export function pdfNextLine(
  doc: jsPDF,
  y: number,
  text: string,
  maxWidth: number,
  lineHeight = PDF_LINE_PT,
): number {
  const lines = doc.splitTextToSize(text, maxWidth)
  let cursor = y
  for (const line of lines) {
    if (cursor > PDF_PAGE_BOTTOM_PT) {
      doc.addPage()
      cursor = PDF_MARGIN_PT
    }
    doc.text(line, PDF_MARGIN_PT, cursor)
    cursor += lineHeight
  }
  return cursor
}

export function pdfEnsureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PDF_PAGE_BOTTOM_PT) {
    doc.addPage()
    return PDF_MARGIN_PT
  }
  return y
}

export function pdfSafeFilenameStamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

export function pdfGeneratedAtPtBr(date = new Date()): string {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  })
}

/** Aviso legal curto para rodapés de relatórios automáticos. */
export function pdfDemonstrationDisclaimerParagraph(): string {
  return (
    "Aviso: documento gerado automaticamente pela aplicação para fins de demonstração. " +
      "Não deve ser usado para decisões operacionais ou políticas públicas sem validação de fontes oficiais."
  )
}
