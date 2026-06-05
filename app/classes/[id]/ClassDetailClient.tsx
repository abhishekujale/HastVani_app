'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { classApi, assignmentApi } from '@/lib/api';
import { ROUTES, ROLES } from '@/lib/config';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CustomHeader from '@/components/CustomHeader';
import type { Class, Assignment, User } from '@/types';
import { SCHOOL_THEME } from '@/lib/schoolTheme';

type Tab = 'assignments' | 'members';

export default function ClassDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [classData, setClassData] = useState<Class | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('assignments');
  const [error, setError] = useState<string | null>(null);
  const [addStudentEmail, setAddStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [bulkEmailsText, setBulkEmailsText] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    added: number;
    skipped: number;
    failed: number;
    outcomes?: Array<{ email: string; status: string; reason?: string }>;
  } | null>(null);

  const classId = params.id as string;
  const isTeacher = user?.role === ROLES.TEACHER || user?.role === ROLES.ADMIN;

  useEffect(() => {
    if (classId) {
      fetchClassData();
    }
  }, [classId]);

  const fetchStudents = async () => {
    if (!isTeacher) return;
    const studentsRes = await classApi.getStudents(classId);
    setStudents(studentsRes.data.data || []);
  };

  const refreshClassMeta = async () => {
    const classRes = await classApi.getById(classId);
    setClassData(classRes.data.data);
  };

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const [classRes, assignmentsRes] = await Promise.all([
        classApi.getById(classId),
        assignmentApi.getByClass(classId),
      ]);

      setClassData(classRes.data.data);
      setAssignments(assignmentsRes.data.data || []);

      if (isTeacher) {
        await fetchStudents();
      }
    } catch (err) {
      console.error('Failed to fetch class data:', err);
      setError('Failed to load class details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTeacher) return;
    const email = addStudentEmail.trim().toLowerCase();
    if (!email) return;

    setAddingStudent(true);
    setAddStudentError(null);
    setBulkResult(null);
    try {
      await classApi.addStudent(classId, { email });
      setAddStudentEmail('');
      await fetchStudents();
      await refreshClassMeta();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddStudentError(msg || 'Failed to add student. Please try again.');
    } finally {
      setAddingStudent(false);
    }
  };

  const downloadBulkTemplate = () => {
    const csv = 'email\nstudent1@example.com\nstudent2@example.com\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-enrollment-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTeacher) return;
    if (!bulkFile && !bulkEmailsText.trim()) return;

    setBulkUploading(true);
    setAddStudentError(null);
    setBulkResult(null);
    try {
      const res = bulkFile
        ? await classApi.addStudentsBulkFile(classId, bulkFile)
        : await classApi.addStudentsBulk(classId, { emailsText: bulkEmailsText });

      const summary = res.data.data?.summary;
      const outcomes = res.data.data?.outcomes;
      if (summary) {
        setBulkResult({
          added: summary.added,
          skipped: summary.skipped,
          failed: summary.failed,
          outcomes,
        });
      }
      setBulkEmailsText('');
      setBulkFile(null);
      await fetchStudents();
      await refreshClassMeta();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddStudentError(msg || 'Bulk enrollment failed. Check your file or email list.');
    } finally {
      setBulkUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error || 'Class not found'}</h2>
        <button
          onClick={() => router.push(ROUTES.CLASSES)}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          &larr; Back to Classes
        </button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${SCHOOL_THEME.canvas} pb-20`}>
        <CustomHeader title={classData.className ?? classData.name ?? 'Class'} showBack />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">{classData.description}</p>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full mr-2">
                  Code: <span className="font-mono font-bold text-primary-600 dark:text-primary-400">{classData.classCode}</span>
                </span>
                <span>{classData.participants?.length ?? classData.students?.length ?? 0} Students</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'assignments'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Assignments
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'members'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Members
                </button>
              </nav>
            </div>
          </div>

          {activeTab === 'assignments' && (
            <div>
              {isTeacher && (
                <div className="mb-6 flex justify-end">
                  <button
                    onClick={() => router.push(`${ROUTES.CLASSES}/${classId}/assignments/create`)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary-700 transition"
                  >
                    + Create Assignment
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {assignments.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No assignments yet.</p>
                  </div>
                ) : (
                  assignments.map((assignment) => (
                    <div
                      key={assignment._id}
                      onClick={() => {
                        if (!isTeacher) router.push(`/assignments/${assignment._id}`);
                      }}
                      className={`bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${!isTeacher ? 'cursor-pointer hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all' : ''
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {assignment.assignName ?? assignment.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${assignment.isPublished
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                          {assignment.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {!isTeacher && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/assignments/${assignment._id}`);
                            }}
                            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition"
                          >
                            Attempt Quiz
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              {isTeacher && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Add student by email
                    </h3>
                    <form onSubmit={handleAddStudent} className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        value={addStudentEmail}
                        onChange={(e) => setAddStudentEmail(e.target.value)}
                        placeholder="student@example.com"
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={addingStudent || !addStudentEmail.trim()}
                        className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        {addingStudent ? 'Adding...' : 'Add Student'}
                      </button>
                    </form>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Bulk enroll (Excel or CSV)
                    </h3>
                    <form onSubmit={handleBulkEnroll} className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                          className="flex-1 text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300"
                        />
                        <button
                          type="button"
                          onClick={downloadBulkTemplate}
                          className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          Download template
                        </button>
                      </div>
                      <textarea
                        value={bulkEmailsText}
                        onChange={(e) => setBulkEmailsText(e.target.value)}
                        placeholder="Or paste emails (comma or newline separated)"
                        rows={3}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        type="submit"
                        disabled={bulkUploading || (!bulkFile && !bulkEmailsText.trim())}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        {bulkUploading ? 'Processing...' : 'Bulk Add Students'}
                      </button>
                    </form>
                  </div>

                  {bulkResult && (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-4 py-3 rounded-xl text-sm">
                      <p className="font-medium">
                        Added {bulkResult.added}, skipped {bulkResult.skipped}, failed {bulkResult.failed}
                      </p>
                      {bulkResult.outcomes && bulkResult.failed > 0 && (
                        <ul className="mt-2 space-y-1 text-xs">
                          {bulkResult.outcomes
                            .filter((o) => o.status === 'failed')
                            .slice(0, 5)
                            .map((o) => (
                              <li key={o.email}>
                                {o.email}: {o.reason}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {addStudentError && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                      {addStudentError}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload a spreadsheet with an <span className="font-mono">email</span> column, or paste multiple addresses. Students must already be registered.
                  </p>
                </div>
              )}
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map((student) => (
                  <li key={student._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-lg font-bold mr-3">
                        {student.firstName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                      </div>
                    </div>
                    {student.level != null && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SCHOOL_THEME.growth.bg} ${SCHOOL_THEME.growth.text}`}>
                        Lvl {student.level}
                      </span>
                    )}
                  </li>
                ))}
                {students.length === 0 && (
                  <li className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No students enrolled yet.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
