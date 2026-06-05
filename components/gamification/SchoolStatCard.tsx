'use client';

import type { LucideIcon } from 'lucide-react';
import { SCHOOL_MEANINGS, SCHOOL_THEME, type SchoolSemantic } from '@/lib/schoolTheme';

const semanticStyles: Record<
  SchoolSemantic,
  { card: string; iconWrap: string; icon: string; value: string }
> = {
  growth: {
    card: `${SCHOOL_THEME.growth.bg} ${SCHOOL_THEME.growth.border} border`,
    iconWrap: 'bg-primary-100 dark:bg-primary-900/40',
    icon: SCHOOL_THEME.growth.icon,
    value: SCHOOL_THEME.growth.text,
  },
  knowledge: {
    card: `${SCHOOL_THEME.knowledge.bg} ${SCHOOL_THEME.knowledge.border} border`,
    iconWrap: 'bg-sky-100 dark:bg-sky-900/40',
    icon: SCHOOL_THEME.knowledge.icon,
    value: SCHOOL_THEME.knowledge.text,
  },
  milestone: {
    card: `${SCHOOL_THEME.milestone.bg} ${SCHOOL_THEME.milestone.border} border`,
    iconWrap: 'bg-amber-100 dark:bg-amber-900/40',
    icon: SCHOOL_THEME.milestone.icon,
    value: SCHOOL_THEME.milestone.text,
  },
  compassion: {
    card: `${SCHOOL_THEME.compassion.bg} ${SCHOOL_THEME.compassion.border} border`,
    iconWrap: 'bg-rose-100 dark:bg-rose-900/40',
    icon: SCHOOL_THEME.compassion.icon,
    value: SCHOOL_THEME.compassion.text,
  },
  scholar: {
    card: `${SCHOOL_THEME.scholar.bg} ${SCHOOL_THEME.scholar.border} border`,
    iconWrap: 'bg-gray-100 dark:bg-gray-800',
    icon: SCHOOL_THEME.scholar.muted,
    value: SCHOOL_THEME.scholar.text,
  },
};

interface SchoolStatCardProps {
  semantic: SchoolSemantic;
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  /** Hero gradient card (streak/gems row) */
  hero?: boolean;
  title?: string;
}

export function SchoolStatCard({
  semantic,
  label,
  value,
  sub,
  icon: Icon,
  hero = false,
  title,
}: SchoolStatCardProps) {
  const styles = semanticStyles[semantic];
  const meaning = SCHOOL_MEANINGS[semantic];

  if (hero) {
    const gradient =
      semantic === 'milestone'
        ? SCHOOL_THEME.milestone.gradient
        : semantic === 'knowledge'
          ? SCHOOL_THEME.knowledge.gradient
          : SCHOOL_THEME.growth.gradientSoft;

    return (
      <div
        className={`rounded-2xl p-4 text-white shadow-lg ${gradient}`}
        title={meaning}
      >
        <Icon className="h-6 w-6 mb-2 opacity-90" aria-hidden />
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-xs opacity-85 mt-0.5">{title ?? label}</div>
        {sub && <p className="text-[10px] opacity-70 mt-1">{sub}</p>}
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 ${styles.card}`} title={meaning}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles.iconWrap}`}>
          <Icon className={`h-4 w-4 ${styles.icon}`} aria-hidden />
        </div>
        <span className={`text-xs font-medium ${SCHOOL_THEME.scholar.muted}`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${styles.value}`}>{value}</div>
      {sub && <p className={`text-xs mt-0.5 ${SCHOOL_THEME.scholar.muted}`}>{sub}</p>}
    </div>
  );
}
