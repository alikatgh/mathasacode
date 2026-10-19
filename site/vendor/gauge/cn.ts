/** Local adapter for the upstream shadcn class-name helper. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ")
}
