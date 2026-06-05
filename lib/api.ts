/**
 * API Client with Axios
 * Handles authentication, token refresh, and error handling
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config } from './config';

// Create axios instance
const api = axios.create({
  baseURL: config.API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Create ML API instance
export const mlApi = axios.create({
  baseURL: config.API_CONFIG.ML_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: config.API_CONFIG.TIMEOUT,
});

// ML API retry interceptor
mlApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const axiosConfig = error.config as InternalAxiosRequestConfig & { __retryCount?: number };
    if (!axiosConfig || (axiosConfig.__retryCount ?? 0) >= config.API_CONFIG.RETRY_ATTEMPTS) {
      return Promise.reject(error);
    }
    axiosConfig.__retryCount = (axiosConfig.__retryCount || 0) + 1;
    await new Promise((r) => setTimeout(r, config.API_CONFIG.RETRY_DELAY));
    return mlApi(axiosConfig);
  }
);

// ML service root URL (for health check which is at root, not under /api/v1/ml)
const mlRootUrl = config.API_CONFIG.ML_BASE_URL.replace(/\/api\/v1\/ml$/, '');

// Token management
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Get stored tokens
const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(config.AUTH_CONFIG.ACCESS_TOKEN_KEY);
};

const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(config.AUTH_CONFIG.REFRESH_TOKEN_KEY);
};

// Store tokens
export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(config.AUTH_CONFIG.ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(config.AUTH_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
};

// Clear tokens
export const clearTokens = () => {
  localStorage.removeItem(config.AUTH_CONFIG.ACCESS_TOKEN_KEY);
  localStorage.removeItem(config.AUTH_CONFIG.REFRESH_TOKEN_KEY);
};

// Request interceptor - add auth token
api.interceptors.request.use(
  (axiosConfig: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && axiosConfig.headers) {
      axiosConfig.headers.Authorization = `${config.AUTH_CONFIG.TOKEN_PREFIX} ${token}`;
    }
    return axiosConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for the token to be refreshed
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `${config.AUTH_CONFIG.TOKEN_PREFIX} ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${config.API_CONFIG.BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data.data;

        setTokens(newAccessToken, newRefreshToken);
        onTokenRefreshed(newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `${config.AUTH_CONFIG.TOKEN_PREFIX} ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    age: number;
    role?: string;
  }) => api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  getCurrentUser: () => api.get('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

export const userApi = {
  getAll: (params?: { page?: number; limit?: number; role?: string }) =>
    api.get('/users', { params }),

  getById: (id: string) => api.get(`/users/${id}`),

  update: (id: string, data: Partial<{
    firstName: string;
    lastName: string;
    age: number;
    avatar: string;
  }>) => api.patch(`/users/${id}`, data),

  getProgress: (id: string) => api.get(`/users/${id}/progress`),

  getAchievements: (id: string) => api.get(`/users/${id}/achievements`),
};
export const moduleApi = {
  getAll: (params?: { category?: string; difficulty?: string; published?: boolean }) =>
    api.get('/modules', { params }),

  getById: (id: string) => api.get(`/modules/${id}`),

  // ADD THIS - get multiple modules by IDs
  getByIds: (ids: string[]) =>
    api.get('/modules/bulk', { params: { ids: ids.join(',') } }),

  create: (data: any) => api.post('/modules', data),
  update: (id: string, data: any) => api.patch(`/modules/${id}`, data),
  togglePublish: (id: string) => api.post(`/modules/${id}/publish`, {}),
  delete: (id: string) => api.delete(`/modules/${id}`),
};
export const lessonApi = {
  getByModule: (moduleId: string) => api.get(`/lessons?module=${moduleId}`),

  getById: (id: string) => api.get(`/lessons/${id}`),

  create: (data: {
    module: string;
    title: string;
    description: string;
    type: string;
    content: Array<{ type: string; content: string; mediaUrl?: string }>;
    questions: Array<{ type: string; question: string; options?: string[]; correctAnswer: string | number; points: number }>;
    order: number;
    duration: number;
    xpReward: number;
  }) => api.post('/lessons', data),

  update: (id: string, data: Partial<{
    title: string;
    description: string;
    content: Array<{ type: string; content: string }>;
    questions: Array<{ type: string; question: string }>;
    isPublished: boolean;
  }>) => api.patch(`/lessons/${id}`, data),

  delete: (id: string) => api.delete(`/lessons/${id}`),

  start: (id: string) => api.post(`/lessons/${id}/start`),

  // Backend expects a stable `questionId` (from lesson.questions subdocument _id).
  submitAnswer: (
    id: string,
    data: { questionId: string; answer: string | number | string[] }
  ) =>
    api.post(`/lessons/${id}/submit-answer`, data),

  complete: (id: string, data: { timeSpent: number; answers?: Array<{ questionIndex: number; answer: string | number }> }) =>
    api.post(`/lessons/${id}/complete`, data),
};


export const classApi = {
  getAll: () => api.get('/classes'),

  getById: (id: string) => api.get(`/classes/${id}`),

  // ADD THIS - get enrolled classes for student
  getEnrolled: () => api.get('/classes/enrolled'),

  create: (data: any) => api.post('/classes', data),

  // IMPORTANT: Fix update method
  update: (id: string, data: any) => api.patch(`/classes/${id}`, data),

  delete: (id: string) => api.delete(`/classes/${id}`),

  join: (classCode: string) =>
    api.post('/classes/join', { classCode }),

  getStudents: (id: string) => api.get(`/classes/${id}/students`),

  addStudent: (id: string, body: { email?: string; userId?: string }) =>
    api.post(`/classes/${id}/students`, body),

  /** Bulk enroll by email array or comma-separated text */
  addStudentsBulk: (
    id: string,
    body: { emails?: string[]; emailsText?: string }
  ) => api.post(`/classes/${id}/students/bulk`, body),

  /** Bulk enroll from Excel (.xlsx/.xls) or CSV file */
  addStudentsBulkFile: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/classes/${id}/students/bulk`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getLeaderboard: (id: string) => api.get(`/classes/${id}/leaderboard`),
};


export const assignmentApi = {
  getByClass: (classId: string) => api.get(`/assignments`, { params: { classId } }),

  getById: (id: string) => api.get(`/assignments/${id}`),

  create: (data: {
    assignName: string;
    classId: string;
    description?: string;
    instructions?: string;
    marks: number;
    lessons: string[];
    startDate: string;
    dueDate: string;
    lateSubmissionDeadline?: string;
    settings?: { shuffleQuestions?: boolean; showCorrectAnswers?: boolean; allowRetakes?: boolean; maxAttempts?: number; timeLimit?: number; passingScore?: number };
    xpReward?: number;
    gemsReward?: number;
    isPublished?: boolean;
  }) => api.post('/assignments', data),

  update: (id: string, data: Partial<{
    assignName: string;
    description: string;
    instructions: string;
    marks: number;
    classId: string;
    lessons: string[];
    startDate: string;
    dueDate: string;
    lateSubmissionDeadline: string;
    xpReward: number;
    gemsReward: number;
    isPublished: boolean;
    settings: {
      shuffleQuestions: boolean;
      showCorrectAnswers: boolean;
      allowRetakes: boolean;
      maxAttempts: number;
      timeLimit?: number;
      passingScore: number;
    };
  }>) => api.patch(`/assignments/${id}`, data),

  delete: (id: string) => api.delete(`/assignments/${id}`),

  submit: (id: string, data: {
    answers?: Array<{ questionId: string; lessonId: string; answer: string | string[] }>;
    gestureResults?: Array<{ signId: string; recognized: boolean; confidence: number }>;
    timeSpent?: number;
  }) => api.post(`/assignments/${id}/submit`, data),

  getSubmissions: (id: string) => api.get(`/assignments/${id}/submissions`),

  gradeSubmission: (assignmentId: string, submissionId: string, data: {
    score: number;
    feedback?: string;
  }) => api.patch(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, data),
};

export const gamificationApi = {
  getMyStats: () => api.get('/gamification/my-stats'),

  getLeaderboard: (type?: string, limit?: number) =>
    api.get('/gamification/leaderboard', { params: { type, limit } }),

  getAllAchievements: () => api.get('/gamification/achievements'),

  claimStreak: () => api.post('/gamification/claim-streak'),

  refillHearts: () => api.post('/gamification/refill-hearts'),

  useStreakFreeze: () => api.post('/gamification/use-streak-freeze'),
};

export const signApi = {
  getAll: (params?: { category?: string; difficulty?: string; search?: string }) =>
    api.get('/signs', { params }),

  getById: (id: string) => api.get(`/signs/${id}`),

  getRandom: (count?: number, category?: string) =>
    api.get('/signs/random', { params: { count, category } }),

  getAlphabet: () => api.get('/signs/alphabet'),

  getNumbers: () => api.get('/signs/numbers'),

  create: (data: {
    name: string;
    description: string;
    category: string;
    difficulty: string;
    videoUrl?: string;
    imageUrl?: string;
    landmarks?: number[][];
  }) => api.post('/signs', data),

  update: (id: string, data: Partial<{
    name: string;
    description: string;
    videoUrl: string;
    imageUrl: string;
    isPublished: boolean;
  }>) => api.patch(`/signs/${id}`, data),

  delete: (id: string) => api.delete(`/signs/${id}`),
};

export const notificationApi = {
  getAll: (params?: { unreadOnly?: boolean; limit?: number }) =>
    api.get('/notifications', { params }),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.post('/notifications/mark-all-read'),

  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// ML API methods
export const gestureApi = {
  // Static gesture recognition (letters, numbers)
  recognize: (imageData: string) =>
    mlApi.post('/recognize', { image: imageData }),

  recognizeUpload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return mlApi.post('/recognize-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  validateGesture: (imageData: string, expectedGesture: string) =>
    mlApi.post('/validate-gesture', { image: imageData, expected_gesture: expectedGesture }),

  getSupportedGestures: () => mlApi.get('/supported-gestures'),

  extractLandmarks: (imageData: string) =>
    mlApi.post('/extract-landmarks', { image: imageData }),

  // Word recognition (motion-based)
  recognizeWord: (imageData: string) =>
    mlApi.post('/recognize-word', { image: imageData }),

  clearWordBuffer: () =>
    mlApi.post('/clear-word-buffer'),

  getSupportedWords: () => mlApi.get('/supported-words'),

  // Health check (endpoint is at root level, not under /api/v1/ml)
  getHealth: () => axios.get(`${mlRootUrl}/health`),
};

// ML Training API
export const trainingApi = {
  // Static gesture model training (letters, numbers)
  startStaticTraining: (params?: { n_estimators?: number; test_size?: number }) =>
    mlApi.post('/training/start', params || {}),

  // Word model training (motion-based)
  startWordTraining: (params?: { epochs?: number; batch_size?: number; validation_split?: number; sequence_length?: number }) =>
    mlApi.post('/training/start-word', params || {}),

  // Get training job status
  getTrainingStatus: (jobId: string) =>
    mlApi.get(`/training/status/${jobId}`),

  // List available models
  listModels: () => mlApi.get('/training/models'),

  // Get dataset info
  getDatasetInfo: () => mlApi.get('/training/dataset-info'),

  // Reload model
  reloadModel: (modelType: 'static' | 'word' = 'static', modelName?: string) =>
    mlApi.post('/training/reload-model', null, { params: { model_type: modelType, model_name: modelName } }),
};

// ─── Analytics API ────────────────────────────────────────────────────────────
export const analyticsApi = {
  getStudentAnalytics: (userId: string = 'me', days = 30) =>
    api.get(`/analytics/student/${userId}`, { params: { days } }),

  getClassAnalytics: (classId: string, days = 30) =>
    api.get(`/analytics/class/${classId}`, { params: { days } }),

  getPlatformAnalytics: (days = 30) =>
    api.get('/analytics/platform', { params: { days } }),

  getLeaderboard: (days = 7, classId?: string) =>
    api.get('/analytics/leaderboard', { params: { days, classId } }),
};

// ─── Reports API ──────────────────────────────────────────────────────────────
export const reportsApi = {
  generate: (body: {
    type: 'user_progress' | 'class_performance' | 'module_analytics';
    startDate: string;
    endDate: string;
    userId?: string;
    classId?: string;
    moduleId?: string;
  }) => api.post('/reports/generate', body),

  list: (params?: { type?: string; page?: number; limit?: number }) =>
    api.get('/reports', { params }),

  get: (id: string) => api.get(`/reports/${id}`),

  exportUrl: (id: string, format: 'csv' | 'json') =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/reports/${id}/export?format=${format}`,

  delete: (id: string) => api.delete(`/reports/${id}`),
};

// ─── Upload API ───────────────────────────────────────────────────────────────
export const uploadApi = {
  /** Upload user avatar. Accepts a File or Blob. */
  uploadAvatar: (file: File | Blob) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/upload/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Upload an image. Optional folder: images | signs | lessons | modules | assignments */
  uploadImage: (file: File | Blob, folder?: string) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: folder ? { folder } : undefined,
    });
  },

  /** Upload a video. Optional folder: videos | signs | lessons */
  uploadVideo: (
    file: File | Blob,
    folder?: string,
    onProgress?: (percent: number) => void,
  ) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/video', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: folder ? { folder } : undefined,
      onUploadProgress: onProgress
        ? (e) => {
          if (e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        }
        : undefined,
    });
  },

  /** Delete a previously uploaded file by its publicId. */
  deleteFile: (publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') =>
    api.delete('/upload', { data: { publicId, resourceType } }),
};

export default api;
