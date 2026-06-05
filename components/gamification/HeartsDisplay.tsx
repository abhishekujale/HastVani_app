'use client';

import { Heart } from 'lucide-react';
import { SCHOOL_THEME } from '@/lib/schoolTheme';

interface HeartsDisplayProps {
  hearts: number;
  maxHearts: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeMap = {
  sm: { icon: 'h-4 w-4', gap: 'gap-0.5' },
  md: { icon: 'h-5 w-5', gap: 'gap-1' },
  lg: { icon: 'h-6 w-6', gap: 'gap-1.5' },
};

export function HeartsDisplay({
  hearts,
  maxHearts,
  size = 'md',
  showLabel = false,
}: HeartsDisplayProps) {
  const s = sizeMap[size];
  const filled = Math.max(0, Math.min(hearts, maxHearts));

  return (
    <div>
      {showLabel && (
        <p className={`text-xs font-medium mb-1.5 ${SCHOOL_THEME.compassion.text}`}>
          Hearts
        </p>
      )}
      <div className={`flex flex-wrap ${s.gap}`} aria-label={`${filled} of ${maxHearts} hearts`}>
        {Array.from({ length: maxHearts }).map((_, i) => {
          const active = i < filled;
          return (
            <Heart
              key={i}
              className={`${s.icon} transition-colors ${
                active
                  ? `${SCHOOL_THEME.compassion.icon} fill-rose-500 dark:fill-rose-400`
                  : 'text-gray-300 dark:text-gray-600'
              }`}
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}
