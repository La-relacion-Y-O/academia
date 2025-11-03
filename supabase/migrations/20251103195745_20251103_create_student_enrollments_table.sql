/*
  # Create Student Enrollments Table

  1. New Tables
    - `student_enrollments` - Students enrolled in teacher classes

  2. Security
    - Enable RLS on new table
    - Create policies for student and teacher access
*/

-- Create student_enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
  academic_year text NOT NULL DEFAULT EXTRACT(year FROM now())::text,
  semester text NOT NULL DEFAULT 'Fall' CHECK (semester IN ('Spring', 'Fall')),
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(student_id, class_id, academic_year, semester)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_id ON student_enrollments(class_id);

-- Enable RLS
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Teachers can view their class enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Students can enroll in classes" ON student_enrollments;
DROP POLICY IF EXISTS "Students can delete their own enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON student_enrollments;

-- Create RLS Policies for student_enrollments
CREATE POLICY "Students can view their own enrollments"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their class enrollments"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all enrollments"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Students can enroll in classes"
  ON student_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

CREATE POLICY "Students can delete their own enrollments"
  ON student_enrollments FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can delete enrollments from their classes"
  ON student_enrollments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );
