"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { MAIN_NAV_ITEMS } from "@/config/navigation"
import { cn } from "@/lib/utils"

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <ul className={cn("flex flex-wrap items-center gap-1", className)}>
      {MAIN_NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href)

        return (
          <li key={item.href}>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={active ? "bg-muted font-medium" : undefined}
            >
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
