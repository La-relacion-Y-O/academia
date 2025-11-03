import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { teacherClassService, enrollmentService, gradeService, attendanceService } from '../services/api';
import { Grade, Attendance } from '../lib/supabase';
import { BookOpen, Users, Plus, Calendar, Award } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  code: string;
  credits: number;
  is_active: boolean;
}

interface StudentEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export function TeacherDashboard() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'grades' | 'attendance'>('grades');
  const [loading, setLoading] = useState(true);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<StudentEnrollment[]>([]);

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
    loadClasses();
  }, [profile]);

  useEffect(() => {
    if (selectedClass) {
      loadClassData();
    }
  }, [selectedClass, activeTab]);

  const loadClasses = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await teacherClassService.getTeacherClasses(profile.id);
      setClasses(data || []);
      if (data && data.length > 0 && !selectedClass) {
        setSelectedClass(data[0].id);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassData = async () => {
    if (!selectedClass) return;

    try {
      const students = await enrollmentService.getClassEnrollments(selectedClass);
      setClassStudents(students || []);

      if (activeTab === 'grades') {
        const gradesData: Record<string, Grade[]> = {};
        for (const enrollment of students || []) {
          const grades = await gradeService.getEnrollmentGrades(enrollment.id);
          gradesData[enrollment.id] = grades;
        }
        setEnrollmentGrades(gradesData);
      } else {
        const attendanceData: Record<string, Attendance[]> = {};
        for (const enrollment of students || []) {
          const attendance = await attendanceService.getEnrollmentAttendance(enrollment.id);
          attendanceData[enrollment.id] = attendance;
        }
        setEnrollmentAttendance(attendanceData);
      }
    } catch (error) {
      console.error('Error loading class data:', error);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !profile) return;

    try {
      await gradeService.create({
        enrollment_id: selectedStudent,
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
      loadClassData();
    } catch (error) {
      console.error('Error adding grade:', error);
      alert('Error al añadir calificación');
    }
  };

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !profile) return;

    try {
      await attendanceService.create({
        enrollment_id: selectedStudent,
        teacher_id: profile.id,
        date: newAttendance.date,
        status: newAttendance.status,
        notes: newAttendance.notes
      });

      setShowAttendanceModal(false);
      setNewAttendance({ date: new Date().toISOString().split('T')[0], status: 'present', notes: '' });
      loadClassData();
    } catch (error) {
      console.error('Error adding attendance:', error);
      alert('Error al añadir asistencia');
    }
  };

  const currentClass = classes.find(c => c.id === selectedClass);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mis Materias</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`p-4 rounded-lg border-2 transition text-left ${
                  selectedClass === cls.id
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <BookOpen className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">
                    {cls.credits} créditos
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">{cls.code}</h3>
                <p className="text-sm text-gray-600 mt-1">{cls.name}</p>
              </button>
            ))}
          </div>
        </div>

        {currentClass && (
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
                  Gestión de Calificaciones
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                    activeTab === 'attendance'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Seguimiento de Asistencia
                </button>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {currentClass.name} ({currentClass.code})
              </h3>

              {activeTab === 'grades' && (
                <div className="space-y-4">
                  {classStudents.map((enrollment) => {
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
                              Promedio: <span className="font-bold text-green-600">{average.toFixed(2)}%</span>
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedStudent(enrollment.id);
                              setShowGradeModal(true);
                            }}
                            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Añadir Calificación</span>
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
                            <p className="text-sm text-gray-500 text-center py-2">Aún no hay calificaciones</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  {classStudents.map((enrollment) => {
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
                              Tasa de Asistencia: <span className="font-bold text-green-600">{rate.toFixed(1)}%</span>
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedStudent(enrollment.id);
                              setShowAttendanceModal(true);
                            }}
                            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Marcar Asistencia</span>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Añadir Calificación</h2>
            <form onSubmit={handleAddGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Calificación</label>
                <select
                  value={newGrade.grade_type}
                  onChange={(e) => setNewGrade({ ...newGrade, grade_type: e.target.value as Grade['grade_type'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="assignment">Tarea</option>
                  <option value="quiz">Quiz</option>
                  <option value="exam">Examen</option>
                  <option value="project">Proyecto</option>
                  <option value="midterm">Parcial</option>
                  <option value="final">Final</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Calificación</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Máximo</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Peso</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <input
                  type="text"
                  value={newGrade.description}
                  onChange={(e) => setNewGrade({ ...newGrade, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Descripción opcional"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Añadir Calificación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Marcar Asistencia</h2>
            <form onSubmit={handleAddAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                <input
                  type="date"
                  required
                  value={newAttendance.date}
                  onChange={(e) => setNewAttendance({ ...newAttendance, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <select
                  value={newAttendance.status}
                  onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value as Attendance['status'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="present">Presente</option>
                  <option value="absent">Ausente</option>
                  <option value="late">Retrasado</option>
                  <option value="excused">Justificado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                <textarea
                  value={newAttendance.notes}
                  onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Notas opcionales..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Guardar Asistencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
