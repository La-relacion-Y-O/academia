import { supabase, Subject, Enrollment, Grade, Attendance, Profile } from '../lib/supabase';

export const profileService = {
  async getAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('last_name', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getByRole(role: 'admin' | 'teacher' | 'student') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('last_name', { ascending: true });
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const subjectService = {
  async getAll() {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('code', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(subject: Omit<Subject, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('subjects')
      .insert([subject])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Subject>) {
    const { data, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const teacherSubjectService = {
  async getTeacherSubjects(teacherId: string) {
    const { data, error } = await supabase
      .from('teacher_subjects')
      .select('*, subjects(*)')
      .eq('teacher_id', teacherId);
    if (error) throw error;
    return data;
  },

  async assignTeacher(teacherId: string, subjectId: string, academicYear: string, semester: string) {
    const { data, error } = await supabase
      .from('teacher_subjects')
      .insert([{ teacher_id: teacherId, subject_id: subjectId, academic_year: academicYear, semester }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeAssignment(id: string) {
    const { error } = await supabase
      .from('teacher_subjects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const enrollmentService = {
  async getStudentEnrollments(studentId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, subjects(*)')
      .eq('student_id', studentId);
    if (error) throw error;
    return data;
  },

  async getSubjectEnrollments(subjectId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, profiles(*)')
      .eq('subject_id', subjectId);
    if (error) throw error;
    return data;
  },

  async create(enrollment: Omit<Enrollment, 'id' | 'enrolled_at'>) {
    const { data, error } = await supabase
      .from('enrollments')
      .insert([enrollment])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const gradeService = {
  async getEnrollmentGrades(enrollmentId: string) {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .order('graded_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(grade: Omit<Grade, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('grades')
      .insert([grade])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Grade>) {
    const { data, error } = await supabase
      .from('grades')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  calculateAverage(grades: Grade[]): number {
    if (grades.length === 0) return 0;

    const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = grades.reduce((sum, g) => {
      const percentage = (g.grade_value / g.max_value) * 100;
      return sum + (percentage * g.weight);
    }, 0);

    return weightedSum / totalWeight;
  }
};

export const attendanceService = {
  async getEnrollmentAttendance(enrollmentId: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(attendance: Omit<Attendance, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('attendance')
      .insert([attendance])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Attendance>) {
    const { data, error } = await supabase
      .from('attendance')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  calculateAttendanceRate(attendance: Attendance[]): number {
    if (attendance.length === 0) return 0;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    return (presentCount / attendance.length) * 100;
  }
};
