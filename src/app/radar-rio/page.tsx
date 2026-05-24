import { redirect } from "next/navigation"

/** Mantido por compatibilidade de URL; página canónica é `/radar`. */
export default function RadarRioRedirectPage() {
  redirect("/radar")
}
