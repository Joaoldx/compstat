"use client"

import { X } from "lucide-react"
import { Dialog } from "radix-ui"

import { ChatbotDemoPanel } from "@/components/radar-rio/chatbot-demo-panel"

type RadarAssistantSheetProps = Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>

/** Assistência analista como cartão fixo próximo ao canto inferior direito — Radix Dialog (overlay fecha ao clicar, Escape fecha). */
export function RadarAssistantSheet({ open, onOpenChange }: RadarAssistantSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[45] bg-zinc-950/55 backdrop-blur-[2px] dark:bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          data-slot="dialog-content"
          className={[
            "fixed z-[55] flex max-h-[min(560px,calc(100dvh-7rem-env(safe-area-inset-bottom,0px)))] flex-col overflow-hidden rounded-2xl border border-zinc-600/55 bg-zinc-900 shadow-2xl ring-1 ring-white/10 outline-none",
            "left-4 right-4 max-w-none",
            // Desktop — largura estável âncora à direita
            "sm:left-auto sm:right-6 sm:w-full md:right-10 sm:max-w-md sm:max-h-[min(580px,calc(100dvh-8rem-env(safe-area-inset-bottom,0px)))]",
            "bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+6rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+6.25rem)]",
            "sm:right-6 md:right-10",
          ].join(" ")}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">
            Assistente analista Radar (CoPatrulha)
          </Dialog.Title>

          <Dialog.Close
            type="button"
            aria-label="Fechar painel do assistente"
            className="text-zinc-400 hover:bg-white/10 hover:text-zinc-100 absolute top-3 right-3 z-10 rounded-lg p-2 transition-colors"
          >
            <X className="size-5" aria-hidden />
          </Dialog.Close>

          <ChatbotDemoPanel className="min-h-0 flex-1" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
