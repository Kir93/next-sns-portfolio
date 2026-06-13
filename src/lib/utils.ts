import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names (clsx) and de-duplicate Tailwind utilities (tailwind-merge).
 * shadcn-standard helper shared across the app.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
