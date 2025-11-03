/*
  # Clean All Data

  Removes all test/old data from the database to start fresh
*/

-- Clean all enrollment-related data
DELETE FROM attendance;
DELETE FROM grades;
DELETE FROM student_enrollments;
DELETE FROM teacher_classes;

-- Keep only the admin user profile, delete all other test users
-- Be careful: this assumes you know which UUID is the admin
-- If you need to keep specific users, update this query accordingly

-- For now, just clean the tables that were used with old structure
DELETE FROM classes WHERE id IS NOT NULL;
DELETE FROM enrollments WHERE id IS NOT NULL;
DELETE FROM teacher_subjects WHERE id IS NOT NULL;
