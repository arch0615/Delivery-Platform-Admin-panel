import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names, with later Tailwind utilities winning over
 * earlier conflicting ones. Lets a caller pass `className` to override a
 * component's defaults without specificity fights.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
