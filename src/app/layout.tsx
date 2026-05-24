import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { SiteHeader } from "@/components/layout/site-header"
import { AppProviders } from "@/components/providers"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "CoPatrulha",
  description:
    "Protótipo de inteligência criminal para o Rio: mapas territoriais, Radar com assistente analista e relatórios de apoio à decisão.",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
}

const interHeading = Inter({
  subsets: ["latin"],
  variable: "--font-heading",
})

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        interHeading.variable
      )}
    >
      <body>
        <AppProviders>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex flex-1 flex-col">{children}</main>
          </div>
        </AppProviders>
      </body>
    </html>
  )
}
