/**
 * School semantic color system — aligned with class/teacher UI (slate + primary emerald).
 *
 * Meaning:
 * - growth (emerald): learning progress, XP, lessons — "every sign helps you grow"
 * - knowledge (sky): gems, resources, classroom structure — "tools for the journey"
 * - milestone (amber): streaks, achievements, daily goals — "consistent practice"
 * - compassion (rose): hearts, resilience — "learn safely, try again"
 * - scholar (slate): neutral halls, cards, text — "shared school space"
 */

export const SCHOOL_MEANINGS = {
  growth: 'Learning progress and XP — each lesson builds inclusive communication skills.',
  knowledge: 'Gems and resources — rewards earned for dedication in the classroom.',
  milestone: 'Streaks and goals — daily practice habits, like showing up to school.',
  compassion: 'Hearts — room to learn from mistakes without giving up.',
  scholar: 'Classroom foundation — calm, focused space for teachers and students.',
} as const;

export const SCHOOL_THEME = {
  canvas: 'bg-slate-50 dark:bg-gray-900',
  surface:
    'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700',
  surfaceHover:
    'hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all',

  growth: {
    text: 'text-primary-700 dark:text-primary-400',
    textMuted: 'text-primary-600/80 dark:text-primary-300/80',
    bg: 'bg-primary-50 dark:bg-primary-900/25',
    bgSolid: 'bg-primary-600',
    border: 'border-primary-200 dark:border-primary-800',
    gradient: 'bg-gradient-to-br from-primary-500 to-primary-700',
    gradientSoft: 'bg-gradient-to-br from-primary-400/90 to-emerald-600/90',
    ring: 'ring-primary-400/40',
    icon: 'text-primary-600 dark:text-primary-400',
  },

  knowledge: {
    text: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800',
    gradient: 'bg-gradient-to-br from-sky-500 to-sky-700',
    icon: 'text-sky-600 dark:text-sky-400',
  },

  milestone: {
    text: 'text-amber-800 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/35',
    border: 'border-amber-200 dark:border-amber-800',
    gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    icon: 'text-amber-600 dark:text-amber-400',
  },

  compassion: {
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/35',
    border: 'border-rose-200 dark:border-rose-800',
    gradient: 'bg-gradient-to-br from-rose-500 to-rose-700',
    icon: 'text-rose-600 dark:text-rose-400',
  },

  scholar: {
    text: 'text-gray-700 dark:text-gray-200',
    muted: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-700',
  },

  success: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },

  accent: {
    /** Bulk / secondary actions — matches class bulk-enroll button */
    text: 'text-violet-700 dark:text-violet-300',
    bgSolid: 'bg-violet-600 hover:bg-violet-700',
    bgSoft: 'bg-violet-50 dark:bg-violet-900/25',
  },
} as const;

export type SchoolSemantic = keyof typeof SCHOOL_MEANINGS;
