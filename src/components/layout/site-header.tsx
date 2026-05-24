import Link from "next/link"

import { NavLinks } from "@/components/layout/nav-links"
import { ThemeToggle } from "@/components/theme"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <div className="container grid h-14 max-w-screen-2xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
        <Link
          href="/"
          className="justify-self-start font-heading text-lg font-semibold tracking-tight text-foreground"
        >
          CoPatrulha
        </Link>
        <nav aria-label="Navegação principal" className="justify-self-center">
          <NavLinks />
        </nav>
        <div className="justify-self-end">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
