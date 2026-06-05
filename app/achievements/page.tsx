'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gamificationApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SCHOOL_THEME } from '@/lib/schoolTheme';
import { RewardChips } from '@/components/gamification';
import type { Achievement, AchievementCategory } from '@/types';

interface AchievementWithStatus extends Achievement {
  isEarned: boolean;
  isHidden: boolean;
}

const CATEGORIES: { value: AchievementCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🏆' },
  { value: 'streak', label: 'Streaks', icon: '🔥' },
  { value: 'completion', label: 'Completion', icon: '✅' },
  { value: 'accuracy', label: 'Accuracy', icon: '🎯' },
  { value: 'speed', label: 'Speed', icon: '⚡' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'special', label: 'Special', icon: '⭐' },
];

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-500 to-purple-700',
  legendary: 'from-yellow-400 to-orange-500',
};

const RARITY_BORDERS = {
  common: 'border-gray-300',
  rare: 'border-blue-400',
  epic: 'border-purple-500',
  legendary: 'border-yellow-400',
};

export default function AchievementsPage() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await gamificationApi.getAllAchievements();
        setAchievements(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  const filteredAchievements = achievements.filter(
    (a) => selectedCategory === 'all' || a.category === selectedCategory
  );

  const earnedCount = achievements.filter((a) => a.isEarned).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen flex items-center justify-center ${SCHOOL_THEME.canvas}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${SCHOOL_THEME.canvas} pb-20`}>
        <div className={`${SCHOOL_THEME.milestone.gradient} text-white p-6`}>
          <button
            onClick={() => router.back()}
            className="flex items-center text-white/80 hover:text-white mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-purple-100 mt-1">Collect badges and show off your progress!</p>

          {/* Progress */}
          <div className="mt-4 bg-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Collection Progress</span>
              <span className="text-purple-100">{earnedCount}/{totalCount}</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="p-4 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-purple-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAchievements.map((achievement) => (
            <div
              key={achievement._id}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 text-center transition-all ${
                achievement.isEarned
                  ? `ring-2 ${RARITY_BORDERS[achievement.rarity]}`
                  : 'opacity-60'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-3 ${
                  achievement.isEarned
                    ? `bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} text-white`
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {achievement.isHidden && !achievement.isEarned ? '❓' : achievement.icon}
              </div>

              {/* Name */}
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                {achievement.isHidden && !achievement.isEarned ? '???' : achievement.name}
              </h3>

              {/* Description */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                {achievement.isHidden && !achievement.isEarned
                  ? 'Complete special tasks to unlock'
                  : achievement.description}
              </p>

              {/* Rarity Badge */}
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  achievement.isEarned
                    ? `bg-gradient-to-r ${RARITY_COLORS[achievement.rarity]} text-white`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {achievement.rarity}
              </span>

              {/* Rewards */}
              {achievement.isEarned && (
                <div className="flex justify-center mt-2">
                  <RewardChips xp={achievement.xpReward} gems={achievement.gemsReward} />
                </div>
              )}

              {/* Status */}
              <div className="mt-2">
                {achievement.isEarned ? (
                  <span className="text-green-500 text-xs flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Earned
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl">🏆</span>
            <p className="text-gray-500 mt-4">No achievements in this category yet.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
