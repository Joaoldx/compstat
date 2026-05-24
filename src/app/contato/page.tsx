import type { Metadata } from "next"

import { ContactForm } from "./contact-form"

export const metadata: Metadata = {
  title: "Contato | CoPatrulha",
  description:
    "Entre em contato com o CoPatrulha através do formulário nesta página.",
}

export default function ContatoPage() {
  return (
    <section className="flex flex-1 flex-col px-4 py-4 md:py-6">
      <header className="mx-auto mb-6 w-full max-w-lg">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Contato
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Preencha os campos abaixo e envie sua mensagem. O e-mail será
          direcionado para a equipe do CoPatrulha.
        </p>
      </header>

      <div className="mx-auto w-full max-w-lg pb-8">
        <ContactForm />
      </div>
    </section>
  )
}
