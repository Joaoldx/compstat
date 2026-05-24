"use client"

import { useSyncExternalStore } from "react"

/** Subscreve `classList` em `<html>` — alinha com ThemeProvider (`attribute="class"`). */
function subscribeHtmlClass(listener: () => void) {
  const el = document.documentElement
  const mo = new MutationObserver(listener)
  mo.observe(el, { attributes: true, attributeFilter: ["class"] })
  return () => mo.disconnect()
}

function getHtmlHasDarkSnapshot() {
  return document.documentElement.classList.contains("dark")
}

/** `true` quando `html.dark` está ativo — útil se `resolvedTheme` ainda não estiver pronto no cliente. */
export function useHtmlHasDarkClass() {
  return useSyncExternalStore(
    subscribeHtmlClass,
    getHtmlHasDarkSnapshot,
    () => false
  )
}
