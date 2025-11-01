/*
  # Add Class Codes and Teacher Ownership

  ## Changes
  
  1. **Subjects Table Updates**
    - Add `teacher_id` column to link classes directly to teachers
    - Add `class_code` column for students to join classes
    - Add `is_active` column to enable/disable classes
    - Update description to be more class-oriented
  
  2. **Remove Admin Dependencies**
    - Allow teachers to create their own classes
    - Students can join classes using class codes
  
  3. **New Policies**
    - Teachers can create and manage their own classes
    - Students can view active classes and join them
    - Teachers can see enrolled students in their classes
  
  4. **Security**
    - Maintain RLS on all tables
    - Teachers only manage their own classes
    - Students only see classes they're enrolled in or can join
*/

-- Add new columns to subjects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE subjects ADD COLUMN teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'class_code'
  ) THEN
    ALTER TABLE subjects ADD COLUMN class_code text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE subjects ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Create index on class_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_subjects_class_code ON subjects(class_code);
CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);

-- Drop old subject policies and create new ones
DROP POLICY IF EXISTS "Anyone authenticated can view subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;

-- Teachers can view their own classes
CREATE POLICY "Teachers can view own classes"
  ON subjects FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- Students can view active classes they're enrolled in
CREATE POLICY "Students can view enrolled classes"
  ON subjects FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.subject_id = subjects.id
      AND enrollments.student_id = auth.uid()
    )
  );

-- Students can view active classes by code (for joining)
CREATE POLICY "Anyone can view active classes"
  ON subjects FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Teachers can create their own classes
CREATE POLICY "Teachers can create classes"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Teachers can update their own classes
CREATE POLICY "Teachers can update own classes"
  ON subjects FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own classes
CREATE POLICY "Teachers can delete own classes"
  ON subjects FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Admins maintain full access
CREATE POLICY "Admins can manage all subjects"
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

-- Update enrollments policies to allow students to join classes
DROP POLICY IF EXISTS "Admins can manage enrollments" ON enrollments;

CREATE POLICY "Students can enroll in classes"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'student'
    ) AND
    EXISTS (
      SELECT 1 FROM subjects
      WHERE id = subject_id AND is_active = true
    )
  );

CREATE POLICY "Students can leave classes"
  ON enrollments FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage enrollments in their classes"
  ON enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = enrollments.subject_id
      AND subjects.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = subject_id
      AND subjects.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all enrollments"
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

-- Update teacher_subjects policies to work with new system
CREATE POLICY "Teachers can create subject assignments"
  ON teacher_subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );
