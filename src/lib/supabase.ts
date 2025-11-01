import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  role: 'admin' | 'teacher' | 'student';
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type Subject = {
  id: string;
  name: string;
  code: string;
  description?: string;
  credits: number;
  created_at: string;
};

export type Enrollment = {
  id: string;
  student_id: string;
  subject_id: string;
  academic_year: string;
  semester: string;
  enrolled_at: string;
};

export type Grade = {
  id: string;
  enrollment_id: string;
  teacher_id: string;
  grade_type: 'exam' | 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';
  grade_value: number;
  max_value: number;
  weight: number;
  description?: string;
  graded_at: string;
  created_at: string;
};

export type Attendance = {
  id: string;
  enrollment_id: string;
  teacher_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  created_at: string;
};

export type Report = {
  id: string;
  generated_by: string;
  report_type: 'student_grades' | 'attendance_summary' | 'class_performance';
  student_id?: string;
  subject_id?: string;
  academic_year?: string;
  semester?: string;
  file_url?: string;
  generated_at: string;
};
