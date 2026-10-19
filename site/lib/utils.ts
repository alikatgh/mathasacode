import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Shared class composition for the locally owned ReUI components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
