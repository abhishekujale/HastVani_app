'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { assignmentApi, classApi, lessonApi, moduleApi } from '@/lib/api';
import { ROUTES, ROLES } from '@/lib/config';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RoleGuard from '@/components/auth/RoleGuard';
import CustomHeader from '@/components/CustomHeader';
import type { Class, Module, Lesson } from '@/types';

export default function CreateAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [classData, setClassData] = useState<Class | null>(null);
  const [lessonsByModule, setLessonsByModule] = useState<Array<{ module: { _id: string; moduleName: string }; lessons: Lesson[] }>>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  const [formData, setFormData] = useState({
    assignName: '',
    description: '',
    type: 'lesson' as 'lesson' | 'quiz',
    startDate: '',
    dueDate: '',
    marks: 100,
    xpReward: 20,
    shuffleQuestions: false,
    isPublished: true,
  });

  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch class and lessons from its modules. If the class has not been linked
  // to modules yet, fall back to all modules the teacher can access.
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingModules(true);
        setError(null);
        const classRes = await classApi.getById(classId);
        const cls = classRes.data.data as Class;
        setClassData(cls);

        const rawModules = cls.modules || [];
        let modules = rawModules
          .map((m: string | Module) =>
            typeof m === 'string'
              ? { _id: m, moduleName: 'Module' }
              : { _id: m._id, moduleName: m.moduleName || 'Module' }
          )
          .filter((m) => Boolean(m._id));

        if (modules.length === 0) {
          const modulesRes = await moduleApi.getAll();
          modules = ((modulesRes.data.data || []) as Module[]).map((m) => ({
            _id: m._id,
            moduleName: m.moduleName || 'Module',
          }));
        }

        const results: Array<{ module: { _id: string; moduleName: string }; lessons: Lesson[] }> = [];
        for (const module of modules) {
          try {
            const lessonsRes = await lessonApi.getByModule(module._id);
            const lessons = (lessonsRes.data.data || []) as Lesson[];
            if (lessons.length > 0) {
              const first = lessons[0];
              const mod =
                first && typeof first.moduleId === 'object' && first.moduleId
                  ? { _id: (first.moduleId as { _id: string })._id, moduleName: (first.moduleId as { moduleName?: string }).moduleName || 'Module' }
                  : module;
              results.push({ module: mod, lessons });
            }
          } catch {
            // Skip modules that fail
          }
        }
        setLessonsByModule(results);
      } catch (err) {
        console.error('Failed to fetch class/modules:', err);
        setError('Failed to load modules. Make sure the backend is running and modules have lessons.');
      } finally {
        setLoadingModules(false);
      }
    };

    if (classId) fetchData();
  }, [classId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? parseInt(value) || 0
          : type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : value,
    }));
  };

  const toggleLesson = (lessonId: string) => {
    setSelectedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  };

  const selectAllInModule = (lessons: Lesson[]) => {
    const ids = lessons.map((l) => l._id);
    setSelectedLessons((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const toISOString = (localDateTime: string) => {
    if (!localDateTime) return '';
    const d = new Date(localDateTime);
    return d.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLessons.length === 0) {
      setError('Select at least one lesson for this assignment.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startDate = formData.startDate ? toISOString(formData.startDate) : now.toISOString();
      const dueDate = toISOString(formData.dueDate);

      await assignmentApi.create({
        assignName: formData.assignName,
        classId,
        description: formData.description || undefined,
        marks: formData.marks,
        lessons: selectedLessons,
        startDate,
        dueDate,
        xpReward: formData.xpReward,
        isPublished: formData.isPublished,
        settings:
          formData.type === 'quiz'
            ? { shuffleQuestions: formData.shuffleQuestions, showCorrectAnswers: true }
            : undefined,
      });

      router.push(`${ROUTES.CLASSES}/${classId}`);
    } catch (err) {
      console.error('Failed to create assignment:', err);
      setError('Failed to create assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.ADMIN]}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
          <CustomHeader title="Create Assignment" showBack />

          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6">
                <h1 className="text-xl font-bold text-white">New Assignment</h1>
                <p className="text-primary-100 text-sm mt-1">
                  Select lessons from {classData?.className ?? 'class'} modules
                </p>
              </div>

              {loadingModules ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Assignment Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="assignName"
                      type="text"
                      required
                      value={formData.assignName}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Week 1 Quiz"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as 'lesson' | 'quiz' }))}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="lesson">Lesson (complete selected lessons)</option>
                      <option value="quiz">Quiz (questions from selected lessons)</option>
                    </select>
                  </div>

                  {formData.type === 'quiz' && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        name="shuffleQuestions"
                        checked={formData.shuffleQuestions}
                        onChange={handleChange}
                        className="rounded border-gray-300"
                      />
                      Shuffle questions
                    </label>
                  )}

                  {/* Publish */}
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="isPublished"
                      checked={formData.isPublished}
                      onChange={handleChange}
                      className="rounded border-gray-300"
                    />
                    Publish now (visible to students after start date)
                  </label>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 resize-none"
                      placeholder="Instructions for students..."
                    />
                  </div>

                  {/* Select Lessons from Modules */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Lessons <span className="text-red-500">*</span> (select from class modules)
                    </label>
                    {lessonsByModule.length === 0 ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-xl text-sm">
                        No lessons found in available modules. Add lessons to a module first, then create assignments.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                        {lessonsByModule.map(({ module, lessons }) => (
                          <div key={module._id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
                            <button
                              type="button"
                              onClick={() => selectAllInModule(lessons)}
                              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline mb-2"
                            >
                              {module.moduleName} – {lessons.length} lessons (toggle all)
                            </button>
                            <ul className="space-y-2">
                              {lessons.map((lesson) => (
                                <li key={lesson._id} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`lesson-${lesson._id}`}
                                    checked={selectedLessons.includes(lesson._id)}
                                    onChange={() => toggleLesson(lesson._id)}
                                    className="rounded border-gray-300"
                                  />
                                  <label
                                    htmlFor={`lesson-${lesson._id}`}
                                    className="text-sm text-gray-900 dark:text-white cursor-pointer"
                                  >
                                    {lesson.title}
                                    {lesson.questions?.length ? (
                                      <span className="text-gray-500 ml-1">
                                        ({lesson.questions.length} questions)
                                      </span>
                                    ) : null}
                                  </label>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedLessons.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">{selectedLessons.length} lesson(s) selected</p>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Start Date
                      </label>
                      <input
                        name="startDate"
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="dueDate"
                        type="datetime-local"
                        required
                        value={formData.dueDate}
                        onChange={handleChange}
                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Marks & XP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Total Marks
                      </label>
                      <input
                        name="marks"
                        type="number"
                        min={0}
                        value={formData.marks}
                        onChange={handleChange}
                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        XP Reward
                      </label>
                      <input
                        name="xpReward"
                        type="number"
                        min={0}
                        value={formData.xpReward}
                        onChange={handleChange}
                        className="block w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || lessonsByModule.length === 0 || selectedLessons.length === 0}
                      className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Assignment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </RoleGuard>
    </ProtectedRoute>
  );
}
