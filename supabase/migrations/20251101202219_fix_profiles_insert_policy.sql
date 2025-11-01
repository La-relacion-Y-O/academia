/*
  # Corregir política de inserción de perfiles para permitir registro de usuarios

  1. Cambios
    - Eliminar política restrictiva de admin para INSERT
    - Añadir política que permita a usuarios autenticados crear su propio perfil
    - Esto permite el registro de nuevos usuarios estudiantes

  2. Seguridad
    - Los usuarios solo pueden crear su propio perfil (id = auth.uid())
    - Solo pueden establecer el rol como 'student' al registrarse
    - Los admins mantienen la capacidad de crear cualquier tipo de usuario
*/

-- Primero, crear todas las tablas si no existen
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

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  credits integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  semester text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, subject_id, academic_year, semester)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  semester text NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(student_id, subject_id, academic_year, semester)
);

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

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment ON attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_reports_student ON reports(student_id);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Eliminar política restrictiva de INSERT si existe
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Crear políticas de SELECT
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Teachers can view student profiles in their subjects" ON profiles;
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

-- Permitir a usuarios autenticados crear su propio perfil como estudiante
DROP POLICY IF EXISTS "Users can create own student profile" ON profiles;
CREATE POLICY "Users can create own student profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() AND role = 'student'
  );

-- Permitir a admins crear cualquier perfil
DROP POLICY IF EXISTS "Admins can create any profile" ON profiles;
CREATE POLICY "Admins can create any profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
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

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para subjects
DROP POLICY IF EXISTS "Anyone authenticated can view subjects" ON subjects;
CREATE POLICY "Anyone authenticated can view subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
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

-- Políticas para teacher_subjects
DROP POLICY IF EXISTS "Teachers can view their assignments" ON teacher_subjects;
CREATE POLICY "Teachers can view their assignments"
  ON teacher_subjects FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all teacher assignments" ON teacher_subjects;
CREATE POLICY "Admins can view all teacher assignments"
  ON teacher_subjects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage teacher assignments" ON teacher_subjects;
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

-- Políticas para enrollments
DROP POLICY IF EXISTS "Students can view own enrollments" ON enrollments;
CREATE POLICY "Students can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view enrollments in their subjects" ON enrollments;
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

DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;
CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage enrollments" ON enrollments;
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

-- Políticas para grades
DROP POLICY IF EXISTS "Students can view own grades" ON grades;
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

DROP POLICY IF EXISTS "Teachers can view grades for their subjects" ON grades;
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

DROP POLICY IF EXISTS "Teachers can insert grades for their subjects" ON grades;
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

DROP POLICY IF EXISTS "Teachers can update grades for their subjects" ON grades;
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

DROP POLICY IF EXISTS "Admins can manage all grades" ON grades;
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

-- Políticas para attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON attendance;
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

DROP POLICY IF EXISTS "Teachers can view attendance for their subjects" ON attendance;
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

DROP POLICY IF EXISTS "Teachers can manage attendance for their subjects" ON attendance;
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

DROP POLICY IF EXISTS "Admins can manage all attendance" ON attendance;
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

-- Políticas para reports
DROP POLICY IF EXISTS "Users can view own generated reports" ON reports;
CREATE POLICY "Users can view own generated reports"
  ON reports FOR SELECT
  TO authenticated
  USING (generated_by = auth.uid());

DROP POLICY IF EXISTS "Students can view reports about themselves" ON reports;
CREATE POLICY "Students can view reports about themselves"
  ON reports FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view reports for their subjects" ON reports;
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

DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create reports" ON reports;
CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (generated_by = auth.uid());

DROP POLICY IF EXISTS "Admins can delete reports" ON reports;
CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );