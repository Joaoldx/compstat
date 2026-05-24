declare module "wellknown" {
  export default function parse(
    input: string
  ):
    | { type: string; coordinates: unknown; crs?: unknown }
    | Record<string, unknown>
    | null
}
