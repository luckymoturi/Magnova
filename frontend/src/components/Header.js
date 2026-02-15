import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';

export const Header = ({ pageTitle, pageDescription }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white border-b border-neutral-200 px-4 md:px-6 py-3" data-testid="app-header">
      <div className="flex items-center justify-between">
        {/* Left side - Page Title */}
        <div className="flex items-center gap-3">
          {pageTitle && (
            <div>
              <h1 className="text-4xl font-black text-neutral-900 tracking-tight">{pageTitle}</h1>
              {pageDescription && (
                <p className="text-xl text-neutral-600 mt-2 font-semibold">{pageDescription}</p>
              )}
            </div>
          )}
        </div>

        {/* Right side - User & Notifications */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            data-testid="notifications-button"
            className="relative p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all duration-200"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full"></span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-neutral-200"></div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="hidden md:block">
              <p className="text-sm font-medium text-neutral-900 leading-tight">{user?.name}</p>
              <p className="text-xs text-neutral-500">{user?.role}</p>
            </div>

            {/* Dropdown */}
            <div className="relative group">
              <button className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <hr className="my-1 border-neutral-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
