"use client"

import { Moon } from "lucide-react"
import { useTheme } from "next-themes"

import { useIsClient } from "@/hooks/use-is-client"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useIsClient()
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={
        mounted
          ? isDark
            ? "Ativar tema claro"
            : "Ativar tema escuro"
          : "Alternar tema"
      }
      disabled={!mounted}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border border-border bg-muted/90 p-1 shadow-inner transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70",
        isDark &&
          "border-primary/35 bg-primary/15 dark:border-primary/40 dark:bg-primary/25"
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-border transition-transform duration-200 ease-out will-change-transform",
          isDark ? "translate-x-6 text-primary" : "translate-x-0"
        )}
      >
        <Moon className="size-3.5 stroke-[2.25]" />
      </span>
    </button>
  )
}
