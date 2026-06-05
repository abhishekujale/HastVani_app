'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { gamificationApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SCHOOL_THEME } from '@/lib/schoolTheme';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  streak: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'weekly'>('global');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await gamificationApi.getLeaderboard(activeTab, 50);
        setData(response.data.data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [activeTab]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return rank;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-amber-600 text-white';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

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
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-orange-100 mt-1">See how you rank against others!</p>
        </div>

        {/* Tabs */}
        <div className="flex p-4 space-x-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            This Week
          </button>
        </div>

        {/* Current User Rank */}
        {data?.currentUser && (
          <div className="mx-4 mb-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
            <p className="text-sm text-green-100 mb-1">Your Rank</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-bold">#{data.currentUser.rank}</span>
                <div>
                  <p className="font-medium">{data.currentUser.name}</p>
                  <p className="text-sm text-green-100">Level {data.currentUser.level}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{data.currentUser.xp.toLocaleString()}</p>
                <p className="text-sm text-green-100">XP</p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        {data?.leaderboard && data.leaderboard.length >= 3 && (
          <div className="px-4 mb-6">
            <div className="flex items-end justify-center space-x-2">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl mb-2 ring-4 ring-gray-300">
                  {data.leaderboard[1]?.avatar ? (
                    <img
                      src={data.leaderboard[1].avatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    '👤'
                  )}
                </div>
                <span className="text-2xl">🥈</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 text-center truncate max-w-[80px]">
                  {data.leaderboard[1]?.name.split(' ')[0]}
                </p>
                <p className="text-xs text-gray-500">{data.leaderboard[1]?.xp.toLocaleString()} XP</p>
                <div className="w-16 h-20 bg-gray-300 dark:bg-gray-600 rounded-t-lg mt-2"></div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center text-3xl mb-2 ring-4 ring-yellow-400">
                  {data.leaderboard[0]?.avatar ? (
                    <img
                      src={data.leaderboard[0].avatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    '👤'
                  )}
                </div>
                <span className="text-3xl">🥇</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 text-center truncate max-w-[80px]">
                  {data.leaderboard[0]?.name.split(' ')[0]}
                </p>
                <p className="text-xs text-gray-500">{data.leaderboard[0]?.xp.toLocaleString()} XP</p>
                <div className="w-20 h-28 bg-yellow-400 rounded-t-lg mt-2"></div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl mb-2 ring-4 ring-orange-400">
                  {data.leaderboard[2]?.avatar ? (
                    <img
                      src={data.leaderboard[2].avatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    '👤'
                  )}
                </div>
                <span className="text-2xl">🥉</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 text-center truncate max-w-[80px]">
                  {data.leaderboard[2]?.name.split(' ')[0]}
                </p>
                <p className="text-xs text-gray-500">{data.leaderboard[2]?.xp.toLocaleString()} XP</p>
                <div className="w-16 h-16 bg-orange-400 rounded-t-lg mt-2"></div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="px-4 space-y-2">
          {data?.leaderboard.slice(3).map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center p-4 rounded-xl ${
                entry.userId === user?._id
                  ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(
                  entry.rank
                )}`}
              >
                {getRankBadge(entry.rank)}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center">
                  <p className="font-medium text-gray-900 dark:text-white">{entry.name}</p>
                  {entry.userId === user?._id && (
                    <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">You</span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <span>Level {entry.level}</span>
                  <span className="flex items-center">
                    🔥 {entry.streak}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">{entry.xp.toLocaleString()}</p>
                <p className="text-xs text-gray-500">XP</p>
              </div>
            </div>
          ))}
        </div>

        {data?.leaderboard.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl">🏆</span>
            <p className="text-gray-500 mt-4">No rankings yet. Start learning to get on the board!</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
