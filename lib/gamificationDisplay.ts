import { GAMIFICATION_CONFIG } from './config';
import type { UserStats } from '@/types';

/** Resolved stats: API values first, then platform config — never arbitrary UI literals. */
export interface ResolvedGamificationStats {
  xp: number;
  level: number;
  xpForNextLevel: number;
  xpProgressPercent: number;
  streak: number;
  longestStreak: number;
  hearts: number;
  maxHearts: number;
  gems: number;
  dailyXp: number;
  dailyGoal: number;
  dailyGoalPercent: number;
  dailyGoalMet: boolean;
  completedLessonsCount: number;
  achievementsCount: number;
  streakFreezeAvailable: boolean;
}

export function resolveGamificationStats(
  stats: UserStats | null | undefined
): ResolvedGamificationStats {
  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const xpForNextLevel =
    stats?.xpForNextLevel ??
    (GAMIFICATION_CONFIG.LEVEL_THRESHOLDS[level] ??
      GAMIFICATION_CONFIG.LEVEL_THRESHOLDS[1] ??
      100);
  const xpProgressPercent =
    stats?.xpProgress ??
    (xpForNextLevel > 0 ? Math.min((xp / xpForNextLevel) * 100, 100) : 0);

  const maxHearts = stats?.maxHearts ?? GAMIFICATION_CONFIG.MAX_HEARTS;
  const dailyGoal = stats?.dailyGoal ?? GAMIFICATION_CONFIG.DAILY_GOAL_XP;
  const dailyXp = stats?.dailyXp ?? 0;

  return {
    xp,
    level,
    xpForNextLevel,
    xpProgressPercent,
    streak: stats?.streak ?? 0,
    longestStreak: stats?.longestStreak ?? 0,
    hearts: stats?.hearts ?? maxHearts,
    maxHearts,
    gems: stats?.gems ?? 0,
    dailyXp,
    dailyGoal,
    dailyGoalPercent: dailyGoal > 0 ? Math.min((dailyXp / dailyGoal) * 100, 100) : 0,
    dailyGoalMet: stats?.dailyGoalMet ?? dailyXp >= dailyGoal,
    completedLessonsCount: stats?.completedLessonsCount ?? 0,
    achievementsCount: stats?.achievementsCount ?? 0,
    streakFreezeAvailable: stats?.streakFreezeAvailable ?? false,
  };
}

export function formatRewardValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString();
}

export function hasReward(value: number | null | undefined): value is number {
  return typeof value === 'number' && value > 0;
}

/** Question points from API, else platform default (not a UI-only literal). */
export function getQuestionPoints(points: number | null | undefined): number {
  if (typeof points === 'number' && points > 0) return points;
  return GAMIFICATION_CONFIG.QUESTION_POINTS_DEFAULT;
}
