"use client"

/**
 * Concentra wrappers que obrigam a um Client Component (`"use client"`).
 * Mantém `app/layout.tsx` como Server Component; só esta árvore corre no cliente.
 *
 * Por agora: tema claro/escuro via classe `dark` em `<html>` (next-themes).
 */
import * as React from "react"
import { ThemeProvider } from "next-themes"

type AppProvidersProps = {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  )
}
