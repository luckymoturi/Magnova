import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Clock, Search, X } from 'lucide-react';

export const Header = ({ pageTitle, pageDescription }) => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const notifications = [
    { id: 1, message: 'New PO #2024 needs approval', time: '2m ago', read: false },
    { id: 2, message: 'Payment for PO #2018 processed', time: '1h ago', read: false },
    { id: 3, message: 'Inventory stock updated', time: '3h ago', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white border-b border-neutral-200" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }} data-testid="app-header">
      <div className="flex items-center justify-between px-5 py-3.5">
        {/* Left - Page Title */}
        <div className="flex flex-col gap-0.5 min-w-0">
          {pageTitle && (
            <>
              <h1 className="text-lg font-bold text-neutral-800 truncate leading-tight">{pageTitle}</h1>
              {pageDescription && (
                <p className="text-xs text-neutral-400 truncate">{pageDescription}</p>
              )}
            </>
          )}
        </div>

        {/* Right - Search, Time, Notifications, User */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden md:block relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              className="w-40 lg:w-56 pl-8 pr-8 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all"
            />
            <kbd className="hidden lg:inline-flex absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 text-[10px] font-semibold text-neutral-400 bg-white border border-neutral-200 rounded">
              ⌘F
            </kbd>
          </div>

          {/* Time */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 px-2.5 py-1.5 rounded-md border border-neutral-100">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              data-testid="notifications-button"
              className="relative p-1.5 text-neutral-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-neutral-200 z-50 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-neutral-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-800">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="p-0.5 hover:bg-neutral-100 rounded">
                    <X className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-neutral-50">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-3 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors ${!notif.read ? 'bg-gray-50' : ''}`}
                    >
                      <p className="text-xs text-neutral-700 font-medium leading-snug">{notif.message}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{notif.time}</p>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-neutral-100 text-center">
                  <button className="text-xs text-gray-700 hover:text-gray-900 font-medium">View all</button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-neutral-200"></div>

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold text-neutral-800 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-neutral-400">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
