import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, BookOpen, GraduationCap } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();

  const getRoleIcon = () => {
    switch (profile?.role) {
      case 'admin': return <Users className="w-5 h-5" />;
      case 'teacher': return <BookOpen className="w-5 h-5" />;
      case 'student': return <GraduationCap className="w-5 h-5" />;
      default: return null;
    }
  };

  const getRoleColor = () => {
    switch (profile?.role) {
      case 'admin': return 'bg-red-600';
      case 'teacher': return 'bg-green-600';
      case 'student': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className={`${getRoleColor()} p-2 rounded-lg mr-3`}>
                {getRoleIcon()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Academic Control System
                </h1>
                <p className="text-xs text-gray-600 capitalize">
                  {profile?.role} Portal
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-gray-600">{profile?.role}</p>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
