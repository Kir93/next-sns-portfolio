import type { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
}

/** Renders a lucide-react icon as decorative (aria-hidden) by default. */
export default function Icon({ icon: LucideGlyph, size = 18, className }: IconProps) {
  return <LucideGlyph aria-hidden size={size} className={className} />;
}
