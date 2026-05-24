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
      <div className="container flex h-14 max-w-screen-2xl items-center gap-8 px-4">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight text-foreground"
        >
          Compstat
        </Link>
        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
          <ThemeToggle />
          <nav aria-label="Navegação principal">
            <NavLinks />
          </nav>
        </div>
      </div>
    </header>
  )
}
