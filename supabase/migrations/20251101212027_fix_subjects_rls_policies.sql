/*
  # Fix Subjects RLS Policies - Remove Infinite Recursion

  ## Problem
  Multiple overlapping policies on subjects table causing infinite recursion

  ## Solution
  1. Drop all existing conflicting policies
  2. Create simplified, non-overlapping policies
  3. Ensure teachers can create and manage their classes
  4. Allow students and teachers to view necessary classes
  
  ## Security
  - Teachers only manage their own classes
  - Students can view active classes
  - Admins maintain full access
*/

-- Drop all existing subject policies to start fresh
DROP POLICY IF EXISTS "Teachers can view own classes" ON subjects;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON subjects;
DROP POLICY IF EXISTS "Anyone can view active classes" ON subjects;
DROP POLICY IF EXISTS "Teachers can create classes" ON subjects;
DROP POLICY IF EXISTS "Teachers can update own classes" ON subjects;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON subjects;
DROP POLICY IF EXISTS "Admins can manage all subjects" ON subjects;

-- Create new non-conflicting policies

-- SELECT: Allow viewing based on role
CREATE POLICY "Allow authenticated users to view subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Teachers can see their own
    teacher_id = auth.uid()
    OR
    -- Students can see active classes they're enrolled in
    (
      is_active = true AND
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'student' AND
      EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.subject_id = subjects.id
        AND enrollments.student_id = auth.uid()
      )
    )
    OR
    -- Anyone can see active classes (for joining via code)
    (is_active = true)
  );

-- INSERT: Only teachers can create classes
CREATE POLICY "Teachers can create classes"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

-- UPDATE: Teachers update their own, admins update all
CREATE POLICY "Teachers and admins can update classes"
  ON subjects FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    teacher_id = auth.uid()
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    teacher_id = auth.uid()
  );

-- DELETE: Teachers delete their own, admins delete all
CREATE POLICY "Teachers and admins can delete classes"
  ON subjects FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    teacher_id = auth.uid()
  );