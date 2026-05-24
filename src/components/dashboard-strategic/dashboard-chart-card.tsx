import type { ReactNode } from "react"

export function StrategicChartCard(
  props: Readonly<{ title: string; subtitle?: string; children: ReactNode }>
) {
  const { title, subtitle, children } = props
  return (
    <section className="flex min-h-[280px] flex-col rounded-2xl border border-white/[0.06] bg-[#242424] p-4 shadow-sm ring-1 ring-white/[0.04] sm:min-h-[300px] sm:p-5">
      <div className="mb-3 shrink-0">
        <h2 className="text-sm font-semibold tracking-wide text-white/95">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] leading-snug text-white/55">{subtitle}</p> : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </section>
  )
}

export function StrategicChartEmpty(props: Readonly<{ message: string }>) {
  return (
    <div className="flex h-[220px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#121212]/40 px-4 text-center text-sm text-white/60">
      {props.message}
    </div>
  )
}
