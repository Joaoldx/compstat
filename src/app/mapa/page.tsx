import { MapaInteractive } from "./mapa-interactive"

export default function MapaPage() {
  return (
    <section className="flex flex-1 flex-col px-4 py-4 md:py-6">
      <header className="mb-4 max-w-screen-2xl">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Domínios territoriais
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Passe o cursor sobre os polígonos para ver o território e a organização
          criminosa (OCRIM).
        </p>
      </header>
      <div className="bg-card relative w-full overflow-hidden rounded-lg border shadow-sm">
        <MapaInteractive />
      </div>
    </section>
  )
}
