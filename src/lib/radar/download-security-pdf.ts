import { jsPDF } from "jspdf"

import type { RadarChatUIMessage } from "@/types/radar-chat-ui"

/** Indicadores de demonstração — não refletem estatísticas oficiais. */
const MOCK_RJ_INDICATORS = [
  { label: "Homicídios dolosos (simulado / 30 dias)", value: "87" },
  { label: "Letalidade violenta (simulado)", value: "112" },
  { label: "Roubos de rua (simulado / 30 dias)", value: "3.420" },
  { label: "Furtos de veículos (simulado / 30 dias)", value: "1.905" },
  { label: "CVLI — notificação (simulado)", value: "64" },
] as const

const LINE_HEIGHT = 16
const MARGIN = 48
const PAGE_BOTTOM = 780

function nextLine(
  doc: jsPDF,
  y: number,
  text: string,
  maxWidth: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth)
  let cursor = y
  for (const line of lines) {
    if (cursor > PAGE_BOTTOM) {
      doc.addPage()
      cursor = MARGIN
    }
    doc.text(line, MARGIN, cursor)
    cursor += LINE_HEIGHT
  }
  return cursor
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage()
    return MARGIN
  }
  return y
}

/**
 * Gera e descarrega um PDF com indicadores mock e o extrato actual da conversa.
 * Cada chamada reflecte o estado actual de `messages`.
 */
export function downloadRadarSecurityPdf(messages: readonly RadarChatUIMessage[]): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - MARGIN * 2

  let y = MARGIN

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("CoPatrulha — Radar Rio", MARGIN, y)
  y += LINE_HEIGHT * 1.4

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  y = nextLine(
    doc,
    y,
    "Situação de segurança do Estado do Rio de Janeiro (síntese demonstrativa). " +
      "Os números abaixo são fictícios e não substituem boletins oficiais da polícia ou do IBGE.",
    maxW,
  )
  y += 8

  const generated = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  })
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  y = nextLine(doc, y, `Documento gerado em: ${generated}`, maxW)
  doc.setTextColor(0, 0, 0)
  y += 12

  y = ensureSpace(doc, y, 40)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("1. Indicadores simulados (RJ)", MARGIN, y)
  y += LINE_HEIGHT * 1.2

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  for (const row of MOCK_RJ_INDICATORS) {
    y = ensureSpace(doc, y, LINE_HEIGHT * 2)
    const line = `• ${row.label}: ${row.value}`
    y = nextLine(doc, y, line, maxW)
  }

  y += 16
  y = ensureSpace(doc, y, 60)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("2. Extrato da conversa com o assistente", MARGIN, y)
  y += LINE_HEIGHT * 1.2

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  if (messages.length === 0) {
    y = nextLine(
      doc,
      y,
      "Ainda não há mensagens registadas nesta sessão. Volte a gerar o PDF depois de conversar com o assistente para incluir o contexto da análise.",
      maxW,
    )
  } else {
    for (const m of messages) {
      const header = m.role === "user" ? "Utilizador:" : "Assistente:"
      y = ensureSpace(doc, y, LINE_HEIGHT * 3)
      doc.setFont("helvetica", "bold")
      y = nextLine(doc, y, header, maxW)
      doc.setFont("helvetica", "normal")
      y = nextLine(doc, y, m.content.trim() || "(vazio)", maxW)
      y += 6
    }
  }

  y += 20
  y = ensureSpace(doc, y, 50)
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  y = nextLine(
    doc,
    y,
    "Aviso legal: este ficheiro é produzido automaticamente pela aplicação para fins de demonstração. " +
      "Não deve ser usado para decisões operacionais ou políticas públicas sem validação de fontes oficiais.",
    maxW,
  )

  const safeStamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  doc.save(`relatorio-seguranca-rj-${safeStamp}.pdf`)
}
