import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { subjectService, enrollmentService, gradeService, attendanceService } from '../services/api';
import { Subject, Grade, Attendance } from '../lib/supabase';
import { BookOpen, Users, Plus, Calendar, Award, Copy, Check } from 'lucide-react';

interface ClassWithEnrollments extends Subject {
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
  const [classes, setClasses] = useState<ClassWithEnrollments[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'grades' | 'attendance'>('grades');
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newClass, setNewClass] = useState({
    name: '',
    code: '',
    description: '',
    credits: 3
  });

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
      loadEnrollmentData();
    }
  }, [selectedClass, activeTab]);

  const loadClasses = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await subjectService.getTeacherClasses(profile.id);
      const classesWithEnrollments = await Promise.all(
        data.map(async (classItem: Subject) => {
          const enrollments = await enrollmentService.getSubjectEnrollments(classItem.id);
          return {
            ...classItem,
            enrollments
          };
        })
      );
      setClasses(classesWithEnrollments);
      if (classesWithEnrollments.length > 0 && !selectedClass) {
        setSelectedClass(classesWithEnrollments[0].id);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollmentData = async () => {
    const classData = classes.find(c => c.id === selectedClass);
    if (!classData) return;

    try {
      if (activeTab === 'grades') {
        const gradesData: Record<string, Grade[]> = {};
        for (const enrollment of classData.enrollments) {
          const grades = await gradeService.getEnrollmentGrades(enrollment.id);
          gradesData[enrollment.id] = grades;
        }
        setEnrollmentGrades(gradesData);
      } else {
        const attendanceData: Record<string, Attendance[]> = {};
        for (const enrollment of classData.enrollments) {
          const attendance = await attendanceService.getEnrollmentAttendance(enrollment.id);
          attendanceData[enrollment.id] = attendance;
        }
        setEnrollmentAttendance(attendanceData);
      }
    } catch (error) {
      console.error('Error loading enrollment data:', error);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const classCode = subjectService.generateClassCode();
      await subjectService.create({
        ...newClass,
        teacher_id: profile.id,
        class_code: classCode,
        is_active: true
      });

      setShowClassModal(false);
      setNewClass({ name: '', code: '', description: '', credits: 3 });
      loadClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Error al crear la clase');
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
      alert('Error al añadir calificación');
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
      alert('Error al registrar asistencia');
    }
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const currentClass = classes.find(c => c.id === selectedClass);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Mis Clases</h2>
            <p className="text-gray-600 mt-1">Gestiona tus clases y estudiantes</p>
          </div>
          <button
            onClick={() => setShowClassModal(true)}
            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Crear Clase</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {classes.map((classItem) => (
            <button
              key={classItem.id}
              onClick={() => setSelectedClass(classItem.id)}
              className={`p-5 rounded-xl border-2 transition text-left ${
                selectedClass === classItem.id
                  ? 'border-green-600 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-green-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <BookOpen className={`w-7 h-7 ${selectedClass === classItem.id ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    {classItem.enrollments.length}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{classItem.code}</h3>
              <p className="text-sm text-gray-600 mb-3">{classItem.name}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{classItem.credits} créditos</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyClassCode(classItem.class_code || '');
                  }}
                  className="flex items-center space-x-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition"
                >
                  {copiedCode === classItem.class_code ? (
                    <>
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{classItem.class_code}</span>
                    </>
                  )}
                </button>
              </div>
            </button>
          ))}

          {classes.length === 0 && !loading && (
            <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No tienes clases aún</p>
              <p className="text-gray-500 text-sm mt-1">Crea tu primera clase para comenzar</p>
            </div>
          )}
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
                  <Award className="w-4 h-4 inline mr-2" />
                  Calificaciones
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                    activeTab === 'attendance'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Asistencia
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">{currentClass.name}</h3>
                <p className="text-gray-600">{currentClass.description}</p>
              </div>

              {activeTab === 'grades' && (
                <div className="space-y-4">
                  {currentClass.enrollments.map((enrollment) => {
                    const grades = enrollmentGrades[enrollment.id] || [];
                    const average = gradeService.calculateAverage(grades);

                    return (
                      <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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
                              setSelectedEnrollment(enrollment.id);
                              setShowGradeModal(true);
                            }}
                            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Añadir</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {grades.map((grade) => (
                            <div key={grade.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                              <div>
                                <span className="font-medium text-sm capitalize text-gray-900">{grade.grade_type}</span>
                                {grade.description && (
                                  <span className="text-sm text-gray-600 ml-2">- {grade.description}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-gray-900">{grade.grade_value}/{grade.max_value}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                  ({((grade.grade_value / grade.max_value) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          ))}
                          {grades.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-3">Sin calificaciones</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {currentClass.enrollments.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No hay estudiantes inscritos</p>
                      <p className="text-gray-500 text-sm mt-1">Comparte el código de clase para que se unan</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  {currentClass.enrollments.map((enrollment) => {
                    const attendance = enrollmentAttendance[enrollment.id] || [];
                    const rate = attendanceService.calculateAttendanceRate(attendance);

                    return (
                      <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {enrollment.profiles.first_name} {enrollment.profiles.last_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Asistencia: <span className="font-bold text-green-600">{rate.toFixed(1)}%</span>
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedEnrollment(enrollment.id);
                              setShowAttendanceModal(true);
                            }}
                            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Marcar</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {attendance.slice(0, 8).map((record) => (
                            <div key={record.id} className="flex items-center space-x-2 bg-white p-2 rounded text-sm border border-gray-200">
                              <div className={`w-2 h-2 rounded-full ${
                                record.status === 'present' ? 'bg-green-500' :
                                record.status === 'absent' ? 'bg-red-500' :
                                record.status === 'late' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`} />
                              <span className="text-gray-600 text-xs">{new Date(record.date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                        {attendance.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-3">Sin registros de asistencia</p>
                        )}
                      </div>
                    );
                  })}

                  {currentClass.enrollments.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No hay estudiantes inscritos</p>
                      <p className="text-gray-500 text-sm mt-1">Comparte el código de clase para que se unan</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Crear Nueva Clase</h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Código de Materia</label>
                <input
                  type="text"
                  required
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="p. ej., MAT101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Clase</label>
                <input
                  type="text"
                  required
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="p. ej., Cálculo I"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Créditos</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="6"
                  value={newClass.credits}
                  onChange={(e) => setNewClass({ ...newClass, credits: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descripción de la clase..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Crear Clase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Añadir Calificación</h2>
            <form onSubmit={handleAddGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Puntos</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Máximo</label>
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
                  placeholder="Opcional"
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
                  Añadir
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
