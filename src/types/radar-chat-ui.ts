/** Mensagens da UI do Radar (cliente apenas). */
export type VisibleChatRole = "user" | "assistant"

export type RadarChatUIMessage = Readonly<{
  id: string
  role: VisibleChatRole
  content: string
}>
