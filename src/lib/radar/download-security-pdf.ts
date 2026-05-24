import { jsPDF } from "jspdf"

import {
  pdfDemonstrationDisclaimerParagraph,
  pdfEnsureSpace,
  pdfGeneratedAtPtBr,
  pdfNextLine,
  pdfSafeFilenameStamp,
  PDF_LINE_PT,
  PDF_MARGIN_PT,
} from "@/lib/radar/pdf-layout"
import type { RadarChatUIMessage } from "@/types/radar-chat-ui"

export type RadarAssistantPdfOptions = Readonly<{
  messages: readonly RadarChatUIMessage[]
  /** Fragmento opcional devolvido por chamada ao `/api/chat` para síntese em marcadores. */
  executiveBulletsMarkdown?: string | null
}>

/** PDF só da conversa com o assistente (síntese opcional sobre o próprio transcript). */
export function downloadRadarAssistantReportPdf(options: RadarAssistantPdfOptions): void {
  const { messages, executiveBulletsMarkdown } = options

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - PDF_MARGIN_PT * 2

  let y = PDF_MARGIN_PT

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("CoPatrulha — Relatório do assistente (Radar Rio)", PDF_MARGIN_PT, y)
  y += PDF_LINE_PT * 1.4

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  y = pdfNextLine(
    doc,
    y,
    "Documento centrado na conversa com o analista automatizado nesta sessão. " +
      "Se existir síntese executiva, resulta de um pedido adicional ao mesmo modelo apenas para esta exportação.",
    maxW,
  )
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  y = pdfNextLine(doc, y, `Documento gerado em: ${pdfGeneratedAtPtBr()}`, maxW)
  doc.setTextColor(0, 0, 0)
  y += 12

  const summary = executiveBulletsMarkdown?.trim()
  let sectionIdx = 1

  if (summary && summary.length > 0) {
    y = pdfEnsureSpace(doc, y, 50)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.text(
      `${sectionIdx}. Síntese executiva solicitada ao assistente para este PDF`,
      PDF_MARGIN_PT,
      y,
    )
    sectionIdx += 1
    y += PDF_LINE_PT * 1.2

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    y = pdfNextLine(doc, y, summary, maxW)
    y += 16
  }

  y = pdfEnsureSpace(doc, y, 60)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(`${sectionIdx}. Extrato integral da conversa`, PDF_MARGIN_PT, y)
  y += PDF_LINE_PT * 1.2

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  if (messages.length === 0) {
    y = pdfNextLine(
      doc,
      y,
      "Ainda não há mensagens nesta sessão. Exporte novamente depois da conversa para incluir o contexto textual.",
      maxW,
    )
  } else {
    for (const m of messages) {
      const header = m.role === "user" ? "Usuário:" : "Assistente:"
      y = pdfEnsureSpace(doc, y, PDF_LINE_PT * 3)
      doc.setFont("helvetica", "bold")
      y = pdfNextLine(doc, y, header, maxW)
      doc.setFont("helvetica", "normal")
      y = pdfNextLine(doc, y, m.content.trim() || "(vazio)", maxW)
      y += 6
    }
  }

  y += 20
  y = pdfEnsureSpace(doc, y, 50)
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  y = pdfNextLine(doc, y, pdfDemonstrationDisclaimerParagraph(), maxW)

  doc.save(`relatorio-assistente-radar-${pdfSafeFilenameStamp()}.pdf`)
}
