'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { checkMlHealth, type MlHealthStatus } from '@/lib/mlHealth';
import { SCHOOL_THEME } from '@/lib/schoolTheme';

export function MlStatusBanner({ compact = false }: { compact?: boolean }) {
  const [health, setHealth] = useState<MlHealthStatus | null>(null);
  const [checking, setChecking] = useState(true);

  const refresh = () => {
    setChecking(true);
    checkMlHealth()
      .then(setHealth)
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  if (checking && !health) {
    return (
      <div className={`flex items-center gap-2 text-sm ${SCHOOL_THEME.scholar.muted} ${compact ? '' : 'mb-4'}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking ML service…
      </div>
    );
  }

  if (!health) return null;

  const isOk = health.status === 'online';
  const isDegraded = health.status === 'degraded';

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${compact ? '' : 'mb-4'} ${
        isOk
          ? `${SCHOOL_THEME.success.bg} ${SCHOOL_THEME.success.border}`
          : isDegraded
            ? `${SCHOOL_THEME.milestone.bg} ${SCHOOL_THEME.milestone.border}`
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
      }`}
    >
      {isOk ? (
        <CheckCircle className={`h-5 w-5 shrink-0 ${SCHOOL_THEME.success.text}`} />
      ) : (
        <AlertCircle className={`h-5 w-5 shrink-0 ${isDegraded ? SCHOOL_THEME.milestone.icon : 'text-rose-600'}`} />
      )}
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${isOk ? SCHOOL_THEME.success.text : SCHOOL_THEME.scholar.text}`}>
          {isOk ? 'ML service online' : isDegraded ? 'ML service degraded' : 'ML service offline'}
        </p>
        <p className={`text-xs mt-0.5 ${SCHOOL_THEME.scholar.muted}`}>{health.message}</p>
        {health.gestures.length > 0 && (
          <p className={`text-xs mt-1 ${SCHOOL_THEME.scholar.muted}`}>
            Practice targets: {health.gestures.join(', ')}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={refresh}
        className={`shrink-0 p-1.5 rounded-lg hover:bg-black/5 ${SCHOOL_THEME.scholar.muted}`}
        title="Recheck ML service"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}
