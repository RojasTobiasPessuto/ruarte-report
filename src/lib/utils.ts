import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea el nombre de un tag de ángulo para mostrarlo en UI.
 * Soporta los prefijos legacy "angulo_" y el nuevo "Ang"/"Ang_".
 * Ejemplos:
 *   "angulo_inversion" → "inversion"
 *   "AngInversion"     → "Inversion"
 *   "Ang_Trading"      → "Trading"
 *   "Ang Scalping"     → "Scalping"
 */
export function formatAngleTag(tag: string): string {
  return tag.replace(/^(angulo_|ang[_\s]*)/i, '')
}
