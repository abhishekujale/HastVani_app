import { fetchMlGestureCatalog, type MlGestureCatalog } from './mlGestures';

export interface MlHealthStatus {
  status: 'checking' | 'online' | 'offline' | 'degraded';
  message: string;
  staticModelLoaded: boolean;
  wordModelLoaded: boolean;
  gestures: string[];
  words: string[];
}

export async function checkMlHealth(): Promise<MlHealthStatus> {
  const catalog = await fetchMlGestureCatalog();
  return {
    status: catalog.mlStatus,
    message: catalog.message,
    staticModelLoaded: catalog.staticModelLoaded,
    wordModelLoaded: catalog.wordModelLoaded,
    gestures: catalog.staticGestures,
    words: catalog.wordGestures,
  };
}

export type { MlGestureCatalog };
