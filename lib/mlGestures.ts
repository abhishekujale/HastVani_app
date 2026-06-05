import { gestureApi } from './api';

export interface MlGestureCatalog {
  mlStatus: 'online' | 'offline' | 'degraded';
  message: string;
  /** Static single-frame gestures (Practice / validate-gesture) */
  staticGestures: string[];
  /** Motion/word signs (recognize-word API) */
  wordGestures: string[];
  staticModelLoaded: boolean;
  wordModelLoaded: boolean;
}

function parseGestureList(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  if (Array.isArray(root.gestures)) {
    return root.gestures.filter((g): g is string => typeof g === 'string' && g.length > 0);
  }
  if (root.data && typeof root.data === 'object') {
    const nested = (root.data as Record<string, unknown>).gestures;
    if (Array.isArray(nested)) {
      return nested.filter((g): g is string => typeof g === 'string' && g.length > 0);
    }
  }
  return [];
}

/** Load gesture lists from ML health + supported-gestures (no fake A/B/C fallback). */
export async function fetchMlGestureCatalog(): Promise<MlGestureCatalog> {
  let staticGestures: string[] = [];
  let wordGestures: string[] = [];
  let staticModelLoaded = false;
  let wordModelLoaded = false;
  let mlStatus: MlGestureCatalog['mlStatus'] = 'offline';
  let message = 'ML service unreachable';

  try {
    const healthRes = await gestureApi.getHealth();
    const data = healthRes.data;
    staticModelLoaded = Boolean(data?.models?.static?.loaded);
    wordModelLoaded = Boolean(data?.models?.word?.loaded);
    staticGestures = Array.isArray(data?.models?.static?.gestures)
      ? data.models.static.gestures
      : [];
    wordGestures = Array.isArray(data?.models?.word?.words)
      ? data.models.word.words
      : [];

    if (data?.status === 'degraded' || !staticModelLoaded) {
      mlStatus = 'degraded';
      message =
        data?.message ||
        'ML is running but the static gesture model is not loaded.';
    } else {
      mlStatus = 'online';
      message = `Static: ${staticGestures.length} gestures · Words: ${wordGestures.length}`;
    }
  } catch {
    return {
      mlStatus: 'offline',
      message:
        'Start ML: cd ML && source venv/bin/activate && uvicorn app.main:app --reload --port 8000',
      staticGestures: [],
      wordGestures: [],
      staticModelLoaded: false,
      wordModelLoaded: false,
    };
  }

  // Prefer dedicated endpoint if health list is empty
  if (staticGestures.length === 0) {
    try {
      const gesturesRes = await gestureApi.getSupportedGestures();
      staticGestures = parseGestureList(gesturesRes.data);
    } catch {
      /* keep health result */
    }
  }

  if (staticGestures.length === 0 && staticModelLoaded) {
    mlStatus = 'degraded';
    message = 'Model loaded but no gesture labels returned. Check ML/models/gesture_model.pkl';
  }

  return {
    mlStatus,
    message,
    staticGestures,
    wordGestures,
    staticModelLoaded,
    wordModelLoaded,
  };
}
