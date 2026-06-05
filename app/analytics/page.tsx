'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, BookOpen, Clock, Flame, Star,
  Target, AlertTriangle, Trophy, Zap,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { analyticsApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CustomHeader from '@/components/CustomHeader';
import { SCHOOL_THEME } from '@/lib/schoolTheme';
import type { SchoolSemantic } from '@/lib/schoolTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentData {
  user: {
    name: string; level: number; totalXp: number;
    streak: number; longestStreak: number;
    totalLessonsCompleted: number; totalModulesCompleted: number; totalAchievements: number;
  };
  summary: {
    xpEarned: number; timeSpentMinutes: number; daysActive: number;
    lessonsCompleted: number; gesturesRecognized: number;
  };
  xpOverTime: { date: string; xp: number; lessonsCompleted: number }[];
  lessonCompletionByType: Record<string, { total: number; completed: number; avgScore: number }>;
  weakAreas: { module: string; avgScore: number }[];
  accuracyTrend: { date: string; gesturesRecognized: number }[];
}

// ─── Stat card ────────────────────────────────────────────────────────────────

const semanticIconBg: Record<SchoolSemantic, string> = {
  growth: SCHOOL_THEME.growth.bg,
  knowledge: SCHOOL_THEME.knowledge.bg,
  milestone: SCHOOL_THEME.milestone.bg,
  compassion: SCHOOL_THEME.compassion.bg,
  scholar: SCHOOL_THEME.scholar.bg,
};

const semanticIconColor: Record<SchoolSemantic, string> = {
  growth: SCHOOL_THEME.growth.icon,
  knowledge: SCHOOL_THEME.knowledge.icon,
  milestone: SCHOOL_THEME.milestone.icon,
  compassion: SCHOOL_THEME.compassion.icon,
  scholar: SCHOOL_THEME.scholar.muted,
};

function StatCard({ icon: Icon, label, value, sub, semantic = 'growth' }: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  semantic?: SchoolSemantic;
}) {
  return (
    <Card className={SCHOOL_THEME.surface}>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`p-3 rounded-full ${semanticIconBg[semantic]}`}>
          <Icon size={20} className={semanticIconColor[semantic]} />
        </div>
        <div>
          <p className={`text-sm ${SCHOOL_THEME.scholar.muted}`}>{label}</p>
          <p className={`text-2xl font-bold ${SCHOOL_THEME.scholar.text}`}>{value}</p>
          {sub && <p className={`text-xs ${SCHOOL_THEME.scholar.muted}`}>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentAnalyticsPage() {
  return (
    <ProtectedRoute>
      <StudentAnalytics />
    </ProtectedRoute>
  );
}

function StudentAnalytics() {
  const [data, setData] = useState<StudentData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    analyticsApi.getStudentAnalytics('me', days)
      .then(r => setData(r.data.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center text-red-500 flex flex-col items-center gap-2">
      <AlertTriangle size={32} />
      <p>{error}</p>
    </div>
  );

  if (!data) return null;

  // Prepare chart data
  const xpChart = data.xpOverTime.map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    XP: d.xp,
    Lessons: d.lessonsCompleted,
  }));

  const typeChart = Object.entries(data.lessonCompletionByType).map(([type, v]) => ({
    type: type.replace('_', ' '),
    Completed: v.completed,
    Total: v.total,
    'Avg Score': Math.round(v.avgScore),
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-24">
      <CustomHeader title="My Analytics" showBack />
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-gray-500 text-sm">{data.user.name} · Level {data.user.level}</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors
                ${days === d ? `${SCHOOL_THEME.growth.bgSolid} text-white border-primary-600` : `border-gray-300 ${SCHOOL_THEME.scholar.muted} hover:border-primary-400`}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="XP Earned" value={data.summary.xpEarned.toLocaleString()} sub={`${days} days`} semantic="growth" />
        <StatCard icon={BookOpen} label="Lessons Done" value={data.summary.lessonsCompleted} semantic="knowledge" />
        <StatCard icon={Clock} label="Time Spent" value={`${data.summary.timeSpentMinutes}m`} semantic="scholar" />
        <StatCard icon={Flame} label="Days Active" value={data.summary.daysActive} sub={`streak: ${data.user.streak}`} semantic="milestone" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Star} label="Total XP" value={data.user.totalXp.toLocaleString()} semantic="growth" />
        <StatCard icon={Target} label="Modules Done" value={data.user.totalModulesCompleted} semantic="knowledge" />
        <StatCard icon={Trophy} label="Achievements" value={data.user.totalAchievements} semantic="milestone" />
        <StatCard icon={TrendingUp} label="Best Streak" value={`${data.user.longestStreak}d`} semantic="compassion" />
      </div>

      {/* XP over time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} className={SCHOOL_THEME.growth.icon} /> XP Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {xpChart.length === 0
            ? <p className="text-center text-gray-400 py-8">No activity data for this period</p>
            : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={xpChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="XP" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Lessons" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </CardContent>
      </Card>

      {/* Lesson completion by type */}
      {typeChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-500" /> Completion by Lesson Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total" fill="#d1fae5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Weak areas */}
      {data.weakAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle size={18} /> Weak Areas (avg score &lt; 60%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.weakAreas.map(w => (
              <div key={w.module} className="flex items-center justify-between">
                <span className="text-sm font-medium">{w.module}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-orange-400 h-2 rounded-full"
                      style={{ width: `${Math.round(w.avgScore)}%` }}
                    />
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                    {Math.round(w.avgScore)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
