'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flame, Gem, Star, BookOpen, Trophy,
  Target, ChevronRight, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { gamificationApi, moduleApi } from '@/lib/api';
import { ROUTES, ROLES } from '@/lib/config';
import { resolveGamificationStats } from '@/lib/gamificationDisplay';
import { SCHOOL_THEME } from '@/lib/schoolTheme';
import { HeartsDisplay, SchoolStatCard } from '@/components/gamification';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserStats, Module } from '@/types';

interface ModuleWithProgress extends Module {
  progress?: { completedLessons: number; totalLessons: number; percentage: number };
}

interface LessonInfo {
  _id: string;
  title?: string;
  type?: string;
  estimatedTime?: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === ROLES.TEACHER;
  const isAdmin = user?.role === ROLES.ADMIN;

  return (
    <ProtectedRoute>
      {isAdmin ? <AdminDashboard /> : isTeacher ? <TeacherDashboard /> : <StudentDashboard />}
    </ProtectedRoute>
  );
}

function AdminDashboard() {
  const router = useRouter();
  router.replace('/admin');
  return (
    <div className={`flex items-center justify-center min-h-screen ${SCHOOL_THEME.canvas}`}>
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent mx-auto" />
        <p className={SCHOOL_THEME.scholar.muted}>Redirecting to admin panel…</p>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const router = useRouter();
  router.replace('/teacher');
  return (
    <div className={`flex items-center justify-center min-h-screen ${SCHOOL_THEME.canvas}`}>
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent mx-auto" />
        <p className={SCHOOL_THEME.scholar.muted}>Redirecting to teacher dashboard…</p>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [modules, setModules] = useState<ModuleWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const getTodaysLesson = (): { lesson: LessonInfo; module: ModuleWithProgress } | null => {
    for (const module of modules) {
      const lessons = (module.lessons || []) as unknown as LessonInfo[];
      const completed = module.progress?.completedLessons ?? 0;
      if (lessons.length > 0 && completed < lessons.length) {
        const next = typeof lessons[completed] === 'object'
          ? lessons[completed]
          : { _id: lessons[completed] as unknown as string };
        return { lesson: next, module };
      }
    }
    return null;
  };

  useEffect(() => {
    Promise.all([
      gamificationApi.getMyStats(),
      moduleApi.getAll({ published: true }),
    ])
      .then(([statsRes, modulesRes]) => {
        setStats(statsRes.data.data);
        setModules(modulesRes.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const g = resolveGamificationStats(stats);
  const todaysLesson = getTodaysLesson();

  if (loading) {
    return (
      <div className={`min-h-screen ${SCHOOL_THEME.canvas} p-4 pb-24`}>
        <div className="max-w-2xl mx-auto space-y-5 pt-2">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${SCHOOL_THEME.canvas} p-4 pb-24`}>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="pt-2">
          <h1 className={`text-2xl font-bold ${SCHOOL_THEME.scholar.text}`}>
            Hey, {user?.firstName}!
          </h1>
          <p className={`${SCHOOL_THEME.scholar.muted} text-sm mt-0.5`}>
            Your classroom progress — keep learning ISL every day
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SchoolStatCard
            semantic="milestone"
            label="Day Streak"
            value={g.streak}
            icon={Flame}
            hero
            title="Day Streak"
          />
          <SchoolStatCard
            semantic="knowledge"
            label="Gems"
            value={g.gems}
            icon={Gem}
            hero
            title="Gems"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SchoolStatCard
            semantic="growth"
            label="Level"
            value={g.level}
            icon={Star}
            sub={`${g.xp.toLocaleString()} / ${g.xpForNextLevel.toLocaleString()} XP`}
          />
          <div className={`${SCHOOL_THEME.surface} p-4`}>
            <HeartsDisplay hearts={g.hearts} maxHearts={g.maxHearts} showLabel />
          </div>

          <SchoolStatCard
            semantic="growth"
            label="Lessons"
            value={g.completedLessonsCount}
            sub="completed"
            icon={BookOpen}
          />
          <SchoolStatCard
            semantic="milestone"
            label="Badges"
            value={g.achievementsCount}
            sub="earned"
            icon={Trophy}
          />
        </div>

        {todaysLesson ? (
          <div
            onClick={() => router.push(`${ROUTES.LESSONS}/${todaysLesson.lesson._id}`)}
            className={`rounded-2xl p-5 text-white shadow-lg cursor-pointer active:scale-[0.99] ${SCHOOL_THEME.milestone.gradient} ${SCHOOL_THEME.surfaceHover}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold opacity-90">Today&apos;s Lesson</span>
                </div>
                <div className="text-xl font-bold truncate">
                  {todaysLesson.lesson.title ?? 'Next Lesson'}
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  {todaysLesson.module.moduleName} · {todaysLesson.lesson.estimatedTime ?? 5} min
                </div>
              </div>
              <div className="ml-3 flex items-center gap-1 text-sm font-semibold shrink-0">
                Start <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        ) : modules.length > 0 ? (
          <div className={`rounded-2xl p-4 text-center border ${SCHOOL_THEME.success.bg} ${SCHOOL_THEME.success.border}`}>
            <p className={`${SCHOOL_THEME.success.text} font-medium text-sm`}>
              All caught up for today — great job!
            </p>
          </div>
        ) : null}

        <Card className={SCHOOL_THEME.surface}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className={`h-4 w-4 ${SCHOOL_THEME.growth.icon}`} />
                <CardTitle className="text-base">Daily Goal</CardTitle>
              </div>
              <Badge variant={g.dailyGoalMet ? 'success' : 'secondary'}>
                {g.dailyGoalMet ? 'Complete!' : 'In progress'}
              </Badge>
            </div>
            <Progress value={g.dailyGoalPercent} className="h-2" />
            <p className={`text-xs mt-2 ${SCHOOL_THEME.scholar.muted}`}>
              {g.dailyXp} / {g.dailyGoal} XP today
            </p>
          </CardContent>
        </Card>

        <Card className={SCHOOL_THEME.surface}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Continue Learning</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(ROUTES.MODULES)}
                className={`${SCHOOL_THEME.growth.text} h-7 px-2`}
              >
                See all <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {modules.slice(0, 4).map((module) => (
              <div
                key={module._id}
                onClick={() => router.push(`${ROUTES.MODULES}/${module._id}`)}
                className={`flex items-center gap-3 p-3 rounded-xl ${SCHOOL_THEME.scholar.bg} hover:bg-primary-50/50 dark:hover:bg-primary-900/15 transition-colors cursor-pointer group`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${SCHOOL_THEME.growth.bg}`}>
                  <BookOpen className={`h-4 w-4 ${SCHOOL_THEME.growth.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {module.moduleName}
                  </p>
                  {module.progress && (
                    <>
                      <Progress value={module.progress.percentage} className="h-1 mt-1.5" />
                      <p className={`text-xs mt-0.5 ${SCHOOL_THEME.scholar.muted}`}>
                        {module.progress.completedLessons}/{module.progress.totalLessons} lessons
                      </p>
                    </>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
              </div>
            ))}
            {modules.length === 0 && (
              <div className={`text-center py-8 text-sm ${SCHOOL_THEME.scholar.muted}`}>
                No modules available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
