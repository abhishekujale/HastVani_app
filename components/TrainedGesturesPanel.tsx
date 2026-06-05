'use client';

import { SCHOOL_THEME } from '@/lib/schoolTheme';
import type { MlGestureCatalog } from '@/lib/mlGestures';

interface TrainedGesturesPanelProps {
  catalog: MlGestureCatalog | null;
  loading?: boolean;
}

export function TrainedGesturesPanel({ catalog, loading }: TrainedGesturesPanelProps) {
  if (loading) {
    return (
      <div className={`${SCHOOL_THEME.surface} p-4 text-sm ${SCHOOL_THEME.scholar.muted}`}>
        Loading trained gestures from ML service…
      </div>
    );
  }

  if (!catalog) return null;

  const staticList = catalog.staticGestures;
  const wordList = catalog.wordGestures;

  return (
    <div className={`${SCHOOL_THEME.surface} p-4 space-y-4`}>
      <div>
        <h3 className={`text-sm font-semibold ${SCHOOL_THEME.scholar.text}`}>
          What your ML model knows
        </h3>
        <p className={`text-xs mt-1 ${SCHOOL_THEME.scholar.muted}`}>
          Practice mode only picks from <strong>static gestures</strong> (camera, single pose).
          Word signs use motion recognition over multiple frames.
        </p>
      </div>

      <div>
        <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${SCHOOL_THEME.growth.text}`}>
          Static gestures ({staticList.length}) — used in Practice target
        </p>
        {staticList.length === 0 ? (
          <p className={`text-sm ${SCHOOL_THEME.milestone.text}`}>
            None loaded. Train or add <code className="text-xs">ML/models/gesture_model.pkl</code>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {staticList.map((g) => (
              <span
                key={g}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${SCHOOL_THEME.growth.bg} ${SCHOOL_THEME.growth.text} border ${SCHOOL_THEME.growth.border}`}
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${SCHOOL_THEME.knowledge.text}`}>
          Word / motion signs ({wordList.length})
        </p>
        {wordList.length === 0 ? (
          <p className={`text-sm ${SCHOOL_THEME.scholar.muted}`}>No word model loaded.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {wordList.map((w) => (
              <span
                key={w}
                className={`px-2 py-1 rounded-md text-xs ${SCHOOL_THEME.knowledge.bg} ${SCHOOL_THEME.knowledge.text} border ${SCHOOL_THEME.knowledge.border}`}
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
