/*
  # Corregir Políticas RLS para Creación de Clases por Docentes

  ## Problema
  - Políticas duplicadas y contradictorias en la tabla subjects
  - Los docentes no pueden crear clases debido a conflictos en las políticas RLS
  
  ## Solución
  1. Eliminar todas las políticas antiguas de la tabla subjects
  2. Crear políticas nuevas y limpias que permitan:
     - Admins: acceso total (crear, leer, actualizar, eliminar)
     - Teachers: pueden crear clases propias, leer todas las activas, actualizar y eliminar solo las suyas
     - Students: solo pueden leer clases activas
  
  ## Cambios
  - DROP de políticas antiguas duplicadas
  - CREATE de políticas nuevas y claras
  - Asegurar que teachers puedan insertar sin restricciones adicionales
*/

-- Drop all existing policies on subjects table
DROP POLICY IF EXISTS "Admins can view all subjects" ON subjects;
DROP POLICY IF EXISTS "Allow authenticated delete subjects" ON subjects;
DROP POLICY IF EXISTS "Allow authenticated insert subjects" ON subjects;
DROP POLICY IF EXISTS "Allow authenticated read subjects" ON subjects;
DROP POLICY IF EXISTS "Allow authenticated update subjects" ON subjects;
DROP POLICY IF EXISTS "Authenticated users can view active subjects" ON subjects;
DROP POLICY IF EXISTS "Teachers and admins can create subjects" ON subjects;
DROP POLICY IF EXISTS "Teachers and admins can delete subjects" ON subjects;
DROP POLICY IF EXISTS "Teachers and admins can update subjects" ON subjects;

-- Create clean, non-conflicting policies

-- SELECT policies
CREATE POLICY "Admins can view all subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Teachers can view all subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

CREATE POLICY "Students can view active subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    AND is_active = true
  );

-- INSERT policy - Teachers and Admins can create
CREATE POLICY "Teachers and admins can create subjects"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
  );

-- UPDATE policy - Teachers can update their own, Admins can update all
CREATE POLICY "Teachers can update own subjects"
  ON subjects FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND teacher_id = auth.uid()
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND teacher_id = auth.uid()
  );

CREATE POLICY "Admins can update all subjects"
  ON subjects FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- DELETE policy - Teachers can delete their own, Admins can delete all
CREATE POLICY "Teachers can delete own subjects"
  ON subjects FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND teacher_id = auth.uid()
  );

CREATE POLICY "Admins can delete all subjects"
  ON subjects FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
