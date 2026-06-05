/**
 * ISL Learning Platform - Frontend Configuration
 * 
 * Centralized configuration for the Next.js frontend application.
 * All configurable values should be defined here and controlled via environment variables.
 */

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const APP_CONFIG = {
  // Application metadata
  NAME: process.env.NEXT_PUBLIC_APP_NAME || 'ISL Learning Platform',
  VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0',
  DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Learn Indian Sign Language',
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const API_CONFIG = {
  // Base URLs
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  ML_BASE_URL: process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000/api/v1/ml',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
  ML_WS_URL: process.env.NEXT_PUBLIC_ML_WS_URL || 'ws://localhost:8000/api/v1/ml',
  
  // Request configuration
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10), // 30 seconds
  RETRY_ATTEMPTS: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3', 10),
  RETRY_DELAY: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000', 10), // 1 second
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const AUTH_CONFIG = {
  // Token storage keys
  ACCESS_TOKEN_KEY: process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY || 'isl_access_token',
  REFRESH_TOKEN_KEY: process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || 'isl_refresh_token',
  USER_KEY: process.env.NEXT_PUBLIC_USER_KEY || 'isl_user',
  
  // Token prefix
  TOKEN_PREFIX: process.env.NEXT_PUBLIC_TOKEN_PREFIX || 'Bearer',
  
  // Session
  SESSION_TIMEOUT_MINUTES: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || '60', 10),
  REMEMBER_ME_DAYS: parseInt(process.env.NEXT_PUBLIC_REMEMBER_ME_DAYS || '30', 10),
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// GAMIFICATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const GAMIFICATION_CONFIG = {
  // Hearts System
  MAX_HEARTS: parseInt(process.env.NEXT_PUBLIC_MAX_HEARTS || '5', 10),
  HEART_REGEN_MINUTES: parseInt(process.env.NEXT_PUBLIC_HEART_REGEN_MINUTES || '240', 10), // 4 hours
  REFILL_HEARTS_GEMS_COST: parseInt(process.env.NEXT_PUBLIC_REFILL_HEARTS_GEMS_COST || '5', 10),
  
  // Streak System
  DAILY_GOAL_XP: parseInt(process.env.NEXT_PUBLIC_DAILY_GOAL_XP || '20', 10),
  STREAK_FREEZE_GEMS_COST: parseInt(process.env.NEXT_PUBLIC_STREAK_FREEZE_GEMS_COST || '10', 10),
  STREAK_FREEZE_MAX: parseInt(process.env.NEXT_PUBLIC_STREAK_FREEZE_MAX || '2', 10),
  
  // XP Rewards
  XP_LESSON_COMPLETE: parseInt(process.env.NEXT_PUBLIC_XP_LESSON_COMPLETE || '10', 10),
  XP_QUIZ_CORRECT: parseInt(process.env.NEXT_PUBLIC_XP_QUIZ_CORRECT || '2', 10),
  XP_GESTURE_RECOGNIZED: parseInt(process.env.NEXT_PUBLIC_XP_GESTURE_RECOGNIZED || '3', 10),
  XP_DAILY_GOAL_MET: parseInt(process.env.NEXT_PUBLIC_XP_DAILY_GOAL_MET || '15', 10),
  XP_STREAK_MAINTAIN: parseInt(process.env.NEXT_PUBLIC_XP_STREAK_MAINTAIN || '5', 10),
  XP_ASSIGNMENT_PERFECT: parseInt(process.env.NEXT_PUBLIC_XP_ASSIGNMENT_PERFECT || '50', 10),

  /** Default quiz question points (matches server lesson question schema) */
  QUESTION_POINTS_DEFAULT: parseInt(process.env.NEXT_PUBLIC_QUESTION_POINTS_DEFAULT || '10', 10),
  
  // Level Thresholds
  LEVEL_THRESHOLDS: [
    0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500,
    10000, 13000, 16500, 20500, 25000, 30000, 35500, 41500, 48000, 55000
  ],
  
  // Leaderboard
  LEADERBOARD_PAGE_SIZE: parseInt(process.env.NEXT_PUBLIC_LEADERBOARD_PAGE_SIZE || '50', 10),
  LEADERBOARD_REFRESH_INTERVAL: parseInt(process.env.NEXT_PUBLIC_LEADERBOARD_REFRESH_INTERVAL || '60000', 10), // 1 minute
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// UI/UX CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const UI_CONFIG = {
  // Toast notifications
  TOAST_DURATION: parseInt(process.env.NEXT_PUBLIC_TOAST_DURATION || '3000', 10),
  TOAST_POSITION: (process.env.NEXT_PUBLIC_TOAST_POSITION || 'top-right') as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  
  // Animations
  ANIMATION_DURATION: parseInt(process.env.NEXT_PUBLIC_ANIMATION_DURATION || '300', 10),
  TRANSITION_DURATION: parseInt(process.env.NEXT_PUBLIC_TRANSITION_DURATION || '200', 10),
  
  // Pagination
  DEFAULT_PAGE_SIZE: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE || '20', 10),
  MAX_PAGE_SIZE: parseInt(process.env.NEXT_PUBLIC_MAX_PAGE_SIZE || '100', 10),
  
  // Modals
  MODAL_ANIMATION_DURATION: parseInt(process.env.NEXT_PUBLIC_MODAL_ANIMATION_DURATION || '200', 10),
  MODAL_BACKDROP_OPACITY: parseFloat(process.env.NEXT_PUBLIC_MODAL_BACKDROP_OPACITY || '0.5'),
  
  // Loading
  LOADING_DELAY: parseInt(process.env.NEXT_PUBLIC_LOADING_DELAY || '200', 10),
  SKELETON_ANIMATION_DURATION: parseInt(process.env.NEXT_PUBLIC_SKELETON_ANIMATION_DURATION || '1500', 10),
  
  // Debounce/Throttle
  SEARCH_DEBOUNCE_MS: parseInt(process.env.NEXT_PUBLIC_SEARCH_DEBOUNCE_MS || '300', 10),
  SCROLL_THROTTLE_MS: parseInt(process.env.NEXT_PUBLIC_SCROLL_THROTTLE_MS || '100', 10),
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// THEME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const THEME_CONFIG = {
  // Default theme
  DEFAULT_THEME: (process.env.NEXT_PUBLIC_DEFAULT_THEME || 'light') as 'light' | 'dark' | 'system',
  
  // Theme storage key
  THEME_STORAGE_KEY: process.env.NEXT_PUBLIC_THEME_STORAGE_KEY || 'isl_theme',
  
  // Colors (can be overridden via CSS variables)
  PRIMARY_COLOR: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#10b981', // green-500
  SECONDARY_COLOR: process.env.NEXT_PUBLIC_SECONDARY_COLOR || '#3b82f6', // blue-500
  ACCENT_COLOR: process.env.NEXT_PUBLIC_ACCENT_COLOR || '#8b5cf6', // purple-500
  ERROR_COLOR: process.env.NEXT_PUBLIC_ERROR_COLOR || '#ef4444', // red-500
  WARNING_COLOR: process.env.NEXT_PUBLIC_WARNING_COLOR || '#f59e0b', // amber-500
  SUCCESS_COLOR: process.env.NEXT_PUBLIC_SUCCESS_COLOR || '#10b981', // green-500
  
  // Font sizes
  FONT_SIZE_BASE: process.env.NEXT_PUBLIC_FONT_SIZE_BASE || '16px',
  FONT_SIZE_SCALE: parseFloat(process.env.NEXT_PUBLIC_FONT_SIZE_SCALE || '1.2'),
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const MEDIA_CONFIG = {
  // Base URLs
  MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL || 'https://storage.isl-platform.com',
  VIDEO_BASE_PATH: process.env.NEXT_PUBLIC_VIDEO_BASE_PATH || '/videos',
  IMAGE_BASE_PATH: process.env.NEXT_PUBLIC_IMAGE_BASE_PATH || '/images',
  AVATAR_BASE_PATH: process.env.NEXT_PUBLIC_AVATAR_BASE_PATH || '/avatars',
  
  // Upload limits
  MAX_VIDEO_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB || '100', 10),
  MAX_IMAGE_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE_MB || '5', 10),
  MAX_AVATAR_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_AVATAR_SIZE_MB || '2', 10),
  
  // Allowed formats
  VIDEO_FORMATS: (process.env.NEXT_PUBLIC_VIDEO_FORMATS || 'mp4,webm,mov').split(','),
  IMAGE_FORMATS: (process.env.NEXT_PUBLIC_IMAGE_FORMATS || 'jpg,jpeg,png,webp,gif').split(','),
  
  // Video player
  VIDEO_AUTOPLAY: process.env.NEXT_PUBLIC_VIDEO_AUTOPLAY === 'true',
  VIDEO_CONTROLS: process.env.NEXT_PUBLIC_VIDEO_CONTROLS !== 'false',
  VIDEO_LOOP: process.env.NEXT_PUBLIC_VIDEO_LOOP === 'true',
  VIDEO_MUTED: process.env.NEXT_PUBLIC_VIDEO_MUTED === 'true',
  VIDEO_PLAYBACK_RATES: (process.env.NEXT_PUBLIC_VIDEO_PLAYBACK_RATES || '0.5,0.75,1,1.25,1.5,2').split(',').map(Number),
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ML/GESTURE RECOGNITION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const ML_CONFIG = {
  // Recognition settings
  CONFIDENCE_THRESHOLD: parseFloat(process.env.NEXT_PUBLIC_ML_CONFIDENCE_THRESHOLD || '0.7'),
  MAX_PREDICTIONS: parseInt(process.env.NEXT_PUBLIC_ML_MAX_PREDICTIONS || '5', 10),
  
  // Camera settings
  CAMERA_WIDTH: parseInt(process.env.NEXT_PUBLIC_CAMERA_WIDTH || '640', 10),
  CAMERA_HEIGHT: parseInt(process.env.NEXT_PUBLIC_CAMERA_HEIGHT || '480', 10),
  CAMERA_FPS: parseInt(process.env.NEXT_PUBLIC_CAMERA_FPS || '30', 10),
  
  // Gesture capture
  GESTURE_CAPTURE_DELAY: parseInt(process.env.NEXT_PUBLIC_GESTURE_CAPTURE_DELAY || '100', 10),
  GESTURE_SEQUENCE_LENGTH: parseInt(process.env.NEXT_PUBLIC_GESTURE_SEQUENCE_LENGTH || '30', 10),
  
  // Feedback
  FEEDBACK_DELAY: parseInt(process.env.NEXT_PUBLIC_FEEDBACK_DELAY || '500', 10),
  SUCCESS_ANIMATION_DURATION: parseInt(process.env.NEXT_PUBLIC_SUCCESS_ANIMATION_DURATION || '1000', 10),
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════

export const FEATURE_FLAGS = {
  // Core features
  ENABLE_REGISTRATION: process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== 'false',
  ENABLE_SOCIAL_LOGIN: process.env.NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === 'true',
  ENABLE_EMAIL_VERIFICATION: process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION === 'true',
  
  // Gamification features
  ENABLE_GAMIFICATION: process.env.NEXT_PUBLIC_ENABLE_GAMIFICATION !== 'false',
  ENABLE_LEADERBOARDS: process.env.NEXT_PUBLIC_ENABLE_LEADERBOARDS !== 'false',
  ENABLE_ACHIEVEMENTS: process.env.NEXT_PUBLIC_ENABLE_ACHIEVEMENTS !== 'false',
  ENABLE_STREAKS: process.env.NEXT_PUBLIC_ENABLE_STREAKS !== 'false',
  ENABLE_HEARTS: process.env.NEXT_PUBLIC_ENABLE_HEARTS !== 'false',
  
  // ML features
  ENABLE_GESTURE_RECOGNITION: process.env.NEXT_PUBLIC_ENABLE_GESTURE_RECOGNITION !== 'false',
  ENABLE_PRACTICE_MODE: process.env.NEXT_PUBLIC_ENABLE_PRACTICE_MODE !== 'false',
  
  // Class features
  ENABLE_CLASSES: process.env.NEXT_PUBLIC_ENABLE_CLASSES !== 'false',
  ENABLE_ASSIGNMENTS: process.env.NEXT_PUBLIC_ENABLE_ASSIGNMENTS !== 'false',
  
  // Analytics features
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
  ENABLE_PROGRESS_TRACKING: process.env.NEXT_PUBLIC_ENABLE_PROGRESS_TRACKING !== 'false',
  
  // UI features
  ENABLE_DARK_MODE: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE !== 'false',
  ENABLE_ANIMATIONS: process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS !== 'false',
  ENABLE_SOUND_EFFECTS: process.env.NEXT_PUBLIC_ENABLE_SOUND_EFFECTS === 'true',
  
  // Experimental features
  ENABLE_OFFLINE_MODE: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
  ENABLE_PWA: process.env.NEXT_PUBLIC_ENABLE_PWA === 'true',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSIVE BREAKPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export const BREAKPOINTS = {
  // Tailwind default breakpoints
  SM: 640,   // Small devices (phones)
  MD: 768,   // Medium devices (tablets)
  LG: 1024,  // Large devices (desktops)
  XL: 1280,  // Extra large devices
  '2XL': 1536, // 2X Extra large devices
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ROLE-BASED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

export const ROLE_ROUTES = {
  [ROLES.ADMIN]: ['/admin', '/dashboard', '/modules', '/lessons', '/classes', '/users', '/analytics'],
  [ROLES.TEACHER]: ['/dashboard', '/modules', '/lessons', '/classes', '/assignments', '/analytics'],
  // Students can join/view their enrolled classes
  [ROLES.STUDENT]: ['/dashboard', '/modules', '/lessons', '/classes', '/assignments', '/practice', '/leaderboard', '/profile'],
} as const;

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['*'], // All permissions
  [ROLES.TEACHER]: [
    'module:read', 'module:create', 'module:update',
    'lesson:read', 'lesson:create', 'lesson:update',
    'class:read', 'class:create', 'class:update', 'class:manage',
    'assignment:read', 'assignment:create', 'assignment:update', 'assignment:grade',
    'analytics:view_class', 'analytics:export',
  ],
  [ROLES.STUDENT]: [
    'module:read',
    'lesson:read',
    'class:read',
    'assignment:read', 'assignment:submit',
    'analytics:view_own',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION RULES
// ═══════════════════════════════════════════════════════════════════════════

export const VALIDATION_RULES = {
  // User validation
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
  
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: true,
  
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  
  AGE_MIN: 5,
  AGE_MAX: 120,
  
  // Class validation
  CLASS_CODE_LENGTH: 6,
  CLASS_CODE_PATTERN: /^[A-Z0-9]{6}$/,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Protected routes
  DASHBOARD: '/dashboard',
  MODULES: '/modules',
  MODULE_DETAIL: '/modules/[id]',
  LESSONS: '/lessons',
  LESSON_DETAIL: '/lessons/[id]',
  PRACTICE: '/practice',
  CLASSES: '/classes',
  CLASS_DETAIL: '/classes/[id]',
  ASSIGNMENTS: '/assignments',
  ASSIGNMENT_DETAIL: '/assignments/[id]',
  LEADERBOARD: '/leaderboard', // Leaderboard page
  ACHIEVEMENTS: '/achievements', // Achievements page
  PROFILE: '/profile',
  SETTINGS: '/settings', // Settings page
  ANALYTICS: '/analytics',
  
  // Admin routes
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_CONTENT: '/admin/content',
  ADMIN_ANALYTICS: '/admin/analytics',

  // Teacher routes
  TEACHER: '/teacher',
  TEACHER_GRADEBOOK: '/teacher/gradebook',
  TEACHER_ANALYTICS: '/teacher/analytics',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get video URL for a given category and word
 */
export function getVideoUrl(category: string, word: string): string {
  const slug = word
    .toLowerCase()
    .replace(/[()\\/,.']/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const categorySlug = category
    .toLowerCase()
    .replace(/[()\\/,.']/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${MEDIA_CONFIG.MEDIA_BASE_URL}${MEDIA_CONFIG.VIDEO_BASE_PATH}/${categorySlug}/${slug}.mp4`;
}

/**
 * Get image URL for a given path
 */
export function getImageUrl(path: string): string {
  return `${MEDIA_CONFIG.MEDIA_BASE_URL}${MEDIA_CONFIG.IMAGE_BASE_PATH}/${path}`;
}

/**
 * Get avatar URL for a given user ID or path
 */
export function getAvatarUrl(pathOrId: string): string {
  return `${MEDIA_CONFIG.MEDIA_BASE_URL}${MEDIA_CONFIG.AVATAR_BASE_PATH}/${pathOrId}`;
}

/**
 * Get level from XP
 */
export function getLevelFromXP(xp: number): number {
  for (let i = GAMIFICATION_CONFIG.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_CONFIG.LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Get XP required for a specific level
 */
export function getXPForLevel(level: number): number {
  if (level < 1 || level > GAMIFICATION_CONFIG.LEVEL_THRESHOLDS.length) {
    return 0;
  }
  return GAMIFICATION_CONFIG.LEVEL_THRESHOLDS[level - 1];
}

/**
 * Get XP progress to next level
 */
export function getXPProgress(xp: number): { current: number; next: number; progress: number } {
  const currentLevel = getLevelFromXP(xp);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  
  if (nextLevelXP === 0) {
    return { current: xp - currentLevelXP, next: 0, progress: 100 };
  }
  
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  
  return {
    current: xp - currentLevelXP,
    next: nextLevelXP - currentLevelXP,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

/**
 * Check if user has permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const roleKey = role as keyof typeof ROLE_PERMISSIONS;
  const permissions = ROLE_PERMISSIONS[roleKey];
  
  if (!permissions) return false;
  if ((permissions as unknown as string[]).includes('*')) return true;

  return (permissions as unknown as string[]).includes(permission);
}

/**
 * Check if route is accessible by role
 */
export function canAccessRoute(role: string, route: string): boolean {
  const roleKey = role as keyof typeof ROLE_ROUTES;
  const allowedRoutes = ROLE_ROUTES[roleKey];
  
  if (!allowedRoutes) return false;
  
  // Check exact match or pattern match
  return allowedRoutes.some(allowedRoute => {
    if (allowedRoute === route) return true;
    if (allowedRoute.includes('[id]')) {
      const pattern = allowedRoute.replace('[id]', '[^/]+');
      return new RegExp(`^${pattern}$`).test(route);
    }
    return route.startsWith(allowedRoute);
  });
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Format XP with commas
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Get difficulty color
 */
export function getDifficultyColor(difficulty: 'beginner' | 'intermediate' | 'advanced'): string {
  switch (difficulty) {
    case 'beginner':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
    case 'intermediate':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
    case 'advanced':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
  }
}

/**
 * Get lesson type icon
 */
export function getLessonTypeIcon(type: string): string {
  switch (type) {
    case 'video':
      return '🎬';
    case 'practice':
      return '🤟';
    case 'quiz':
      return '❓';
    case 'gesture':
      return '👋';
    case 'mixed':
      return '📚';
    default:
      return '📝';
  }
}

// Export all configurations
export const config = {
  APP_CONFIG,
  API_CONFIG,
  AUTH_CONFIG,
  GAMIFICATION_CONFIG,
  UI_CONFIG,
  THEME_CONFIG,
  MEDIA_CONFIG,
  ML_CONFIG,
  FEATURE_FLAGS,
  BREAKPOINTS,
  ROLES,
  ROLE_ROUTES,
  ROLE_PERMISSIONS,
  VALIDATION_RULES,
  ROUTES,
} as const;

export default config;
