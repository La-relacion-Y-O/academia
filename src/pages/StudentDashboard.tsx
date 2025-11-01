import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { enrollmentService, gradeService, attendanceService, subjectService } from '../services/api';
import { Grade, Attendance } from '../lib/supabase';
import { BookOpen, Award, Calendar, Plus, Download, AlertCircle } from 'lucide-react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface EnrollmentData {
  id: string;
  subject: {
    id: string;
    name: string;
    code: string;
    credits: number;
  };
  grades: Grade[];
  attendance: Attendance[];
  average: number;
  attendanceRate: number;
}

export function StudentDashboard() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    loadEnrollments();
  }, [profile]);

  const loadEnrollments = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const enrollmentsData = await enrollmentService.getStudentEnrollments(profile.id);

      const enrichedData = await Promise.all(
        enrollmentsData.map(async (enrollment: any) => {
          const grades = await gradeService.getEnrollmentGrades(enrollment.id);
          const attendance = await attendanceService.getEnrollmentAttendance(enrollment.id);
          const average = gradeService.calculateAverage(grades);
          const attendanceRate = attendanceService.calculateAttendanceRate(attendance);

          return {
            id: enrollment.id,
            subject: enrollment.subjects,
            grades,
            attendance,
            average,
            attendanceRate
          };
        })
      );

      setEnrollments(enrichedData);
      if (enrichedData.length > 0 && !selectedSubject) {
        setSelectedSubject(enrichedData[0].id);
      }
    } catch (error) {
      console.error('Error loading enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    if (!profile || !classCode.trim()) return;

    try {
      const classData = await subjectService.getByClassCode(classCode.trim().toUpperCase());

      if (!classData) {
        setJoinError('Código de clase inválido. Verifica el código e intenta nuevamente.');
        return;
      }

      const isAlreadyEnrolled = await enrollmentService.isEnrolled(profile.id, classData.id);

      if (isAlreadyEnrolled) {
        setJoinError('Ya estás inscrito en esta clase.');
        return;
      }

      await enrollmentService.joinClass(profile.id, classData.id);

      setShowJoinModal(false);
      setClassCode('');
      loadEnrollments();
    } catch (error) {
      console.error('Error joining class:', error);
      setJoinError('Error al unirse a la clase. Intenta nuevamente.');
    }
  };

  const currentEnrollment = enrollments.find(e => e.id === selectedSubject);

  const overallAverage = enrollments.length > 0
    ? enrollments.reduce((sum, e) => sum + e.average, 0) / enrollments.length
    : 0;

  const overallAttendance = enrollments.length > 0
    ? enrollments.reduce((sum, e) => sum + e.attendanceRate, 0) / enrollments.length
    : 0;

  const attendanceChartData = {
    labels: ['Presente', 'Ausente', 'Retrasado', 'Justificado'],
    datasets: [{
      data: currentEnrollment ? [
        currentEnrollment.attendance.filter(a => a.status === 'present').length,
        currentEnrollment.attendance.filter(a => a.status === 'absent').length,
        currentEnrollment.attendance.filter(a => a.status === 'late').length,
        currentEnrollment.attendance.filter(a => a.status === 'excused').length,
      ] : [0, 0, 0, 0],
      backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'],
      borderWidth: 0,
    }]
  };

  const gradesOverTimeData = {
    labels: currentEnrollment?.grades.map((_, i) => `Calificación ${i + 1}`) || [],
    datasets: [{
      label: 'Porcentaje',
      data: currentEnrollment?.grades.map(g => (g.grade_value / g.max_value) * 100) || [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };

  const subjectPerformanceData = {
    labels: enrollments.map(e => e.subject.code),
    datasets: [{
      label: 'Promedio (%)',
      data: enrollments.map(e => e.average),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
    }]
  };

  const exportReport = () => {
    if (!currentEnrollment) return;

    const reportData = `
Reporte Académico
Estudiante: ${profile?.first_name} ${profile?.last_name}
Materia: ${currentEnrollment.subject.name} (${currentEnrollment.subject.code})
Generado: ${new Date().toLocaleString()}

Promedio General: ${currentEnrollment.average.toFixed(2)}%
Tasa de Asistencia: ${currentEnrollment.attendanceRate.toFixed(2)}%

Calificaciones:
${currentEnrollment.grades.map(g =>
  `- ${g.grade_type}: ${g.grade_value}/${g.max_value} (${((g.grade_value / g.max_value) * 100).toFixed(2)}%)${g.description ? ' - ' + g.description : ''}`
).join('\n')}

Registros de Asistencia:
${currentEnrollment.attendance.map(a =>
  `- ${new Date(a.date).toLocaleDateString()}: ${a.status}${a.notes ? ' - ' + a.notes : ''}`
).join('\n')}
    `.trim();

    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEnrollment.subject.code}_reporte_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Mis Clases</h2>
            <p className="text-gray-600 mt-1">Visualiza tus calificaciones y asistencia</p>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Unirse a Clase</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clases Inscritas</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{enrollments.length}</p>
              </div>
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Promedio General</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overallAverage.toFixed(1)}%</p>
              </div>
              <Award className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Asistencia</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overallAttendance.toFixed(1)}%</p>
              </div>
              <Calendar className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>

        {enrollments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Rendimiento por Clase</h2>
            <div className="h-64">
              <Bar
                data={subjectPerformanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {enrollments.map((enrollment) => (
            <button
              key={enrollment.id}
              onClick={() => setSelectedSubject(enrollment.id)}
              className={`p-5 rounded-xl border-2 transition text-left ${
                selectedSubject === enrollment.id
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <BookOpen className={`w-7 h-7 ${selectedSubject === enrollment.id ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-600">
                  {enrollment.subject.credits} créditos
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{enrollment.subject.code}</h3>
              <p className="text-sm text-gray-600 mb-3">{enrollment.subject.name}</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Promedio:</span>
                <span className="font-bold text-blue-600">{enrollment.average.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Asistencia:</span>
                <span className="font-bold text-green-600">{enrollment.attendanceRate.toFixed(1)}%</span>
              </div>
            </button>
          ))}

          {enrollments.length === 0 && !loading && (
            <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No estás inscrito en ninguna clase</p>
              <p className="text-gray-500 text-sm mt-1">Únete a una clase usando el código proporcionado por tu docente</p>
            </div>
          )}
        </div>

        {currentEnrollment && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentEnrollment.subject.name}</h2>
                  <p className="text-gray-600">{currentEnrollment.subject.code}</p>
                </div>
                <button
                  onClick={exportReport}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Reporte</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Distribución de Asistencia</h3>
                  <div className="h-64">
                    <Doughnut
                      data={attendanceChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom'
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Tendencia de Calificaciones</h3>
                  <div className="h-64">
                    <Line
                      data={gradesOverTimeData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100
                          }
                        },
                        plugins: {
                          legend: {
                            display: false
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-blue-600" />
                  Calificaciones
                </h3>
                <div className="space-y-3">
                  {currentEnrollment.grades.map((grade) => (
                    <div key={grade.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-medium text-gray-900 capitalize">{grade.grade_type}</span>
                          {grade.description && (
                            <p className="text-sm text-gray-600">{grade.description}</p>
                          )}
                        </div>
                        <span className="font-bold text-blue-600">
                          {((grade.grade_value / grade.max_value) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Puntuación: {grade.grade_value}/{grade.max_value}</span>
                        <span>{new Date(grade.graded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {currentEnrollment.grades.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Aún no hay calificaciones</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-orange-600" />
                  Asistencia
                </h3>
                <div className="space-y-2">
                  {currentEnrollment.attendance.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          record.status === 'present' ? 'bg-green-500' :
                          record.status === 'absent' ? 'bg-red-500' :
                          record.status === 'late' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                        <span className="text-sm text-gray-900">{new Date(record.date).toLocaleDateString()}</span>
                      </div>
                      <span className={`text-sm font-medium capitalize ${
                        record.status === 'present' ? 'text-green-600' :
                        record.status === 'absent' ? 'text-red-600' :
                        record.status === 'late' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                  {currentEnrollment.attendance.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Sin registros de asistencia</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unirse a una Clase</h2>
            <p className="text-gray-600 mb-6">Ingresa el código de clase proporcionado por tu docente</p>

            <form onSubmit={handleJoinClass} className="space-y-4">
              {joinError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{joinError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Código de Clase</label>
                <input
                  type="text"
                  required
                  value={classCode}
                  onChange={(e) => {
                    setClassCode(e.target.value.toUpperCase());
                    setJoinError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg tracking-wider"
                  placeholder="ABC123"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">El código tiene 6 caracteres</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setClassCode('');
                    setJoinError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Unirse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
