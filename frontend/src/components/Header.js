import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Clock, Search, X } from 'lucide-react';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useNavigate } from 'react-router-dom';

export const Header = ({ pageTitle, pageDescription }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    allProcurements,
    allInternalPayments,
    allExternalPayments,
    allLogisticsNotifications,
    pendingInventory,
    pendingInvoices,
    dbNotifications
  } = useDataRefresh();
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

  // Filter notifications based on user role to match their "category page"
  const getRoleBasedNotifications = () => {
    let all = [];
    const role = user?.role;
    const isAdmin = role === 'Admin';
    
    // Purchase Team / Procurement Page
    if (isAdmin || role === 'Purchase') {
      all = [...all, ...allProcurements.map(n => ({ 
        id: `proc-${n.po_number}-${n.timestamp || 'derived'}`, 
        message: `PO ${n.po_number} is ready for procurement`, 
        time: 'Pending Procurement', 
        type: 'procurement' 
      }))];
    }
    
    // Internal Payments Page
    if (isAdmin || role === 'InternalPayments') {
      all = [...all, ...allInternalPayments.map(n => ({ 
        id: `int-${n.po_number}-${n.timestamp || 'derived'}`, 
        message: `PO ${n.po_number} requires Internal Payment`, 
        time: 'Internal Payment', 
        type: 'internal_payment' 
      }))];
    }

    // External Payments Page
    if (isAdmin || role === 'ExternalPayments') {
      all = [...all, ...allExternalPayments.map(n => ({ 
        id: `ext-${n.po_number}-${n.timestamp || 'derived'}`, 
        message: `PO ${n.po_number} requires External Payment`, 
        time: 'External Payment', 
        type: 'external_payment' 
      }))];
    }

    // Logistics Page
    if (isAdmin || role === 'Logistics') {
      all = [...all, ...allLogisticsNotifications.map(n => ({ 
        id: `log-${n.po_number}-${n.timestamp || 'derived'}`, 
        message: `PO ${n.po_number} is ready for shipment`, 
        time: 'Ready for Logistics', 
        type: 'logistics' 
      }))];
    }

    // Inventory Page
    if (isAdmin || role === 'Inventory') {
      all = [...all, ...pendingInventory.map(n => ({ 
        id: `inv-${n.po_number}-${n.timestamp || 'derived'}`, 
        message: `PO ${n.po_number} shipment received`, 
        time: 'Inventory Inward', 
        type: 'inventory' 
      }))];
    }

    // Persistent Database Notifications (e.g. Gap Reversals)
    all = [...all, ...dbNotifications.map(n => ({
      id: `db-${n.procurement_id || Math.random()}`,
      message: n.message,
      time: n.is_escalated ? 'URGENT - 48h Over' : 'Pending Action',
      type: n.type === 'gap_reverse' ? 'procurement' : 'other',
      color: n.color || 'red'
    }))];

    return all;
  };

  const notifications = getRoleBasedNotifications();
  const unreadCount = notifications.length;

  const handleNotificationClick = (notif) => {
    setShowNotifications(false);
    switch (notif.type) {
      case 'procurement':
        navigate('/procurement');
        break;
      case 'internal_payment':
      case 'external_payment':
        navigate('/payments');
        break;
      case 'logistics':
        navigate('/logistics');
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      default:
        break;
    }
  };

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
          {/* Search Area with Toast */}
          <div className="hidden md:flex items-center gap-3">
            {/* Critical Toast Alert */}
            {dbNotifications.some(n => n.color === 'red') && (
              <div 
                className="bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1 font-bold border border-red-500 cursor-pointer hover:bg-red-700 transition-colors whitespace-nowrap"
                onClick={() => navigate('/procurement')}
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {dbNotifications.find(n => n.color === 'red')?.message || 'Urgent Issue Detected'}
              </div>
            )}
            
            <div className="relative">
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
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`px-3 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors border-l-2 hover:border-gray-800 ${notif.color === 'red' ? 'border-red-500 bg-red-50/30' : 'border-transparent'}`}
                      >
                        <p className={`text-xs font-medium leading-snug ${notif.color === 'red' ? 'text-red-900' : 'text-neutral-700'}`}>{notif.message}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{notif.time}</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-8 text-center">
                      <p className="text-xs text-neutral-400 italic">No new notifications</p>
                    </div>
                  )}
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
