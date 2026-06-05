'use client';

import { Gem, Star, Zap } from 'lucide-react';
import { formatRewardValue, hasReward } from '@/lib/gamificationDisplay';
import { SCHOOL_THEME } from '@/lib/schoolTheme';

interface RewardChipsProps {
  xp?: number | null;
  gems?: number | null;
  points?: number | null;
  layout?: 'row' | 'stack';
}

export function RewardChips({ xp, gems, points, layout = 'row' }: RewardChipsProps) {
  const items = [
    hasReward(xp) && {
      key: 'xp',
      icon: Star,
      label: 'XP',
      value: formatRewardValue(xp),
      className: `${SCHOOL_THEME.growth.bg} ${SCHOOL_THEME.growth.text} ${SCHOOL_THEME.growth.border} border`,
      iconClass: SCHOOL_THEME.growth.icon,
    },
    hasReward(gems) && {
      key: 'gems',
      icon: Gem,
      label: 'Gems',
      value: formatRewardValue(gems),
      className: `${SCHOOL_THEME.knowledge.bg} ${SCHOOL_THEME.knowledge.text} ${SCHOOL_THEME.knowledge.border} border`,
      iconClass: SCHOOL_THEME.knowledge.icon,
    },
    hasReward(points) && {
      key: 'points',
      icon: Zap,
      label: 'Points',
      value: formatRewardValue(points),
      className: `${SCHOOL_THEME.milestone.bg} ${SCHOOL_THEME.milestone.text} ${SCHOOL_THEME.milestone.border} border`,
      iconClass: SCHOOL_THEME.milestone.icon,
    },
  ].filter(Boolean) as Array<{
    key: string;
    icon: typeof Star;
    label: string;
    value: string;
    className: string;
    iconClass: string;
  }>;

  if (items.length === 0) {
    return (
      <span className={`text-sm ${SCHOOL_THEME.scholar.muted}`}>No rewards configured</span>
    );
  }

  return (
    <div className={layout === 'row' ? 'flex flex-wrap gap-2' : 'space-y-2'}>
      {items.map(({ key, icon: Icon, label, value, className, iconClass }) => (
        <div
          key={key}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${className}`}
        >
          <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden />
          <span>+{value}</span>
          <span className="font-normal opacity-80">{label}</span>
        </div>
      ))}
    </div>
  );
}
