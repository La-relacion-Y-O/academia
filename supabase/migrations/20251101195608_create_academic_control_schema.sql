/*
  # Academic Control System Database Schema

  ## Overview
  Complete database schema for an Academic Control System with user management,
  grade tracking, attendance monitoring, and report generation capabilities.

  ## New Tables

  ### 1. `profiles`
  Extends auth.users with role information and additional profile data
  - `id` (uuid, FK to auth.users) - User identifier
  - `role` (text) - User role: 'admin', 'teacher', or 'student'
  - `first_name` (text) - User's first name
  - `last_name` (text) - User's last name
  - `phone` (text) - Contact phone number
  - `avatar_url` (text) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `subjects`
  Academic subjects/courses offered
  - `id` (uuid, PK) - Subject identifier
  - `name` (text) - Subject name
  - `code` (text) - Unique subject code
  - `description` (text) - Subject description
  - `credits` (integer) - Credit hours
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. `teacher_subjects`
  Links teachers to subjects they teach
  - `id` (uuid, PK) - Record identifier
  - `teacher_id` (uuid, FK) - Teacher profile reference
  - `subject_id` (uuid, FK) - Subject reference
  - `academic_year` (text) - Academic year (e.g., "2025")
  - `semester` (text) - Semester (e.g., "Fall", "Spring")
  - `created_at` (timestamptz) - Assignment timestamp

  ### 4. `enrollments`
  Student enrollment in subjects
  - `id` (uuid, PK) - Enrollment identifier
  - `student_id` (uuid, FK) - Student profile reference
  - `subject_id` (uuid, FK) - Subject reference
  - `academic_year` (text) - Academic year
  - `semester` (text) - Semester
  - `enrolled_at` (timestamptz) - Enrollment timestamp

  ### 5. `grades`
  Individual grade entries for students
  - `id` (uuid, PK) - Grade identifier
  - `enrollment_id` (uuid, FK) - Enrollment reference
  - `teacher_id` (uuid, FK) - Teacher who entered grade
  - `grade_type` (text) - Type: 'exam', 'quiz', 'assignment', 'project', 'midterm', 'final'
  - `grade_value` (numeric) - Numeric grade value
  - `max_value` (numeric) - Maximum possible value
  - `weight` (numeric) - Weight for average calculation (0-1)
  - `description` (text) - Grade description/notes
  - `graded_at` (timestamptz) - Date grade was entered
  - `created_at` (timestamptz) - Creation timestamp

  ### 6. `attendance`
  Daily attendance records
  - `id` (uuid, PK) - Attendance identifier
  - `enrollment_id` (uuid, FK) - Enrollment reference
  - `teacher_id` (uuid, FK) - Teacher who recorded attendance
  - `date` (date) - Attendance date
  - `status` (text) - Status: 'present', 'absent', 'late', 'excused'
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Creation timestamp

  ### 7. `reports`
  Generated report metadata and storage
  - `id` (uuid, PK) - Report identifier
  - `generated_by` (uuid, FK) - User who generated report
  - `report_type` (text) - Type: 'student_grades', 'attendance_summary', 'class_performance'
  - `student_id` (uuid, FK) - Student reference (if applicable)
  - `subject_id` (uuid, FK) - Subject reference (if applicable)
  - `academic_year` (text) - Academic year
  - `semester` (text) - Semester
  - `file_url` (text) - URL to generated file
  - `generated_at` (timestamptz) - Generation timestamp

  ## Security
  Row Level Security (RLS) enabled on all tables with role-based policies:
  - Admins: Full access to all data
  - Teachers: Access to their assigned subjects and enrolled students
  - Students: Access to their own academic records only

  ## Indexes
  Performance indexes on foreign keys and frequently queried columns
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  credits integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

-- Create teacher_subjects table
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  semester text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, subject_id, academic_year, semester)
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  semester text NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(student_id, subject_id, academic_year, semester)
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  grade_type text NOT NULL CHECK (grade_type IN ('exam', 'quiz', 'assignment', 'project', 'midterm', 'final')),
  grade_value numeric NOT NULL CHECK (grade_value >= 0),
  max_value numeric NOT NULL CHECK (max_value > 0),
  weight numeric DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  description text,
  graded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, date)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  report_type text NOT NULL CHECK (report_type IN ('student_grades', 'attendance_summary', 'class_performance')),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year text,
  semester text,
  file_url text,
  generated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment ON attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_reports_student ON reports(student_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Teachers can view student profiles in their subjects"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    role = 'student' AND
    EXISTS (
      SELECT 1 FROM teacher_subjects ts
      JOIN enrollments e ON e.subject_id = ts.subject_id
      WHERE ts.teacher_id = auth.uid()
      AND e.student_id = profiles.id
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Subjects policies
CREATE POLICY "Anyone authenticated can view subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage subjects"
  ON subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teacher subjects policies
CREATE POLICY "Teachers can view their assignments"
  ON teacher_subjects FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Admins can view all teacher assignments"
  ON teacher_subjects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage teacher assignments"
  ON teacher_subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enrollments policies
CREATE POLICY "Students can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view enrollments in their subjects"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_subjects
      WHERE teacher_id = auth.uid()
      AND subject_id = enrollments.subject_id
    )
  );

CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grades policies
CREATE POLICY "Students can view own grades"
  ON grades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE id = grades.enrollment_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view grades for their subjects"
  ON grades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN teacher_subjects ts ON ts.subject_id = e.subject_id
      WHERE e.id = grades.enrollment_id
      AND ts.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert grades for their subjects"
  ON grades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN teacher_subjects ts ON ts.subject_id = e.subject_id
      WHERE e.id = enrollment_id
      AND ts.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update grades for their subjects"
  ON grades FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN teacher_subjects ts ON ts.subject_id = e.subject_id
      WHERE e.id = grades.enrollment_id
      AND ts.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN teacher_subjects ts ON ts.subject_id = e.subject_id
      WHERE e.id = enrollment_id
      AND ts.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all grades"
  ON grades FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Attendance policies
CREATE POLICY "Students can view own attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE id = attendance.enrollment_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view attendance for their subjects"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN teacher_subjects ts ON ts.subject_id = e.subject_id
      WHERE e.id = attendance.enrollment_id
      AND ts.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage attendance for their subjects"
  ON attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN teacher_subjects ts ON ts.subject_id = e.subject_id
      WHERE e.id = attendance.enrollment_id
      AND ts.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN teacher_subjects ts ON ts.subject_id = e.subject_id
      WHERE e.id = enrollment_id
      AND ts.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all attendance"
  ON attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Reports policies
CREATE POLICY "Users can view own generated reports"
  ON reports FOR SELECT
  TO authenticated
  USING (generated_by = auth.uid());

CREATE POLICY "Students can view reports about themselves"
  ON reports FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view reports for their subjects"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_subjects
      WHERE teacher_id = auth.uid()
      AND subject_id = reports.subject_id
    )
  );

CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (generated_by = auth.uid());

CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );