import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { teacherSubjectService, enrollmentService, gradeService, attendanceService } from '../services/api';
import { Grade, Attendance } from '../lib/supabase';
import { BookOpen, Users, Plus, Calendar, Award } from 'lucide-react';

interface SubjectWithEnrollments {
  id: string;
  name: string;
  code: string;
  enrollments: Array<{
    id: string;
    student_id: string;
    profiles: {
      id: string;
      first_name: string;
      last_name: string;
    };
  }>;
}

export function TeacherDashboard() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithEnrollments[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'grades' | 'attendance'>('grades');
  const [loading, setLoading] = useState(true);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);

  const [newGrade, setNewGrade] = useState({
    grade_type: 'assignment' as Grade['grade_type'],
    grade_value: '',
    max_value: '100',
    weight: '1',
    description: ''
  });

  const [newAttendance, setNewAttendance] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'present' as Attendance['status'],
    notes: ''
  });

  const [enrollmentGrades, setEnrollmentGrades] = useState<Record<string, Grade[]>>({});
  const [enrollmentAttendance, setEnrollmentAttendance] = useState<Record<string, Attendance[]>>({});

  useEffect(() => {
    loadSubjects();
  }, [profile]);

  useEffect(() => {
    if (selectedSubject) {
      loadEnrollmentData();
    }
  }, [selectedSubject, activeTab]);

  const loadSubjects = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await teacherSubjectService.getTeacherSubjects(profile.id);
      const subjectsWithEnrollments = await Promise.all(
        data.map(async (ts: any) => {
          const enrollments = await enrollmentService.getSubjectEnrollments(ts.subject_id);
          return {
            id: ts.subjects.id,
            name: ts.subjects.name,
            code: ts.subjects.code,
            enrollments
          };
        })
      );
      setSubjects(subjectsWithEnrollments);
      if (subjectsWithEnrollments.length > 0 && !selectedSubject) {
        setSelectedSubject(subjectsWithEnrollments[0].id);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollmentData = async () => {
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) return;

    try {
      if (activeTab === 'grades') {
        const gradesData: Record<string, Grade[]> = {};
        for (const enrollment of subject.enrollments) {
          const grades = await gradeService.getEnrollmentGrades(enrollment.id);
          gradesData[enrollment.id] = grades;
        }
        setEnrollmentGrades(gradesData);
      } else {
        const attendanceData: Record<string, Attendance[]> = {};
        for (const enrollment of subject.enrollments) {
          const attendance = await attendanceService.getEnrollmentAttendance(enrollment.id);
          attendanceData[enrollment.id] = attendance;
        }
        setEnrollmentAttendance(attendanceData);
      }
    } catch (error) {
      console.error('Error loading enrollment data:', error);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment || !profile) return;

    try {
      await gradeService.create({
        enrollment_id: selectedEnrollment,
        teacher_id: profile.id,
        grade_type: newGrade.grade_type,
        grade_value: parseFloat(newGrade.grade_value),
        max_value: parseFloat(newGrade.max_value),
        weight: parseFloat(newGrade.weight),
        description: newGrade.description,
        graded_at: new Date().toISOString()
      });

      setShowGradeModal(false);
      setNewGrade({ grade_type: 'assignment', grade_value: '', max_value: '100', weight: '1', description: '' });
      loadEnrollmentData();
    } catch (error) {
      console.error('Error adding grade:', error);
      alert('Failed to add grade');
    }
  };

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment || !profile) return;

    try {
      await attendanceService.create({
        enrollment_id: selectedEnrollment,
        teacher_id: profile.id,
        date: newAttendance.date,
        status: newAttendance.status,
        notes: newAttendance.notes
      });

      setShowAttendanceModal(false);
      setNewAttendance({ date: new Date().toISOString().split('T')[0], status: 'present', notes: '' });
      loadEnrollmentData();
    } catch (error) {
      console.error('Error adding attendance:', error);
      alert('Failed to add attendance');
    }
  };

  const currentSubject = subjects.find(s => s.id === selectedSubject);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className={`p-4 rounded-lg border-2 transition text-left ${
                  selectedSubject === subject.id
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <BookOpen className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">
                    {subject.enrollments.length} students
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">{subject.code}</h3>
                <p className="text-sm text-gray-600 mt-1">{subject.name}</p>
              </button>
            ))}
          </div>
        </div>

        {currentSubject && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('grades')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                    activeTab === 'grades'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grades Management
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                    activeTab === 'attendance'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Attendance Tracking
                </button>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {currentSubject.name} ({currentSubject.code})
              </h3>

              {activeTab === 'grades' && (
                <div className="space-y-4">
                  {currentSubject.enrollments.map((enrollment) => {
                    const grades = enrollmentGrades[enrollment.id] || [];
                    const average = gradeService.calculateAverage(grades);

                    return (
                      <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {enrollment.profiles.first_name} {enrollment.profiles.last_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Average: <span className="font-bold text-green-600">{average.toFixed(2)}%</span>
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedEnrollment(enrollment.id);
                              setShowGradeModal(true);
                            }}
                            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Grade</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {grades.map((grade) => (
                            <div key={grade.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                              <div>
                                <span className="font-medium text-sm capitalize">{grade.grade_type}</span>
                                {grade.description && (
                                  <span className="text-sm text-gray-600 ml-2">- {grade.description}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-bold">{grade.grade_value}/{grade.max_value}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                  ({((grade.grade_value / grade.max_value) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          ))}
                          {grades.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-2">No grades yet</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  {currentSubject.enrollments.map((enrollment) => {
                    const attendance = enrollmentAttendance[enrollment.id] || [];
                    const rate = attendanceService.calculateAttendanceRate(attendance);

                    return (
                      <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {enrollment.profiles.first_name} {enrollment.profiles.last_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Attendance Rate: <span className="font-bold text-green-600">{rate.toFixed(1)}%</span>
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedEnrollment(enrollment.id);
                              setShowAttendanceModal(true);
                            }}
                            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Mark Attendance</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {attendance.slice(0, 8).map((record) => (
                            <div key={record.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded text-sm">
                              <div className={`w-2 h-2 rounded-full ${
                                record.status === 'present' ? 'bg-green-500' :
                                record.status === 'absent' ? 'bg-red-500' :
                                record.status === 'late' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`} />
                              <span className="text-gray-600">{new Date(record.date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showGradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Grade</h2>
            <form onSubmit={handleAddGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade Type</label>
                <select
                  value={newGrade.grade_type}
                  onChange={(e) => setNewGrade({ ...newGrade, grade_type: e.target.value as Grade['grade_type'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="exam">Exam</option>
                  <option value="project">Project</option>
                  <option value="midterm">Midterm</option>
                  <option value="final">Final</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={newGrade.grade_value}
                    onChange={(e) => setNewGrade({ ...newGrade, grade_value: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Value</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={newGrade.max_value}
                    onChange={(e) => setNewGrade({ ...newGrade, max_value: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                <input
                  type="number"
                  required
                  step="0.1"
                  min="0"
                  max="1"
                  value={newGrade.weight}
                  onChange={(e) => setNewGrade({ ...newGrade, weight: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={newGrade.description}
                  onChange={(e) => setNewGrade({ ...newGrade, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Add Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mark Attendance</h2>
            <form onSubmit={handleAddAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={newAttendance.date}
                  onChange={(e) => setNewAttendance({ ...newAttendance, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={newAttendance.status}
                  onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value as Attendance['status'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newAttendance.notes}
                  onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
