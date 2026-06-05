'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { lessonApi, gestureApi, signApi, authApi, assignmentApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { MlStatusBanner } from '@/components/MlStatusBanner';
import { SCHOOL_THEME } from '@/lib/schoolTheme';
import { RewardChips } from '@/components/gamification';
import { hasReward } from '@/lib/gamificationDisplay';
import type { Lesson, ContentBlock, Question } from '@/types';

interface QuestionAnswer {
  questionIndex: number;
  answer: string | number;
  isCorrect?: boolean;
}

interface VideoQuizQuestion {
  videoUrl: string;
  question: string;
  correctAnswer: string;
  options: string[];
}

type LessonStage = 'content' | 'video-quiz' | 'questions' | 'results';

export default function LessonPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('student');
  const [stage, setStage] = useState<LessonStage>('content');
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  // Video quiz state
  const [videoQuizQuestions, setVideoQuizQuestions] = useState<VideoQuizQuestion[]>([]);
  const [vqIndex, setVqIndex] = useState(0);
  const [vqSelected, setVqSelected] = useState<string | null>(null);
  const [vqShowFeedback, setVqShowFeedback] = useState(false);
  const [vqScore, setVqScore] = useState(0);
  const [vqShowResults, setVqShowResults] = useState(false);
  const [vqLoading, setVqLoading] = useState(false);

  // Camera state for gesture recognition
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [gestureResult, setGestureResult] = useState<{ gesture: string; confidence: number } | null>(null);
  const [autoRecognizing, setAutoRecognizing] = useState(false);
  const [gestureConfirmed, setGestureConfirmed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveMatchRef = useRef(0);

  useEffect(() => {
    authApi.getCurrentUser().then(r => setUserRole(r.data?.data?.role || 'student')).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await lessonApi.getById(lessonId);
        setLesson(response.data.data);

        // Start the lesson
        await lessonApi.start(lessonId);
      } catch (error) {
        console.error('Failed to fetch lesson:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();

    return () => {
      // Cleanup camera and interval on unmount
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [lessonId]);

  const [cameraError, setCameraError] = useState('');
  const [cameraStarting, setCameraStarting] = useState(false);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera requires HTTPS or localhost. Open http://localhost:3000');
      return;
    }
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      const video = videoRef.current;
      if (!video) {
        setCameraError('Camera preview not ready. Please try again.');
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      streamRef.current = stream;
      setCameraActive(true);
      setGestureConfirmed(false);
      consecutiveMatchRef.current = 0;
    } catch (error) {
      console.error('Failed to start camera:', error);
      setCameraError('Could not access camera. Allow camera permission in your browser.');
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
    setCameraActive(false);
    setGestureResult(null);
    setGestureConfirmed(false);
    consecutiveMatchRef.current = 0;
  }, [stopRecognitionLoop]);

  const captureAndRecognize = useCallback(async (expectedGesture?: string): Promise<boolean | null> => {
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
      if (expectedGesture) {
        const response = await gestureApi.validateGesture(imageData, expectedGesture);
        const result = response.data;
        setGestureResult({
          gesture: result.detected || 'Unknown',
          confidence: result.confidence || 0
        });
        return result.valid;
      } else {
        const response = await gestureApi.recognize(imageData);
        const result = response.data;
        setGestureResult({
          gesture: result.gesture || 'Unknown',
          confidence: result.confidence || 0
        });
        return result.success && result.confidence >= 0.7;
      }
    } catch (error) {
      console.error('Gesture recognition failed:', error);
      return null;
    }
  }, []);

  // Start automatic recognition loop when camera is active on a gesture question
  const startRecognitionLoop = useCallback((expectedGesture: string) => {
    stopRecognitionLoop();
    setAutoRecognizing(true);
    setGestureConfirmed(false);
    consecutiveMatchRef.current = 0;

    const INTERVAL_MS = 800;
    const REQUIRED_CONSECUTIVE = 2; // need 2 consecutive matches to confirm

    let isProcessing = false;

    recognitionIntervalRef.current = setInterval(async () => {
      if (isProcessing) return;
      isProcessing = true;
      setRecognizing(true);

      try {
        const valid = await captureAndRecognize(expectedGesture);

        if (valid) {
          consecutiveMatchRef.current += 1;
          if (consecutiveMatchRef.current >= REQUIRED_CONSECUTIVE) {
            // Gesture confirmed! Stop loop and auto-submit
            stopRecognitionLoop();
            setGestureConfirmed(true);
            setRecognizing(false);
          }
        } else {
          consecutiveMatchRef.current = 0;
        }
      } catch {
        // ignore errors in loop, keep trying
      } finally {
        isProcessing = false;
        setRecognizing(false);
      }
    }, INTERVAL_MS);
  }, [captureAndRecognize, stopRecognitionLoop]);

  const extractSignName = (content: string, fallback: string): string => {
    const m = content.match(/for\s+'([^']+)'/) || content.match(/for\s+(.+)$/i);
    return (m?.[1] || fallback).trim();
  };

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const QUIZ_QUESTION_COUNT = 15;

  const generateVideoQuiz = async (currentLesson: Lesson | null) => {
    if (!currentLesson) return;
    setVqLoading(true);
    try {
      // Fetch all lessons in this module to use as question pool
      const moduleId = (currentLesson as unknown as { moduleId: string }).moduleId;
      const { data: lessonData } = await lessonApi.getByModule(moduleId);
      const moduleLessons: Array<{ _id: string; title: string; content: Array<{ type: string; mediaUrl?: string }> }> =
        lessonData?.data || [];

      // Build candidate list: { title, videoUrl }
      interface Candidate { title: string; videoUrl: string }
      const candidates: Candidate[] = [];
      const allTitles: string[] = [];

      for (const l of moduleLessons) {
        allTitles.push(l.title);
        const videoBlock = l.content?.find(
          b => b.type === 'video' && !!b.mediaUrl
        );
        if (videoBlock?.mediaUrl) {
          candidates.push({ title: l.title, videoUrl: videoBlock.mediaUrl });
        }
      }

      // If not enough video candidates, add text-only entries (no video url)
      if (candidates.length < QUIZ_QUESTION_COUNT) {
        const textOnly = moduleLessons
          .filter(l => !candidates.find(c => c.title === l.title))
          .map(l => ({ title: l.title, videoUrl: '' }));
        candidates.push(...textOnly);
      }

      // Ensure we always have a distractor pool
      if (allTitles.length < 4) {
        const { data: signData } = await signApi.getRandom(20);
        const signNames: string[] = (signData?.data || []).map((s: { name: string }) => s.name);
        allTitles.push(...signNames);
      }

      const questionPool = shuffleArray(candidates).slice(0, QUIZ_QUESTION_COUNT);

      const questions: VideoQuizQuestion[] = questionPool.map(candidate => {
        const correctAnswer = candidate.title;
        const distractors = shuffleArray(
          allTitles.filter(t => t.toLowerCase() !== correctAnswer.toLowerCase())
        ).slice(0, 4);
        const options = shuffleArray([correctAnswer, ...distractors]);
        return {
          videoUrl: candidate.videoUrl,
          question: candidate.videoUrl
            ? 'What sign is shown in the video above?'
            : `Which sign does "${correctAnswer}" represent?`,
          correctAnswer,
          options,
        };
      });

      setVideoQuizQuestions(questions);
      setVqIndex(0);
      setVqSelected(null);
      setVqShowFeedback(false);
      setVqScore(0);
      setVqShowResults(false);
    } catch (err) {
      console.error('Failed to generate video quiz:', err);
    } finally {
      setVqLoading(false);
    }
  };

  const handleNextContent = () => {
    if (!lesson) return;

    if (currentContentIndex < lesson.content.length - 1) {
      setCurrentContentIndex(prev => prev + 1);
    } else if (lesson.questions.length > 0) {
      setStage('questions');
      setCurrentQuestionIndex(0);
    } else if (userRole === 'student') {
      generateVideoQuiz(lesson).then(() => setStage('video-quiz'));
    } else {
      handleComplete();
    }
  };

  const handlePrevContent = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(prev => prev - 1);
    }
  };

  const handleVqSelect = (option: string) => {
    if (vqShowFeedback) return;
    setVqSelected(option);
  };

  const handleVqSubmit = () => {
    if (!vqSelected || vqShowFeedback) return;
    const correct = vqSelected === videoQuizQuestions[vqIndex].correctAnswer;
    if (correct) setVqScore(prev => prev + 1);
    setVqShowFeedback(true);
  };

  const handleVqNext = () => {
    if (vqIndex < videoQuizQuestions.length - 1) {
      setVqIndex(prev => prev + 1);
      setVqSelected(null);
      setVqShowFeedback(false);
    } else {
      setVqShowResults(true);
    }
  };

  const handleVqRetry = () => {
    generateVideoQuiz(lesson).then(() => {
      setVqIndex(0);
      setVqSelected(null);
      setVqShowFeedback(false);
      setVqScore(0);
      setVqShowResults(false);
    });
  };

  const handleVqContinue = () => {
    handleComplete();
  };

  const handleAnswerSelect = (answer: string | number) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = async () => {
    if (!lesson || selectedAnswer === null) return;

    const question = lesson.questions[currentQuestionIndex];
    const questionId = (question as any)?._id as string | undefined;
    if (!questionId) {
      console.warn('Missing question _id; cannot submit answer');
      return;
    }
    const correct = selectedAnswer === question.correctAnswer;

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      setScore(prev => prev + question.points);
    }

    setAnswers(prev => [...prev, {
      questionIndex: currentQuestionIndex,
      answer: selectedAnswer,
      isCorrect: correct
    }]);

    // Submit answer to backend
    try {
      await lessonApi.submitAnswer(lessonId, {
        questionId,
        answer: selectedAnswer
      });
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  // When gesture is confirmed by the auto-recognition loop, submit the answer
  useEffect(() => {
    if (!gestureConfirmed || !lesson) return;

    const question = lesson.questions[currentQuestionIndex];
    const questionId = (question as any)?._id as string | undefined;
    if (!questionId) {
      console.warn('Missing question _id; cannot submit gesture answer');
      return;
    }

    setIsCorrect(true);
    setShowFeedback(true);
    setScore(prev => prev + question.points);

    setAnswers(prev => [...prev, {
      questionIndex: currentQuestionIndex,
      answer: gestureResult?.gesture || question.gestureName || question.correctAnswer as string,
      isCorrect: true
    }]);

    // Submit to backend
    lessonApi.submitAnswer(lessonId, {
      questionId,
      answer: gestureResult?.gesture || (question.correctAnswer as any)
    }).catch(err => console.error('Failed to submit answer:', err));

    // Auto-advance after 1.5 seconds
    const timer = setTimeout(() => {
      handleNextQuestion();
      setGestureConfirmed(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [gestureConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  // When camera becomes active on a gesture question, start the recognition loop
  useEffect(() => {
    if (!cameraActive || !lesson || stage !== 'questions') return;

    const question = lesson.questions[currentQuestionIndex];
    if (question?.type !== 'gesture_recognition') return;

    const expectedGesture = question.gestureName || question.correctAnswer as string;
    startRecognitionLoop(expectedGesture);

    return () => stopRecognitionLoop();
  }, [cameraActive, currentQuestionIndex, stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNextQuestion = () => {
    if (!lesson) return;

    stopRecognitionLoop();
    setShowFeedback(false);
    setSelectedAnswer(null);
    setGestureResult(null);
    setGestureConfirmed(false);
    consecutiveMatchRef.current = 0;

    if (currentQuestionIndex < lesson.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!lesson || submitting) return;

    // Students go to video quiz before results
    if (userRole === 'student' && stage !== 'video-quiz') {
      generateVideoQuiz(lesson).then(() => setStage('video-quiz'));
      return;
    }

    setSubmitting(true);
    stopCamera();

    const timeSpent = Math.floor((Date.now() - startTime) / 1000 / 60);

    try {
      const response = await lessonApi.complete(lessonId, {
        timeSpent,
        answers: answers.map(a => ({
          questionIndex: a.questionIndex,
          answer: a.answer
        }))
      });

      // If this lesson was started from an Assignment, create/update the Assignment submission too.
      if (assignmentId) {
        const assignmentAnswers = answers
          .map((a) => {
            const q = (lesson?.questions?.[a.questionIndex] as any) || null;
            const questionId = q?._id as string | undefined;
            if (!questionId) return null;
            return {
              questionId,
              lessonId: lessonId,
              answer: typeof a.answer === 'number' ? String(a.answer) : a.answer
            };
          })
          .filter(Boolean) as Array<{
          questionId: string;
          lessonId: string;
          answer: string | string[];
        }>;

        try {
          await assignmentApi.submit(assignmentId, {
            answers: assignmentAnswers,
            timeSpent
          });
        } catch (e) {
          console.error('Failed to submit assignment attempt:', e);
        }
      }

      setXpEarned(response.data.data?.xpEarned || lesson.xpReward);
      setStage('results');
    } catch (error) {
      console.error('Failed to complete lesson:', error);
      setStage('results');
    } finally {
      setSubmitting(false);
    }
  };

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
              {block.content}
            </p>
          </div>
        );
      case 'video': {
        const hasVideoUrl = !!block.mediaUrl;
        return (
          <div className="w-full rounded-xl overflow-hidden bg-black">
            {hasVideoUrl ? (
              <video
                key={block.mediaUrl}
                src={block.mediaUrl}
                controls
                playsInline
                preload="metadata"
                style={{ width: '100%', display: 'block', maxHeight: '70vh' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 py-16 gap-3">
                <svg className="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Video coming soon</p>
              </div>
            )}
          </div>
        );
      }
      case 'image':
        return (
          <div className="flex justify-center">
            <img
              src={block.mediaUrl}
              alt={block.content}
              className="max-w-full h-auto rounded-xl shadow-lg"
            />
            {block.content && (
              <p className="text-center text-gray-500 mt-2 text-sm">{block.content}</p>
            )}
          </div>
        );
      case 'gesture_demo':
        return (
          <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
            <span className="text-6xl mb-4 block">🤟</span>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {block.gestureName || 'ISL Gesture'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{block.content}</p>
            {block.mediaUrl && (
              <img
                src={block.mediaUrl}
                alt={block.gestureName}
                className="mx-auto mt-4 max-w-xs rounded-lg"
              />
            )}
          </div>
        );
      case 'practice':
        return (
          <div className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
            <span className="text-6xl mb-4 block">👋</span>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Practice Time!</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{block.content}</p>
            <p className="text-sm text-gray-500">Try performing the gesture shown above</p>
          </div>
        );
      default:
        return (
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p>{block.content}</p>
          </div>
        );
    }
  };

  const renderQuestion = (question: Question) => {
    if (question.type === 'gesture_recognition') {
      return (
        <div className="space-y-6">
          <MlStatusBanner compact />
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {question.question}
            </h3>
            <p className="text-gray-500">
              Show the gesture: <span className="font-semibold text-blue-600 text-2xl">{question.gestureName || question.correctAnswer}</span>
            </p>
          </div>

          {/* Camera View — video stays mounted so ref works when starting camera */}
          <div className="relative aspect-video max-w-lg mx-auto bg-gray-900 rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cameraActive ? 'w-full h-full object-cover' : 'hidden'}
              style={cameraActive ? { transform: 'scaleX(-1)' } : undefined}
            />
            <canvas ref={canvasRef} className="hidden" />

            {cameraActive ? (
              <>
                {/* Live Recognition Overlay */}
                {gestureResult && (
                  <div className={`absolute top-4 left-4 right-4 px-4 py-3 rounded-xl backdrop-blur-sm ${
                    gestureConfirmed ? 'bg-green-500/90' : 'bg-black/60'
                  } text-white font-medium text-center transition-all`}>
                    <div className="flex items-center justify-center gap-2">
                      {recognizing && !gestureConfirmed && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      )}
                      {gestureConfirmed && <span className="text-xl">&#10003;</span>}
                      <span className="text-lg">
                        {gestureResult.gesture} - {Math.round(gestureResult.confidence * 100)}%
                      </span>
                    </div>
                    {gestureConfirmed && (
                      <p className="text-sm mt-1 text-green-100">Correct! Moving to next...</p>
                    )}
                  </div>
                )}

                {/* Scanning indicator */}
                {autoRecognizing && !gestureConfirmed && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-center gap-2 text-white text-sm bg-black/50 rounded-lg px-3 py-2 backdrop-blur-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span>Scanning your gesture...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
                <span className="text-6xl mb-4">📷</span>
                <p className="text-gray-400">Press the button below to start</p>
              </div>
            )}
          </div>

          {cameraError && (
            <p className="text-center text-sm text-rose-600 dark:text-rose-400">{cameraError}</p>
          )}

          {/* Camera Controls */}
          <div className="flex justify-center space-x-4">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                disabled={cameraStarting}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center disabled:opacity-60"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {cameraStarting ? 'Starting…' : 'Start Camera'}
              </button>
            ) : !gestureConfirmed ? (
              <button
                onClick={stopCamera}
                className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                Stop Camera
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    // Multiple choice question
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center">
          {question.question}
        </h3>

        <div className="space-y-3">
          {question.options?.map((option, index) => (
            <button
              key={index}
              onClick={() => !showFeedback && handleAnswerSelect(index)}
              disabled={showFeedback}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                showFeedback
                  ? index === question.correctAnswer
                    ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500'
                    : selectedAnswer === index
                    ? 'bg-red-100 dark:bg-red-900/30 ring-2 ring-red-500'
                    : 'bg-gray-100 dark:bg-gray-800'
                  : selectedAnswer === index
                  ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-medium ${
                  showFeedback
                    ? index === question.correctAnswer
                      ? 'bg-green-500 text-white'
                      : selectedAnswer === index
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600'
                    : selectedAnswer === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-gray-800 dark:text-white">{option}</span>
              </div>
            </button>
          ))}
        </div>

        {!showFeedback && (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null}
            className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
          >
            Check Answer
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading lesson...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!lesson) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <span className="text-6xl">📚</span>
            <p className="text-gray-500 mt-4">Lesson not found</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Results screen
  if (stage === 'results') {
    const totalQuestions = lesson.questions.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100;

    return (
      <ProtectedRoute>
        <div className={`min-h-screen ${SCHOOL_THEME.growth.gradient} flex items-center justify-center p-4`}>
          <div className={`${SCHOOL_THEME.surface} rounded-3xl p-8 max-w-md w-full text-center shadow-2xl`}>
            <div className="text-6xl mb-4">
              {percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '💪'}
            </div>

            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              {percentage >= 80 ? 'Excellent!' : percentage >= 50 ? 'Good Job!' : 'Keep Practicing!'}
            </h1>

            <p className="text-gray-500 mb-6">You completed the lesson!</p>

            {/* Score Circle */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${percentage * 3.52} 352`}
                  className={percentage >= 80 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-800 dark:text-white">{percentage}%</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-500">{correctAnswers}/{totalQuestions}</p>
                <p className="text-sm text-gray-500">Correct</p>
              </div>
              <div className={`${SCHOOL_THEME.milestone.bg} rounded-xl p-4 border ${SCHOOL_THEME.milestone.border}`}>
                <p className={`text-2xl font-bold ${SCHOOL_THEME.milestone.text}`}>
                  +{xpEarned > 0 ? xpEarned : lesson.xpReward ?? 0}
                </p>
                <p className={`text-sm ${SCHOOL_THEME.scholar.muted}`}>XP Earned</p>
              </div>
            </div>

            {hasReward(lesson.xpReward) && (
              <div className="mb-4 flex justify-center">
                <RewardChips xp={xpEarned > 0 ? xpEarned : lesson.xpReward} />
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => router.back()}
                className={`w-full py-4 ${SCHOOL_THEME.growth.bgSolid} text-white font-semibold rounded-xl hover:opacity-95 transition-all`}
              >
                Continue
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // New order: content → questions → video-quiz → results
  const progressWidth = (() => {
    const hasQ  = lesson.questions.length > 0;
    const hasVQ = userRole === 'student';
    const stageCount = 1 + (hasQ ? 1 : 0) + (hasVQ ? 1 : 0);
    const stageSize  = 100 / (stageCount || 1);
    if (stage === 'content') {
      return ((currentContentIndex + 1) / (lesson.content.length || 1)) * stageSize;
    }
    if (stage === 'questions') {
      return stageSize + ((currentQuestionIndex + 1) / (lesson.questions.length || 1)) * stageSize;
    }
    if (stage === 'video-quiz') {
      const done = 1 + (hasQ ? 1 : 0);
      return done * stageSize + ((vqIndex + (vqShowResults ? 1 : 0)) / (videoQuizQuestions.length || 1)) * stageSize;
    }
    return 100;
  })();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="flex items-center gap-2 px-2 py-2 sm:px-4 sm:py-3 max-w-4xl mx-auto">

            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="shrink-0 p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close lesson"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Progress bar + stage label */}
            <div className="flex-1 min-w-0">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
                <div
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-none">
                {stage === 'content' && `${currentContentIndex + 1} of ${lesson.content.length} slides`}
                {stage === 'video-quiz' && `Video Quiz · ${vqIndex + 1} of ${videoQuizQuestions.length}`}
                {stage === 'questions' && `Quiz · Q${currentQuestionIndex + 1} of ${lesson.questions.length}`}
              </p>
            </div>

            {/* Score */}
            <div className="shrink-0 flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
              <span className="text-base sm:text-lg leading-none">⭐</span>
              <span className="text-xs sm:text-sm font-semibold text-yellow-700 dark:text-yellow-400 tabular-nums">{score}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-2 py-3 sm:px-4 sm:py-4 pb-28 sm:pb-32">
          {stage === 'content' && lesson.content.length > 0 && (() => {
            // Practice blocks first, then everything else in original order
            const sorted = [
              ...lesson.content.filter(b => b.type === 'practice'),
              ...lesson.content.filter(b => b.type !== 'practice'),
            ];
            return (
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                {renderContentBlock(sorted[currentContentIndex])}
              </div>
            );
          })()}

          {/* ── Video Quiz Stage ───────────────────────────────── */}
          {stage === 'video-quiz' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3 sm:p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">Video Quiz</p>
                    <p className="text-[11px] sm:text-xs opacity-70 leading-tight mt-0.5 truncate">No hearts lost for wrong answers</p>
                  </div>
                  {!vqShowResults && videoQuizQuestions.length > 0 && (
                    <span className="shrink-0 text-xs sm:text-sm font-semibold bg-white/20 rounded-full px-2.5 py-1">
                      {vqIndex + 1} / {videoQuizQuestions.length}
                    </span>
                  )}
                </div>
              </div>

              {vqLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
                </div>
              ) : vqShowResults ? (
                /* ── Results screen ── */
                <div className="p-4 sm:p-6 text-center">
                  <div className="text-5xl sm:text-6xl mb-3">
                    {vqScore === videoQuizQuestions.length ? '🏆' : vqScore >= videoQuizQuestions.length / 2 ? '👍' : '💪'}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-1">
                    {vqScore} / {videoQuizQuestions.length} Correct
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6">
                    {vqScore === videoQuizQuestions.length ? 'Perfect score!' : 'Keep practicing to improve your score.'}
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleVqRetry}
                      className="w-full py-3 border-2 border-purple-500 text-purple-600 dark:text-purple-400 font-semibold rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-sm sm:text-base"
                    >
                      Reattempt Quiz
                    </button>
                    <button
                      onClick={handleVqContinue}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm sm:text-base"
                    >
                      Finish Lesson
                    </button>
                  </div>
                </div>
              ) : videoQuizQuestions.length > 0 ? (
                /* ── Question screen ── */
                <div className="p-3 sm:p-6">
                  {/* Video */}
                  <div className="w-full rounded-lg sm:rounded-xl overflow-hidden bg-black mb-4">
                    {videoQuizQuestions[vqIndex].videoUrl ? (
                      <video
                        key={videoQuizQuestions[vqIndex].videoUrl}
                        src={videoQuizQuestions[vqIndex].videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        style={{ width: '100%', display: 'block', maxHeight: '45vh' }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 sm:py-14 text-gray-400 gap-2">
                        <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs sm:text-sm text-center px-4">Video not yet available — use your knowledge to answer!</p>
                      </div>
                    )}
                  </div>

                  <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    {videoQuizQuestions[vqIndex].videoUrl
                      ? videoQuizQuestions[vqIndex].question
                      : `Which sign does the word "${videoQuizQuestions[vqIndex].correctAnswer}" represent?`}
                  </p>

                  {/* Options — 2 columns on wider phones, 1 on tiny */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 mb-4">
                    {videoQuizQuestions[vqIndex].options.map(option => {
                      const isSelected = vqSelected === option;
                      const isCorrect = option === videoQuizQuestions[vqIndex].correctAnswer;
                      let cls = 'w-full text-left px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 text-sm sm:text-base font-medium transition-all ';
                      if (!vqShowFeedback) {
                        cls += isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/10';
                      } else {
                        if (isCorrect) cls += 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
                        else if (isSelected) cls += 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
                        else cls += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-50';
                      }
                      return (
                        <button key={option} onClick={() => handleVqSelect(option)} className={cls} disabled={vqShowFeedback}>
                          <span className="flex items-center gap-1.5">
                            {vqShowFeedback && isCorrect && <span className="shrink-0">✅</span>}
                            {vqShowFeedback && isSelected && !isCorrect && <span className="shrink-0">❌</span>}
                            <span className="truncate">{option}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback banner */}
                  {vqShowFeedback && (
                    <div className={`p-3 rounded-xl mb-3 text-xs sm:text-sm font-medium leading-snug ${
                      vqSelected === videoQuizQuestions[vqIndex].correctAnswer
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                    }`}>
                      {vqSelected === videoQuizQuestions[vqIndex].correctAnswer
                        ? 'Correct! Well done.'
                        : `Correct answer: "${videoQuizQuestions[vqIndex].correctAnswer}". No hearts lost — keep learning!`}
                    </div>
                  )}

                  {/* Action buttons */}
                  {!vqShowFeedback ? (
                    <button
                      onClick={handleVqSubmit}
                      disabled={!vqSelected}
                      className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl disabled:opacity-40 hover:bg-purple-700 transition-colors text-sm sm:text-base"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleVqNext}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm sm:text-base"
                    >
                      {vqIndex < videoQuizQuestions.length - 1 ? 'Next Question' : 'View Results'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center text-gray-400 py-16 text-sm">No quiz questions available.</div>
              )}
            </div>
          )}

          {stage === 'questions' && lesson.questions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="mb-3 text-xs sm:text-sm text-gray-500 text-center">
                Question {currentQuestionIndex + 1} of {lesson.questions.length}
              </div>

              {renderQuestion(lesson.questions[currentQuestionIndex])}

              {/* Feedback */}
              {showFeedback && (
                <div className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl ${
                  isCorrect
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center mb-1.5">
                    {isCorrect ? (
                      <>
                        <span className="text-xl sm:text-2xl mr-2">✅</span>
                        <span className="font-semibold text-sm sm:text-base text-green-700 dark:text-green-300">Correct!</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl sm:text-2xl mr-2">❌</span>
                        <span className="font-semibold text-sm sm:text-base text-red-700 dark:text-red-300">Not quite right</span>
                      </>
                    )}
                  </div>
                  {lesson.questions[currentQuestionIndex].explanation && (
                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                      {lesson.questions[currentQuestionIndex].explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty content/questions */}
          {stage === 'content' && lesson.content.length === 0 && lesson.questions.length > 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">This lesson has only questions. Let&apos;s begin!</p>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            {stage === 'content' && (
              <>
                <button
                  onClick={handlePrevContent}
                  disabled={currentContentIndex === 0}
                  className="shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium disabled:opacity-30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextContent}
                  className="flex-1 sm:flex-none px-5 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  {currentContentIndex < lesson.content.length - 1
                    ? 'Next'
                    : lesson.questions.length > 0
                    ? 'Start Quiz'
                    : userRole === 'student'
                    ? 'Video Quiz'
                    : 'Complete'}
                </button>
              </>
            )}

            {stage === 'questions' && showFeedback && (
              <button
                onClick={handleNextQuestion}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                {currentQuestionIndex < lesson.questions.length - 1 ? 'Next Question' : 'See Results'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
