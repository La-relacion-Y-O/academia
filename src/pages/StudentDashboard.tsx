import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { enrollmentService, gradeService, attendanceService } from '../services/api';
import { Grade, Attendance } from '../lib/supabase';
import { BookOpen, Award, Calendar, TrendingUp, Download } from 'lucide-react';
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
      label: 'Porcentaje de Calificación',
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
      label: 'Promedio de Calificación (%)',
      data: enrollments.map(e => e.average),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
    }]
  };

  const exportReport = () => {
    if (!currentEnrollment) return;

    const reportData = `
Academic Report
Student: ${profile?.first_name} ${profile?.last_name}
Subject: ${currentEnrollment.subject.name} (${currentEnrollment.subject.code})
Generated: ${new Date().toLocaleString()}

Overall Average: ${currentEnrollment.average.toFixed(2)}%
Attendance Rate: ${currentEnrollment.attendanceRate.toFixed(2)}%

Grades:
${currentEnrollment.grades.map(g =>
  `- ${g.grade_type}: ${g.grade_value}/${g.max_value} (${((g.grade_value / g.max_value) * 100).toFixed(2)}%)${g.description ? ' - ' + g.description : ''}`
).join('\n')}

Attendance Records:
${currentEnrollment.attendance.map(a =>
  `- ${new Date(a.date).toLocaleDateString()}: ${a.status}${a.notes ? ' - ' + a.notes : ''}`
).join('\n')}
    `.trim();

    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEnrollment.subject.code}_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Materias Inscritas</p>
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
                <p className="text-sm text-gray-600">Tasa de Asistencia</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overallAttendance.toFixed(1)}%</p>
              </div>
              <Calendar className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Rendimiento por Materia</h2>
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

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Materias</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {enrollments.map((enrollment) => (
              <button
                key={enrollment.id}
                onClick={() => setSelectedSubject(enrollment.id)}
                className={`p-4 rounded-lg border-2 transition text-left ${
                  selectedSubject === enrollment.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">
                    {enrollment.subject.credits} créditos
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">{enrollment.subject.code}</h3>
                <p className="text-sm text-gray-600 mt-1 mb-2">{enrollment.subject.name}</p>
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
          </div>
        </div>

        {currentEnrollment && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {currentEnrollment.subject.name} Details
                </h2>
                <button
                  onClick={exportReport}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Reporte</span>
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
                    <div key={grade.id} className="border border-gray-200 rounded-lg p-3">
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
                  Registros de Asistencia
                </h3>
                <div className="space-y-2">
                  {currentEnrollment.attendance.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
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
                    <p className="text-center text-gray-500 py-4">Aún no hay registros de asistencia</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
