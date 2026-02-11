import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Search } from 'lucide-react';

export const Header = () => {
  const { user } = useAuth();

  return (
    <div className="header px-6 py-4" data-testid="app-header">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search..."
              data-testid="global-search"
              className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            data-testid="notifications-button"
            className="p-2 hover:bg-neutral-100 rounded-md transition-colors duration-200"
          >
            <Bell className="w-5 h-5 text-neutral-600" strokeWidth={1.5} />
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
            <div className="text-right">
              <p className="text-sm font-medium text-neutral-900">{user?.name}</p>
              <p className="text-xs text-neutral-500">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
