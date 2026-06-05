'use client';

import { useEffect, useState } from 'react';
import {
  Sun, Moon, LogOut, ChevronRight, Shield, GraduationCap,
  Flame, Zap, BookCheck, Award, Settings,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { gamificationApi, classApi, userApi } from '@/lib/api';
import { ROLES } from '@/lib/config';
import { resolveGamificationStats } from '@/lib/gamificationDisplay';
import { SCHOOL_THEME } from '@/lib/schoolTheme';
import { SchoolStatCard } from '@/components/gamification';
import CustomHeader from '@/components/CustomHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserStats } from '@/types';

function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('isl_theme');
    if (stored === 'dark') setThemeState('dark');
    else if (stored === 'light') setThemeState('light');
    else setThemeState(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    localStorage.setItem('isl_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return { theme, toggleTheme };
}

/* ─── Edit Profile Dialog ────────────────────────────────────────────────── */
function EditProfileDialog({
  open,
  onOpenChange,
  initialData,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData: { firstName: string; lastName: string; age: number };
}) {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setFormData(initialData); setError(''); }
  }, [open]);

  const handleSave = async () => {
    if (!user?._id) return;
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (formData.age < 5 || formData.age > 120) {
      setError('Age must be between 5 and 120.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await userApi.update(user._id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        age: formData.age,
      });
      updateUser({ firstName: formData.firstName.trim(), lastName: formData.lastName.trim(), age: formData.age });
      onOpenChange(false);
    } catch {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="dp-firstName">First name</Label>
            <Input
              id="dp-firstName"
              value={formData.firstName}
              onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-lastName">Last name</Label>
            <Input
              id="dp-lastName"
              value={formData.lastName}
              onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-age">Age</Label>
            <Input
              id="dp-age"
              type="number"
              value={formData.age}
              min={5}
              max={120}
              onChange={(e) => setFormData((p) => ({ ...p, age: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Profile page ───────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === ROLES.TEACHER;
  const isAdmin = user?.role === ROLES.ADMIN;

  return (
    <div className="min-h-screen bg-background pb-24">
      <CustomHeader title="Profile" />
      {isAdmin ? <AdminProfile /> : isTeacher ? <TeacherProfile /> : <StudentProfile />}
    </div>
  );
}

/* ─── Shared avatar card ─────────────────────────────────────────────────── */
function AvatarCard({
  initials,
  name,
  subtitle,
  gradientClass,
  badgeLabel,
  badgeVariant,
}: {
  initials: string;
  name: string;
  subtitle: string;
  gradientClass: string;
  badgeLabel: string;
  badgeVariant?: 'default' | 'secondary' | 'success' | 'info' | 'warning' | 'destructive' | 'outline';
}) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <Avatar className={`w-20 h-20 text-2xl font-bold text-white ${gradientClass}`}>
          <AvatarFallback className={`text-white font-bold text-xl ${gradientClass}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{name}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant={badgeVariant ?? 'default'}>{badgeLabel}</Badge>
      </CardContent>
    </Card>
  );
}

/* ─── Settings row ───────────────────────────────────────────────────────── */
function SettingsRow({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  right,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left
        ${variant === 'danger'
          ? 'text-destructive hover:bg-destructive/10'
          : 'hover:bg-muted'
        }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      {right ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

/* ─── Admin profile ─────────────────────────────────────────────────────── */
function AdminProfile() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <AvatarCard
        initials={`${user?.firstName?.[0]}${user?.lastName?.[0]}`}
        name={`${user?.firstName} ${user?.lastName}`}
        subtitle={user?.email ?? ''}
        gradientClass="bg-gradient-to-br from-red-500 to-rose-600"
        badgeLabel="Administrator"
        badgeVariant="destructive"
      />
      <Card>
        <CardContent className="p-2 space-y-0.5">
          <SettingsRow icon={Shield} label="Admin Dashboard" onClick={() => (window.location.href = '/admin')} />
          <Separator />
          <SettingsRow
            icon={theme === 'dark' ? Sun : Moon}
            label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            onClick={toggleTheme}
            right={<span className="text-muted-foreground text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>}
          />
          <Separator />
          <SettingsRow icon={LogOut} label="Sign Out" onClick={() => logout()} variant="danger" right={null} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Teacher profile ───────────────────────────────────────────────────── */
function TeacherProfile() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [classCount, setClassCount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    classApi.getAll()
      .then((r) => setClassCount(r.data.data?.length || 0))
      .catch(console.error);
  }, []);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <AvatarCard
        initials={`${user?.firstName?.[0]}${user?.lastName?.[0]}`}
        name={`${user?.firstName} ${user?.lastName}`}
        subtitle={user?.email ?? ''}
        gradientClass="bg-gradient-to-br from-emerald-500 to-teal-600"
        badgeLabel="Teacher"
        badgeVariant="success"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary mb-0.5">{classCount}</div>
            <div className="text-xs text-muted-foreground">Classes Created</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-7 w-7 text-primary mx-auto mb-0.5" />
            <div className="text-xs text-muted-foreground">Educator Account</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-2 space-y-0.5">
          <SettingsRow icon={Settings} label="Edit Profile" onClick={() => setEditOpen(true)} />
          <Separator />
          <SettingsRow
            icon={theme === 'dark' ? Sun : Moon}
            label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            onClick={toggleTheme}
            right={<span className="text-muted-foreground text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>}
          />
          <Separator />
          <SettingsRow icon={LogOut} label="Sign Out" onClick={() => logout()} variant="danger" right={null} />
        </CardContent>
      </Card>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={{ firstName: user?.firstName || '', lastName: user?.lastName || '', age: user?.age || 18 }}
      />
    </div>
  );
}

/* ─── Student profile ───────────────────────────────────────────────────── */
function StudentProfile() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    gamificationApi.getMyStats()
      .then((r) => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const g = resolveGamificationStats(stats);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <AvatarCard
        initials={`${user?.firstName?.[0]}${user?.lastName?.[0]}`}
        name={`${user?.firstName} ${user?.lastName}`}
        subtitle={`Level ${g.level}`}
        gradientClass={SCHOOL_THEME.growth.gradient}
        badgeLabel="Student"
        badgeVariant="info"
      />

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <SchoolStatCard semantic="milestone" label="Day Streak" value={g.streak} icon={Flame} />
          <SchoolStatCard semantic="growth" label="Total XP" value={g.xp.toLocaleString()} icon={Zap} />
          <SchoolStatCard semantic="growth" label="Lessons Done" value={g.completedLessonsCount} icon={BookCheck} />
          <SchoolStatCard semantic="milestone" label="Badges" value={g.achievementsCount} icon={Award} />
        </div>
      )}

      <Card>
        <CardContent className="p-2 space-y-0.5">
          <SettingsRow icon={Settings} label="Edit Profile" onClick={() => setEditOpen(true)} />
          <Separator />
          <SettingsRow
            icon={theme === 'dark' ? Sun : Moon}
            label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            onClick={toggleTheme}
            right={<span className="text-muted-foreground text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>}
          />
          <Separator />
          <SettingsRow icon={LogOut} label="Sign Out" onClick={() => logout()} variant="danger" right={null} />
        </CardContent>
      </Card>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={{ firstName: user?.firstName || '', lastName: user?.lastName || '', age: user?.age || 18 }}
      />
    </div>
  );
}
