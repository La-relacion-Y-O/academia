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

export const teacherClassService = {
  async getTeacherClasses(teacherId: string) {
    const { data, error } = await supabase
      .from('teacher_classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getClassByCode(code: string) {
    const { data, error } = await supabase
      .from('teacher_classes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createClass(teacherId: string, name: string, code: string, description: string = '', credits: number = 3) {
    const { data, error } = await supabase
      .from('teacher_classes')
      .insert([{
        teacher_id: teacherId,
        name,
        code,
        description,
        credits,
        is_active: true
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateClass(id: string, updates: any) {
    const { data, error } = await supabase
      .from('teacher_classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteClass(id: string) {
    const { error } = await supabase
      .from('teacher_classes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  generateClassCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
      .from('student_enrollments')
      .select('*, teacher_classes(*)')
      .eq('student_id', studentId);
    if (error) throw error;
    return data;
  },

  async getClassEnrollments(classId: string) {
    const { data, error } = await supabase
      .from('student_enrollments')
      .select('*, profiles(*)')
      .eq('class_id', classId);
    if (error) throw error;
    return data;
  },

  async isEnrolled(studentId: string, classId: string) {
    const { data, error } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },

  async enrollInClass(studentId: string, classId: string) {
    const currentYear = new Date().getFullYear().toString();
    const currentMonth = new Date().getMonth();
    const semester = currentMonth >= 7 ? 'Fall' : 'Spring';

    const { data, error } = await supabase
      .from('student_enrollments')
      .insert([{
        student_id: studentId,
        class_id: classId,
        academic_year: currentYear,
        semester: semester
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('student_enrollments')
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
