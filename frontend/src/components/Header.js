import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut } from 'lucide-react';
import { Clock } from 'lucide-react';

export const Header = ({ pageTitle, pageDescription }) => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm" data-testid="app-header">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - Page Title */}
        <div className="flex items-center gap-2">
          {pageTitle && (
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">{pageTitle}</h1>
              {pageDescription && (
                <p className="text-sm text-neutral-500 mt-0.5">{pageDescription}</p>
              )}
            </div>
          )}
        </div>

        {/* Right side - Time, User & Actions */}
        <div className="flex items-center gap-4">
          {/* Current Time */}
          <div className="hidden md:flex items-center gap-2 text-sm text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Notifications */}
          <button
            data-testid="notifications-button"
            className="relative p-2 text-neutral-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-teal-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-neutral-200"></div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-neutral-800">{user?.name}</p>
              <p className="text-xs text-neutral-500">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
