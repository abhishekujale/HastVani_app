'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Play,
  CheckCircle,
  Clock,
  Star,
  AlertTriangle,
  BookOpen,
  Zap,
  Volume2,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { assignmentApi, lessonApi } from '@/lib/api';
import { MEDIA_CONFIG } from '@/lib/config';
import { getQuestionPoints } from '@/lib/gamificationDisplay';
import { SCHOOL_THEME } from '@/lib/schoolTheme';
import { RewardChips } from '@/components/gamification';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// Fallback Alert components in case '@/components/ui/alert' is not available
function Alert({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) {
  const base = 'rounded border p-3 flex items-start gap-2';
  const variantClass =
    variant === 'destructive'
      ? 'bg-red-50 border-red-200 text-red-900'
      : 'bg-background border-border text-foreground';
  return <div className={`${base} ${variantClass} ${className ?? ''}`}>{children}</div>;
}

function AlertDescription({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}
import { Progress } from '@/components/ui/progress';

// Lightweight local Tabs implementation as a fallback if '@/components/ui/tabs' is unavailable
type TabsContextType = { value?: string; setValue: (v: string) => void };
const TabsContext = createContext<TabsContextType | undefined>(undefined);

function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = useState<string | undefined>(value);
  useEffect(() => setInternal(value), [value]);
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value: internal, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx?.setValue(value)}
      className={`${className ?? ''} ${active ? 'aria-selected' : ''}`}
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={className}>{children}</div>;
}

import type { Assignment, Lesson, Question } from '@/types';

interface AssignmentWithLesson extends Assignment {
  lesson: Lesson & { questions: Question[] };
  module: any;
  class: any;
  status?: string;
  gemsReward?: number;
}

interface QuizState {
  currentQuestionIndex: number;
  answers: Record<number, string | number>;
  showAnswers: boolean;
  completed: boolean;
  score?: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800 border-green-300',
  intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  advanced: 'bg-red-100 text-red-800 border-red-300',
};

export default function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<AssignmentWithLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    showAnswers: false,
    completed: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch assignment & lesson data
  useEffect(() => {
    const fetchAssignment = async () => {
      setLoading(true);
      try {
        const { id } = await params; // ← Await the params Promise
        const res = await assignmentApi.getById(id);
        const assignmentData = res.data.data;

        // If lessons are IDs, fetch the first lesson with questions
        if (assignmentData.lesson) {
          if (typeof assignmentData.lesson === 'string') {
            const lessonRes = await lessonApi.getById(assignmentData.lesson);
            assignmentData.lesson = lessonRes.data.data;
          } else if (assignmentData.lesson._id && !assignmentData.lesson.questions) {
            const lessonRes = await lessonApi.getById(assignmentData.lesson._id);
            assignmentData.lesson = lessonRes.data.data;
          }
        }

        setAssignment(assignmentData);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load assignment');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [params]); // ← Update dependency to just [params]

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background pb-24">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded" />
              <Skeleton className="flex-1 h-6" />
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !assignment) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background pb-24">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold">Assignment</h1>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 py-12">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error || 'Assignment not found'}</AlertDescription>
            </Alert>
            <Button onClick={() => router.back()} className="mt-4">Back</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const lesson = assignment.lesson;
  const questions = lesson?.questions || [];
  const currentQuestion = questions[quizState.currentQuestionIndex];
  const progress = ((quizState.currentQuestionIndex + 1) / questions.length) * 100;
  const totalPoints = questions.reduce((sum, q) => sum + getQuestionPoints(q.points), 0);

  const handleAnswerSelect = (answer: string | number) => {
    setQuizState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [quizState.currentQuestionIndex]: answer,
      },
    }));
  };

  const handleNextQuestion = () => {
    if (quizState.currentQuestionIndex < questions.length - 1) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    }
  };

  const handlePrevQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
      }));
    }
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      // Calculate score
      let score = 0;
      questions.forEach((q, idx) => {
        if (quizState.answers[idx] === q.correctAnswer) {
          score += getQuestionPoints(q.points);
        }
      });

      const percentage = (score / totalPoints) * 100;

      // Convert answers record to array expected by the API: { questionIndex, answer }[]
      const answersArray = Object.entries(quizState.answers).map(([key, value]) => ({
        questionIndex: Number(key),
        answer: value,
      }));

      // Submit to backend -- only pass properties the API type accepts
      await lessonApi.complete(lesson._id, {
        answers: answersArray,
        // include timeSpent if the backend expects it; use 0 as a default for now
        timeSpent: 0,
      });

      setQuizState((prev) => ({
        ...prev,
        completed: true,
        score,
        showAnswers: true,
      }));

      alert(`✓ Assignment completed! Score: ${percentage.toFixed(0)}%`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    let earnedPoints = 0;
    questions.forEach((q, idx) => {
      if (quizState.answers[idx] === q.correctAnswer) {
        correct += 1;
        earnedPoints += getQuestionPoints(q.points);
      }
    });
    return { correct, total: questions.length, earnedPoints, totalPoints };
  };

  const { correct, total, earnedPoints } = calculateScore();
  const scorePercentage = (correct / total) * 100;
  const isPassing = scorePercentage >= 70;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate">{assignment.title}</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {assignment.class?.className}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
          {/* Assignment Info Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {assignment.title}
                  </h2>
                  {assignment.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {assignment.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {assignment.status || 'active'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`space-y-2 sm:col-span-2 ${SCHOOL_THEME.growth.bg} rounded-lg p-3 border ${SCHOOL_THEME.growth.border}`}>
                  <p className={`text-xs font-medium ${SCHOOL_THEME.scholar.muted}`}>Rewards</p>
                  <RewardChips xp={assignment.xpReward} gems={assignment.gemsReward} />
                </div>

                <div className="space-y-1">
                  <p className={`text-xs ${SCHOOL_THEME.scholar.muted}`}>Questions</p>
                  <p className={`text-lg font-bold ${SCHOOL_THEME.growth.text}`}>
                    {questions.length}
                  </p>
                </div>

                {assignment.dueDate && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Due Date</p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs: Content & Quiz */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">
                <BookOpen className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="quiz" className="relative">
                <Zap className="h-4 w-4 mr-2" />
                Quiz ({quizState.currentQuestionIndex + 1}/{questions.length})
                {quizState.completed && (
                  <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              {lesson?.content && lesson.content.length > 0 ? (
                <div className="space-y-6">
                  {lesson.content.map((block, idx) => (
                    <ContentBlock key={idx} block={block} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No content available for this assignment.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Quiz Tab */}
            <TabsContent value="quiz" className="space-y-4">
              {questions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No questions in this assignment.
                  </CardContent>
                </Card>
              ) : quizState.completed ? (
                // Results Screen
                <div className="space-y-6">
                  <Card className={`${isPassing ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <CardContent className="p-8 text-center space-y-4">
                      {isPassing ? (
                        <>
                          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                          <h2 className="text-2xl font-bold text-green-900">Great Job! 🎉</h2>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-16 w-16 text-red-600 mx-auto" />
                          <h2 className="text-2xl font-bold text-red-900">Keep Trying 💪</h2>
                        </>
                      )}

                      <div className="space-y-2">
                        <p className="text-lg text-gray-700">
                          <span className="font-bold text-2xl">{scorePercentage.toFixed(0)}%</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          {correct} out of {total} questions correct
                        </p>
                      </div>

                      <div className="pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Score:</span>
                          <span className="font-bold">{earnedPoints}/{totalPoints}</span>
                        </div>
                        <Progress value={scorePercentage} className="h-3" />
                      </div>

                      {isPassing && (
                        <div className={`pt-4 space-y-2 ${SCHOOL_THEME.success.text}`}>
                          <p className="text-sm font-semibold">Rewards earned</p>
                          <RewardChips xp={assignment.xpReward} gems={assignment.gemsReward} layout="stack" />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Review Answers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Review Your Answers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                      {questions.map((q, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border-2 ${quizState.answers[idx] === q.correctAnswer
                            ? 'bg-green-50 border-green-300'
                            : 'bg-red-50 border-red-300'
                            }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {quizState.answers[idx] === q.correctAnswer ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.question}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Your answer: <span className="font-semibold">{quizState.answers[idx] || 'Not answered'}</span>
                              </p>
                              {quizState.answers[idx] !== q.correctAnswer && (
                                <p className="text-xs text-green-700 mt-1">
                                  Correct answer: <span className="font-semibold">{q.correctAnswer}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-gray-700 pl-7 pt-2 border-t mt-2">
                              💡 {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.back()} className="flex-1">
                      Back to Classes
                    </Button>
                    <Button
                      onClick={() => {
                        setQuizState({
                          currentQuestionIndex: 0,
                          answers: {},
                          showAnswers: false,
                          completed: false,
                        });
                        setActiveTab('quiz');
                      }}
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retake Quiz
                    </Button>
                  </div>
                </div>
              ) : (
                // Quiz in Progress
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Question {quizState.currentQuestionIndex + 1} of {questions.length}</span>
                      <span className="text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  {/* Current Question */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{currentQuestion?.question}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-2">
                        Points: <span className="font-bold">{getQuestionPoints(currentQuestion?.points)}</span>
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {String(currentQuestion?.type) === 'multiple_choice' && (
                        <div className="space-y-3">
                          {currentQuestion.options?.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAnswerSelect(option)}
                              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${quizState.answers[quizState.currentQuestionIndex] === option
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                            >
                              <p className="font-medium text-sm">{option}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      {String(currentQuestion?.type) === 'true_false' && (
                        <div className="grid grid-cols-2 gap-3">
                          {['True', 'False'].map((option) => (
                            <button
                              key={option}
                              onClick={() => handleAnswerSelect(option)}
                              className={`p-4 rounded-lg border-2 font-medium transition-all ${quizState.answers[quizState.currentQuestionIndex] === option
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}

                      {String(currentQuestion?.type) === 'short_answer' && (
                        <input
                          type="text"
                          placeholder="Type your answer..."
                          value={(quizState.answers[quizState.currentQuestionIndex] as string) || ''}
                          onChange={(e) => handleAnswerSelect(e.target.value)}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Navigation & Submit */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handlePrevQuestion}
                      disabled={quizState.currentQuestionIndex === 0}
                      className="flex-1"
                    >
                      ← Previous
                    </Button>
                    {quizState.currentQuestionIndex < questions.length - 1 ? (
                      <Button onClick={handleNextQuestion} className="flex-1">
                        Next →
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitQuiz}
                        disabled={submitting}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {submitting ? 'Submitting...' : 'Submit Assignment'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Content Block Component (same as lesson page)
// ═════════════════════════════════════════════════════════════════════════
function ContentBlock({ block }: { block: any }) {
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  if (block.type === 'text') {
    return (
      <Card>
        <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {block.content}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (block.type === 'video' || block.type === 'gesture_demo') {
    const videoUrl = block.mediaPublicId
      ? `${MEDIA_CONFIG.MEDIA_BASE_URL}${MEDIA_CONFIG.VIDEO_BASE_PATH}/${block.mediaPublicId}`
      : block.mediaUrl;

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full bg-black rounded-lg overflow-hidden">
            <video
              src={videoUrl}
              controls
              muted={isMuted}
              className="w-full aspect-video object-cover"
            />
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 p-2 rounded-lg text-white transition"
            >
              {isMuted ? <Volume2 className="h-5 w-5" /> : <Volume2 className="h-5 w-5 opacity-50" />}
            </button>
          </div>
          {block.type === 'gesture_demo' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                👋 This is a gesture demonstration. Watch carefully and try to replicate the movement.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (block.type === 'image') {
    const imageUrl = block.mediaPublicId
      ? `${MEDIA_CONFIG.MEDIA_BASE_URL}${MEDIA_CONFIG.IMAGE_BASE_PATH}/${block.mediaPublicId}`
      : block.mediaUrl;

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <img
            src={imageUrl}
            alt="Lesson content"
            className="w-full h-auto rounded-lg"
          />
        </CardContent>
      </Card>
    );
  }

  if (block.type === 'practice') {
    return (
      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="h-4 w-4" />
            Practice Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 dark:text-gray-300">{block.content}</p>
        </CardContent>
      </Card>
    );
  }

  return null;
}

