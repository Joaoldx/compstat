/** Opções partilhadas entre o formulário no cliente e a validação na API. */

export type ContactMotiveCode =
  | "duvida"
  | "parceria"
  | "sugestao"
  | "imprensa"
  | "outro"

export type ContactMotiveOption = Readonly<
  Record<ContactMotiveCode, string>
>

const CONTACT_MOTIVE_LABELS = {
  duvida: "Dúvidas sobre o projeto",
  parceria: "Parcerias",
  sugestao: "Sugestões",
  imprensa: "Imprensa / mídia",
  outro: "Outro",
} satisfies ContactMotiveOption

export const CONTACT_MOTIVE_CODES = Object.keys(
  CONTACT_MOTIVE_LABELS
) as ContactMotiveCode[]

export function isContactMotiveCode(value: unknown): value is ContactMotiveCode {
  return (
    typeof value === "string" &&
    CONTACT_MOTIVE_CODES.includes(value as ContactMotiveCode)
  )
}

/** Rótulos para o campo <select>; o primeiro valor vazio obriga uma escolha explícita. */
export function getContactMotiveSelectOptions(): {
  value: "" | ContactMotiveCode
  label: string
  disabled?: boolean
}[] {
  return [
    {
      value: "",
      label: "Selecione o motivo…",
      disabled: true,
    },
    ...CONTACT_MOTIVE_CODES.map((code) => ({
      value: code as ContactMotiveCode,
      label: CONTACT_MOTIVE_LABELS[code],
    })),
  ]
}

export function getContactMotiveLabel(code: string): string {
  if (isContactMotiveCode(code)) {
    return CONTACT_MOTIVE_LABELS[code]
  }
  return code
}
