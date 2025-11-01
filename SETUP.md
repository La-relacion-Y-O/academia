# Academic Control System - Setup Guide

## System Overview

A comprehensive web-based Academic Control System with role-based access for Admins, Teachers, and Students. Features include grade management, attendance tracking, automatic calculations, data visualizations, and report generation.

## Features

### Admin Dashboard
- User management (create, view, delete users)
- Subject management (create, view, delete subjects)
- Full system oversight and configuration
- Student and teacher statistics

### Teacher Dashboard
- Grade entry and management for enrolled students
- Attendance tracking with multiple status options
- Subject-specific student rosters
- Automatic grade calculations and averaging
- View individual student performance

### Student Dashboard
- View grades across all enrolled subjects
- Track attendance records
- Interactive charts and visualizations (Chart.js)
- Automatic grade averaging
- Export academic reports
- Performance analytics

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Data Visualization**: Chart.js + react-chartjs-2
- **Icons**: Lucide React

## Database Schema

### Tables
1. **profiles** - User information with role (admin/teacher/student)
2. **subjects** - Academic subjects/courses
3. **teacher_subjects** - Links teachers to subjects they teach
4. **enrollments** - Student enrollment in subjects
5. **grades** - Individual grade entries with weighted averages
6. **attendance** - Daily attendance records
7. **reports** - Generated report metadata

### Row Level Security
All tables implement comprehensive RLS policies ensuring:
- Admins have full access
- Teachers can only access their assigned subjects and students
- Students can only view their own data

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Database Setup

The database schema has been automatically applied to your Supabase instance. No additional migration steps are needed.

### 3. Install Dependencies

```bash
npm install
```

### 4. Create Initial Admin User

Use Supabase Dashboard to create your first admin user:

1. Go to Authentication > Users
2. Add new user with email/password
3. After creation, go to Table Editor > profiles
4. Insert a profile record:
   - id: (user's auth.uid)
   - role: 'admin'
   - first_name: 'Admin'
   - last_name: 'User'

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## User Roles & Capabilities

### Admin
- Create and manage users (students, teachers, admins)
- Create and manage subjects
- Assign teachers to subjects
- Enroll students in subjects
- View system-wide statistics
- Delete users and subjects

### Teacher
- View assigned subjects and enrolled students
- Enter and manage grades with weighted calculations
- Track student attendance (present, absent, late, excused)
- View student performance metrics
- Calculate automatic averages

### Student
- View enrolled subjects
- View all grades and attendance records
- See performance visualizations (charts and graphs)
- Track attendance statistics
- Export academic reports
- View overall GPA and attendance rate

## Grade Management

### Grade Types
- Assignment
- Quiz
- Exam
- Project
- Midterm
- Final

### Features
- Weighted grade calculations
- Automatic percentage calculations
- Running averages
- Grade history tracking

## Attendance Management

### Status Options
- Present
- Absent
- Late
- Excused

### Features
- Date-specific tracking
- Optional notes
- Automatic attendance rate calculation
- Visual status indicators

## Data Visualization

Students can view:
- Subject performance bar charts
- Attendance distribution pie charts
- Grade trend line graphs
- Overall statistics

## Report Generation

Students can export reports containing:
- Subject information
- All grades with percentages
- Attendance records
- Overall averages
- Generated date/time

## Security Features

- Email/password authentication
- Role-based access control (RBAC)
- Row Level Security (RLS) on all tables
- Secure session management
- Protected API endpoints

## File Structure

```
src/
├── components/
│   ├── LoginForm.tsx
│   └── Layout.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   └── supabase.ts
├── pages/
│   ├── AdminDashboard.tsx
│   ├── TeacherDashboard.tsx
│   └── StudentDashboard.tsx
├── services/
│   └── api.ts
├── App.tsx
└── main.tsx
```

## Common Workflows

### Admin: Create a New Student
1. Navigate to Users Management tab
2. Click "Add User"
3. Fill in email, password, name, and select "student" role
4. Submit form
5. Student can now log in

### Admin: Create a Subject
1. Navigate to Subjects tab
2. Click "Add Subject"
3. Enter subject code, name, credits, and description
4. Submit form

### Admin: Assign Teacher to Subject
1. Create teacher-subject assignments in the database
2. Use enrollments table for student-subject relationships

### Teacher: Add Grade
1. Select subject from dashboard
2. Navigate to Grades Management tab
3. Click "Add Grade" for a student
4. Select grade type, enter value and max value
5. Set weight for calculation
6. Submit grade

### Teacher: Mark Attendance
1. Select subject from dashboard
2. Navigate to Attendance Tracking tab
3. Click "Mark Attendance" for a student
4. Select date and status
5. Add optional notes
6. Submit attendance record

### Student: Export Report
1. Select subject from dashboard
2. View detailed subject information
3. Click "Export Report" button
4. Report downloads as text file

## Troubleshooting

### Cannot Login
- Verify environment variables are set correctly
- Check user exists in Supabase Auth
- Ensure profile record exists for the user

### Permission Errors
- Verify RLS policies are enabled
- Check user role is set correctly in profiles table
- Ensure user is authenticated

### Data Not Loading
- Check Supabase connection
- Verify API calls in browser console
- Ensure user has proper permissions

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
```

## Production Deployment

1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Ensure environment variables are set in production
4. Configure Supabase authentication settings

## Future Enhancements

- PDF report generation
- Email notifications
- Bulk operations (bulk grade entry, bulk attendance)
- Advanced filtering and search
- Academic calendar integration
- Parent portal access
- Mobile responsive improvements
- Dark mode support
