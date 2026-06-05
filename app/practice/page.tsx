'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { gestureApi } from '@/lib/api';
import { GAMIFICATION_CONFIG, ML_CONFIG } from '@/lib/config';
import { gamificationApi } from '@/lib/api';
import { resolveGamificationStats } from '@/lib/gamificationDisplay';
import { SCHOOL_THEME } from '@/lib/schoolTheme';
import { HeartsDisplay } from '@/components/gamification';
import { MlStatusBanner } from '@/components/MlStatusBanner';
import { TrainedGesturesPanel } from '@/components/TrainedGesturesPanel';
import { fetchMlGestureCatalog, type MlGestureCatalog } from '@/lib/mlGestures';

type PracticeMode = 'identify' | 'perform';
type MlStatus = 'checking' | 'online' | 'offline';

interface GestureChallenge {
  id: string;
  name: string;
  imageUrl?: string;
}

interface SessionResult {
  type: 'gameover' | 'complete';
  score: number;
  streak: number;
  correct: number;
  total: number;
}

// Confidence meter ring component
function ConfidenceRing({ value, size = 64 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value * circumference);
  const color = value >= ML_CONFIG.CONFIDENCE_THRESHOLD ? '#22c55e' : value >= 0.4 ? '#eab308' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={4} className="text-gray-700" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-300" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{Math.round(value * 100)}%</span>
      </div>
    </div>
  );
}

const alphabetSignImageUrl = (letter: string) => `/signs/alphabet/${letter}.jpg`;
const answerLabel = (letter: string) => `Letter ${letter}`;

export default function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>('identify');
  const [currentChallenge, setCurrentChallenge] = useState<GestureChallenge | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [maxHearts, setMaxHearts] = useState(GAMIFICATION_CONFIG.MAX_HEARTS);
  const [hearts, setHearts] = useState(GAMIFICATION_CONFIG.MAX_HEARTS);
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions] = useState(10);
  const [loading, setLoading] = useState(true);
  const [gestureCatalog, setGestureCatalog] = useState<MlGestureCatalog | null>(null);
  const [supportedGestures, setSupportedGestures] = useState<string[]>([]);
  const [gesturesLoading, setGesturesLoading] = useState(true);

  // ML status
  const [mlStatus, setMlStatus] = useState<MlStatus>('checking');
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [gestureResult, setGestureResult] = useState<{ gesture: string; confidence: number } | null>(null);
  const [autoRecognizing, setAutoRecognizing] = useState(false);
  const [gestureConfirmed, setGestureConfirmed] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraStarting, setCameraStarting] = useState(false);

  // IMPORTANT: Video/canvas refs - always rendered in DOM (not conditional)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveMatchRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);

  const basePoints = GAMIFICATION_CONFIG.XP_QUIZ_CORRECT;
  const streakBonusPerStep = GAMIFICATION_CONFIG.XP_GESTURE_RECOGNIZED;

  const loadGestureCatalog = useCallback(async () => {
    setGesturesLoading(true);
    const catalog = await fetchMlGestureCatalog();
    setGestureCatalog(catalog);
    setSupportedGestures(catalog.staticGestures);
    setMlStatus(
      catalog.staticGestures.length > 0 && catalog.mlStatus === 'online'
        ? 'online'
        : catalog.mlStatus === 'offline'
          ? 'offline'
          : 'offline'
    );
    setGesturesLoading(false);
    return catalog;
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const statsRes = await gamificationApi.getMyStats();
        const g = resolveGamificationStats(statsRes.data.data);
        setMaxHearts(g.maxHearts);
        setHearts(g.hearts);
      } catch {
        setMaxHearts(GAMIFICATION_CONFIG.MAX_HEARTS);
        setHearts(GAMIFICATION_CONFIG.MAX_HEARTS);
      }

      await loadGestureCatalog();
      setLoading(false);
    };
    initialize();

    return () => {
      if (recognitionIntervalRef.current) clearInterval(recognitionIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [loadGestureCatalog]);

  const generateChallenge = useCallback(() => {
    if (supportedGestures.length === 0) return;
    const randomGesture = supportedGestures[Math.floor(Math.random() * supportedGestures.length)];
    const wrongOptions = supportedGestures
      .filter(g => g !== randomGesture)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const allOptions = [...wrongOptions, randomGesture].sort(() => Math.random() - 0.5);

    setCurrentChallenge({
      id: Date.now().toString(),
      name: randomGesture,
      imageUrl: alphabetSignImageUrl(randomGesture),
    });
    setOptions(allOptions);
    setSelected(null);
    setShowResult(false);
    setGestureResult(null);
    setGestureConfirmed(false);
  }, [supportedGestures]);

  useEffect(() => {
    if (!loading && supportedGestures.length > 0) generateChallenge();
  }, [loading, supportedGestures, generateChallenge]);

  // FIX: startCamera now sets cameraActive FIRST, then uses a timeout
  // to assign stream after the video element is guaranteed in DOM.
  // Actually, video element is now ALWAYS rendered (hidden via CSS), so ref is always available.
  const startCamera = async () => {
    setCameraError('');
    if (mlStatus === 'offline') {
      setCameraError('ML service is offline. Start it on port 8000 (see banner above).');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera needs HTTPS or localhost (http://localhost:3000).');
      return;
    }
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      const video = videoRef.current;
      if (!video) {
        setCameraError('Camera preview not ready. Try again.');
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      streamRef.current = stream;
      setCameraActive(true);
      setGestureConfirmed(false);
      consecutiveMatchRef.current = 0;
      consecutiveFailuresRef.current = 0;
    } catch (error: unknown) {
      console.error('Failed to start camera:', error);
      setCameraError('Camera access denied. Allow camera in browser settings.');
    } finally {
      setCameraStarting(false);
    }
  };

  const stopRecognitionLoop = useCallback(() => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    setAutoRecognizing(false);
  }, []);

  const stopCamera = useCallback(() => {
    stopRecognitionLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setGestureResult(null);
    setGestureConfirmed(false);
    consecutiveMatchRef.current = 0;
  }, [stopRecognitionLoop]);

  const captureFrame = useCallback(async (): Promise<{ gesture: string; confidence: number; correct: boolean } | null> => {
    if (!videoRef.current || !canvasRef.current) return null;
    if (videoRef.current.readyState < 2) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await gestureApi.recognize(imageData);
      const result = response.data;
      if (result.success && result.gesture) {
        consecutiveFailuresRef.current = 0;
        const detected = {
          gesture: result.gesture,
          confidence: result.confidence || 0,
          correct: result.gesture === currentChallenge?.name && result.confidence >= ML_CONFIG.CONFIDENCE_THRESHOLD
        };
        setGestureResult({ gesture: detected.gesture, confidence: detected.confidence });
        return detected;
      }
      return null;
    } catch {
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current >= 5) {
        setMlStatus('offline');
        stopRecognitionLoop();
      }
      return null;
    }
  }, [currentChallenge?.name, stopRecognitionLoop]);

  const startRecognitionLoop = useCallback(() => {
    stopRecognitionLoop();
    setAutoRecognizing(true);
    setGestureConfirmed(false);
    consecutiveMatchRef.current = 0;
    let isProcessing = false;

    recognitionIntervalRef.current = setInterval(async () => {
      if (isProcessing) return;
      isProcessing = true;
      setRecognizing(true);
      try {
        const result = await captureFrame();
        if (result?.correct) {
          consecutiveMatchRef.current += 1;
          if (consecutiveMatchRef.current >= 2) {
            stopRecognitionLoop();
            setGestureConfirmed(true);
            setRecognizing(false);
          }
        } else {
          consecutiveMatchRef.current = 0;
        }
      } catch { /* keep trying */ } finally {
        isProcessing = false;
        setRecognizing(false);
      }
    }, 800);
  }, [captureFrame, stopRecognitionLoop]);

  useEffect(() => {
    if (cameraActive && mode === 'perform' && !showResult) startRecognitionLoop();
    return () => stopRecognitionLoop();
  }, [cameraActive, mode, currentChallenge?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gestureConfirmed || !currentChallenge) return;
    handleResult(true);
    const timer = setTimeout(() => { setGestureConfirmed(false); handleNext(); }, 1500);
    return () => clearTimeout(timer);
  }, [gestureConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIdentifyAnswer = (answer: string) => {
    if (showResult) return;
    setSelected(answer);
    handleResult(answer === currentChallenge?.name);
  };

  const handleResult = (correct: boolean) => {
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) {
      const newStreak = streak + 1;
      setScore(prev => prev + basePoints + streak * streakBonusPerStep);
      setStreak(newStreak);
      setCorrectCount(prev => prev + 1);
      if (newStreak > bestStreak) setBestStreak(newStreak);
    } else {
      setStreak(0);
      setHearts(prev => Math.max(0, prev - 1));
    }
  };

  const handleNext = () => {
    if (hearts <= 0) {
      setSessionResult({ type: 'gameover', score, streak: bestStreak, correct: correctCount, total: questionNum });
      setHearts(maxHearts); setScore(0); setStreak(0); setBestStreak(0); setCorrectCount(0); setQuestionNum(1);
    } else if (questionNum >= totalQuestions) {
      setSessionResult({ type: 'complete', score, streak: bestStreak, correct: correctCount, total: totalQuestions });
      setScore(0); setStreak(0); setBestStreak(0); setCorrectCount(0); setQuestionNum(1);
    } else {
      setQuestionNum(prev => prev + 1);
    }
    generateChallenge();
  };

  const retryMlConnection = async () => {
    setMlStatus('checking');
    try {
      const res = await gestureApi.getHealth();
      if (res.data?.models?.static?.loaded) { setMlStatus('online'); consecutiveFailuresRef.current = 0; }
      else setMlStatus('offline');
    } catch { setMlStatus('offline'); }
  };

  // ── LOADING SKELETON ──
  if (loading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen ${SCHOOL_THEME.canvas} p-4 pb-24`}>
          <div className="max-w-6xl mx-auto">
            <div className="h-10 w-48 bg-gray-800 rounded-lg animate-pulse mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="aspect-[4/3] bg-gray-800 rounded-2xl animate-pulse" />
              <div className="space-y-4">
                <div className="h-8 w-64 bg-gray-800 rounded animate-pulse" />
                <div className="h-48 bg-gray-800 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${SCHOOL_THEME.canvas} pb-24`}>
        {/* Hidden video & canvas - ALWAYS in DOM so refs work */}
        <video ref={videoRef} autoPlay playsInline muted className={cameraActive ? 'hidden' : 'hidden'} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Top Header Bar */}
        <div className={`${SCHOOL_THEME.surface} border-b ${SCHOOL_THEME.scholar.border}`}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${SCHOOL_THEME.growth.gradient}`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              </div>
              <h1 className={`text-lg font-bold ${SCHOOL_THEME.scholar.text}`}>ISL Practice Lab</h1>
              {mlStatus === 'online' && (
                <span className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  ML Online
                </span>
              )}
              {mlStatus === 'offline' && (
                <button onClick={retryMlConnection} className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20 hover:bg-red-500/20 transition">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  ML Offline - Retry
                </button>
              )}
              {mlStatus === 'checking' && (
                <span className="flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20">
                  <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </span>
              )}
            </div>

            {/* Stats Pills */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${SCHOOL_THEME.milestone.bg} border ${SCHOOL_THEME.milestone.border}`}>
                <span className={SCHOOL_THEME.milestone.icon}>🔥</span>
                <span className={`font-bold ${SCHOOL_THEME.milestone.text}`}>{streak}</span>
              </div>
              <HeartsDisplay hearts={hearts} maxHearts={maxHearts} size="sm" />
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${SCHOOL_THEME.growth.bg} border ${SCHOOL_THEME.growth.border}`}>
                <span className={SCHOOL_THEME.growth.icon}>⭐</span>
                <span className={`font-bold ${SCHOOL_THEME.growth.text}`}>{score}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="max-w-6xl mx-auto px-4 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 min-w-[3rem]">{questionNum}/{totalQuestions}</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${SCHOOL_THEME.growth.gradient}`}
                  style={{ width: `${(questionNum / totalQuestions) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-500">{Math.round((questionNum / totalQuestions) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="flex bg-[#161822] rounded-xl p-1 border border-gray-800">
            <button
              onClick={() => { setMode('identify'); stopCamera(); generateChallenge(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'identify' ? `${SCHOOL_THEME.growth.bgSolid} text-white shadow-lg` : `${SCHOOL_THEME.scholar.muted} hover:text-primary-700`
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Identify Sign
            </button>
            <button
              onClick={async () => {
                const catalog = await loadGestureCatalog();
                if (catalog.staticGestures.length === 0) return;
                setMode('perform');
                const g = catalog.staticGestures[Math.floor(Math.random() * catalog.staticGestures.length)];
                setCurrentChallenge({ id: Date.now().toString(), name: g });
                setGestureResult(null);
                setGestureConfirmed(false);
                setShowResult(false);
              }}
              disabled={supportedGestures.length === 0 || mlStatus === 'offline'}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'perform' ? `${SCHOOL_THEME.growth.bgSolid} text-white shadow-lg`
                : supportedGestures.length === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Perform Gesture
              {supportedGestures.length === 0 && (
                <span className="text-[9px] opacity-50">(no gestures)</span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-6xl mx-auto px-4 mt-6">
          {mode === 'identify' ? (
            /* ═══ IDENTIFY MODE ═══ */
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Sign Display - Left Panel */}
              <div className="lg:col-span-2">
                <div className="bg-[#161822] rounded-2xl border border-gray-800 p-6 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Sign Card</p>
                  <div className="w-56 h-56 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 overflow-hidden">
                    {currentChallenge?.imageUrl ? (
                      <img src={currentChallenge.imageUrl} alt="Alphabet hand sign" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-8xl font-bold bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        ?
                      </span>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
                    <span className="text-indigo-300 font-semibold text-sm">Static alphabet sign</span>
                  </div>
                </div>
              </div>

              {/* Answer Options - Right Panel */}
              <div className="lg:col-span-3">
                <div className="bg-[#161822] rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-xl font-bold mb-1">What letter is this sign?</h3>
                  <p className="text-sm text-gray-500 mb-6">Study the handshape and choose the matching alphabet letter.</p>

                  <div className="grid grid-cols-2 gap-3">
                    {options.map((opt, idx) => (
                      <button
                        key={opt}
                        onClick={() => handleIdentifyAnswer(opt)}
                        disabled={showResult}
                        className={`relative px-5 py-4 rounded-xl border-2 font-medium transition-all active:scale-[0.97] text-left ${showResult
                          ? opt === currentChallenge?.name
                            ? 'bg-green-500/10 border-green-500 text-green-400'
                            : selected === opt
                              ? 'bg-red-500/10 border-red-500 text-red-400'
                              : 'bg-[#1e2030] border-gray-700 text-gray-600'
                          : selected === opt
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300'
                            : 'bg-[#1e2030] border-gray-700 text-gray-300 hover:border-indigo-500/50 hover:bg-indigo-500/5'
                          }`}
                      >
                        <span className="text-xs text-gray-600 block mb-1">{String.fromCharCode(65 + idx)}</span>
                        <span className="text-base">{answerLabel(opt)}</span>
                        {showResult && opt === currentChallenge?.name && (
                          <svg className="absolute top-3 right-3 w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Result Feedback */}
                  {showResult && (
                    <div className={`mt-5 p-4 rounded-xl border ${isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          <span className="text-xl">{isCorrect ? '🎉' : '😕'}</span>
                        </div>
                        <div>
                          <p className={`font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {isCorrect ? `Correct! +${basePoints + Math.max(0, streak - 1) * streakBonusPerStep} points` : 'Not quite right'}
                          </p>
                          {!isCorrect && <p className="text-sm text-gray-500">Answer: <strong className="text-gray-300">{currentChallenge ? answerLabel(currentChallenge.name) : ''}</strong></p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {showResult && (
                    <button onClick={handleNext}
                      className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.98]">
                      {questionNum >= totalQuestions ? 'See Results' : hearts <= 0 ? 'Try Again' : 'Next Question →'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ═══ PERFORM GESTURE MODE ═══ */
            <div className="space-y-4">
              <MlStatusBanner />
              <TrainedGesturesPanel catalog={gestureCatalog} loading={gesturesLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Camera Feed - Main Panel */}
                <div className="lg:col-span-2">
                  <div className="bg-[#161822] rounded-2xl border border-gray-800 overflow-hidden">
                    {/* Camera viewport */}
                    <div className="relative aspect-[4/3] bg-black">
                      {cameraActive ? (
                        <>
                          {/* Mirror the camera feed onto a visible video element via canvas */}
                          <VideoMirror sourceVideo={videoRef} active={cameraActive} />

                          {/* Corner brackets */}
                          <div className="absolute inset-6 pointer-events-none">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-400/60 rounded-tl" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-400/60 rounded-tr" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-400/60 rounded-bl" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-400/60 rounded-br" />
                          </div>

                          {/* Recognition Overlay */}
                          {gestureResult && (
                            <div className={`absolute top-4 left-4 right-4 px-4 py-3 rounded-xl backdrop-blur-md transition-all ${gestureConfirmed ? 'bg-green-500/80' : 'bg-black/60'
                              }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {gestureConfirmed ? (
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : recognizing ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : null}
                                  <div>
                                    <p className="text-white font-bold text-lg">{gestureResult.gesture}</p>
                                    {gestureConfirmed && <p className="text-green-100 text-xs">Matched! Auto-advancing...</p>}
                                  </div>
                                </div>
                                <ConfidenceRing value={gestureResult.confidence} />
                              </div>
                            </div>
                          )}

                          {/* Scanning animation */}
                          {autoRecognizing && !gestureConfirmed && !gestureResult && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 border-2 border-indigo-400/40 rounded-full flex items-center justify-center">
                                  <div className="w-12 h-12 border-2 border-indigo-400/60 border-t-transparent rounded-full animate-spin" />
                                </div>
                                <span className="text-sm text-gray-400 bg-black/50 px-3 py-1 rounded-full backdrop-blur">Scanning gesture...</span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-900 to-[#0f1117]">
                          {cameraError ? (
                            <div className="text-center px-8">
                              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              </div>
                              <p className="text-red-400 text-sm mb-2">{cameraError}</p>
                              <button onClick={startCamera} className="text-indigo-400 text-sm underline">Try again</button>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <p className="text-gray-400 text-sm mb-1">Camera Preview</p>
                              <p className="text-gray-600 text-xs">Click start to begin recognition</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Camera Controls Bar */}
                    <div className="px-4 py-3 bg-[#1a1c2e] border-t border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                        {cameraActive ? 'Camera Active' : 'Camera Off'}
                      </div>
                      {!cameraActive ? (
                        <button onClick={startCamera}
                          disabled={cameraStarting || mlStatus === 'offline'}
                          className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg font-medium hover:bg-primary-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {cameraStarting ? 'Starting…' : 'Start Camera'}
                        </button>
                      ) : (
                        <button onClick={stopCamera}
                          className="px-5 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg font-medium hover:bg-gray-600 transition">
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Sidebar - Challenge Info */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Target Gesture Card */}
                  <div className={`${SCHOOL_THEME.surface} p-5`}>
                    <p className={`text-xs uppercase tracking-wider mb-3 ${SCHOOL_THEME.scholar.muted}`}>
                      Target Gesture
                    </p>
                    {currentChallenge?.name ? (
                      <>
                        <div className={`w-full aspect-square rounded-xl flex items-center justify-center border mb-3 ${SCHOOL_THEME.growth.bg} ${SCHOOL_THEME.growth.border}`}>
                          <span className={`text-6xl font-bold ${SCHOOL_THEME.growth.text}`}>
                            {currentChallenge.name}
                          </span>
                        </div>
                        <p className={`text-center text-2xl font-bold ${SCHOOL_THEME.scholar.text}`}>
                          {currentChallenge.name}
                        </p>
                        <p className={`text-center text-xs mt-2 ${SCHOOL_THEME.scholar.muted}`}>
                          Perform this sign clearly in front of the camera
                        </p>
                      </>
                    ) : (
                      <div className={`rounded-xl p-6 text-center border ${SCHOOL_THEME.milestone.border} ${SCHOOL_THEME.milestone.bg}`}>
                        <p className={`text-sm font-medium ${SCHOOL_THEME.milestone.text}`}>
                          No target gesture ready
                        </p>
                        <p className={`text-xs mt-2 ${SCHOOL_THEME.scholar.muted}`}>
                          {supportedGestures.length === 0
                            ? 'ML returned 0 static gestures. Start the ML service and ensure gesture_model.pkl is loaded.'
                            : 'Switch to Perform Gesture again or tap reload below.'}
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            const catalog = await loadGestureCatalog();
                            if (catalog.staticGestures.length > 0) generateChallenge();
                          }}
                          className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white ${SCHOOL_THEME.growth.bgSolid}`}
                        >
                          Reload gestures
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Live Stats */}
                  <div className="bg-[#161822] rounded-2xl border border-gray-800 p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Recognition Status</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Detected</span>
                        <span className="text-sm font-mono font-bold text-white">{gestureResult?.gesture || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Confidence</span>
                        <span className={`text-sm font-mono font-bold ${gestureResult && gestureResult.confidence >= ML_CONFIG.CONFIDENCE_THRESHOLD ? 'text-green-400' : 'text-gray-500'
                          }`}>{gestureResult ? `${Math.round(gestureResult.confidence * 100)}%` : '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Threshold</span>
                        <span className="text-sm font-mono text-gray-500">{Math.round(ML_CONFIG.CONFIDENCE_THRESHOLD * 100)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Status</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gestureConfirmed ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : autoRecognizing ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                          }`}>
                          {gestureConfirmed ? 'MATCHED' : autoRecognizing ? 'SCANNING' : 'IDLE'}
                        </span>
                      </div>
                      {/* Confidence Bar */}
                      <div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
                          <div className={`h-full rounded-full transition-all duration-300 ${gestureResult && gestureResult.confidence >= ML_CONFIG.CONFIDENCE_THRESHOLD
                            ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                            : 'bg-gradient-to-r from-yellow-500 to-orange-400'
                            }`} style={{ width: `${(gestureResult?.confidence || 0) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Result Feedback in sidebar */}
                  {showResult && (
                    <div className={`rounded-2xl border p-5 ${isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                      }`}>
                      <div className="text-center">
                        <span className="text-4xl block mb-2">{isCorrect ? '🎉' : '😕'}</span>
                        <p className={`font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {isCorrect ? `+${basePoints + Math.max(0, streak - 1) * streakBonusPerStep} pts` : 'Incorrect'}
                        </p>
                      </div>
                    </div>
                  )}

                  {showResult && (
                    <button onClick={handleNext}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]">
                      {questionNum >= totalQuestions ? 'See Results' : hearts <= 0 ? 'Try Again' : 'Next →'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Available Gestures Footer */}
          {supportedGestures.length > 0 && (
            <p className={`text-xs text-center mt-4 ${SCHOOL_THEME.scholar.muted}`}>
              Random targets are chosen from: {supportedGestures.join(', ')}
            </p>
          )}
        </div>

        {/* ═══ Session Result Modal ═══ */}
        {sessionResult && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#161822] border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
              <div className={`w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center ${sessionResult.type === 'complete' ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-red-500/10 border-2 border-red-500/30'
                }`}>
                <span className="text-5xl">{sessionResult.type === 'complete' ? '🏆' : '💔'}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {sessionResult.type === 'complete' ? 'Session Complete!' : 'Out of Hearts!'}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {sessionResult.type === 'complete' ? 'Great work on this practice session!' : 'Keep practicing, you\'ll get better!'}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#1e2030] rounded-xl p-3">
                  <p className="text-2xl font-bold text-indigo-400">{sessionResult.score}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Score</p>
                </div>
                <div className="bg-[#1e2030] rounded-xl p-3">
                  <p className="text-2xl font-bold text-orange-400">{sessionResult.streak}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Best Streak</p>
                </div>
                <div className="bg-[#1e2030] rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-400">{sessionResult.correct}/{sessionResult.total}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Accuracy</p>
                </div>
              </div>

              <button onClick={() => setSessionResult(null)}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]">
                Practice Again
              </button>
            </div>
          </div>

        )}
          </div>
        </ProtectedRoute>
      );
    }

// Component to mirror the hidden video onto a visible canvas
function VideoMirror({ sourceVideo, active }: { sourceVideo: React.RefObject<HTMLVideoElement | null>; active: boolean }) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    const draw = () => {
      const video = sourceVideo.current;
      const canvas = displayCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Mirror horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [active, sourceVideo]);

  return (
    <canvas ref={displayCanvasRef} className="w-full h-full object-cover" />
  );
}
