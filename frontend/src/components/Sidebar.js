import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  CreditCard,
  Boxes,
  Truck,
  FileText,
  BarChart3,
  Users,
  LogOut,
  Search,
  Settings,
  HelpCircle,
} from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = React.useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Role display names for the welcome card
  const roleDisplayNames = {
    'Admin': 'Administrator',
    'Purchase': 'Purchase Team',
    'Manager': 'Manager',
    'InternalPayments': 'Internal Payments',
    'ExternalPayments': 'External Payments',
    'Logistics': 'Logistics',
    'Inventory': 'Inventory',
    // Legacy roles for backward compatibility
    'Approver': 'Approver',
    'Accounts': 'Accounts',
    'Stores': 'Stores',
    'Sales': 'Sales',
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'Purchase', 'Manager', 'InternalPayments', 'ExternalPayments', 'Logistics', 'Inventory', 'Approver', 'Accounts', 'Stores', 'Sales'] },
    { path: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders', roles: ['Admin', 'Purchase', 'Manager'] },
    { path: '/procurement', icon: Package, label: 'Procurement', roles: ['Admin', 'Purchase'] },
    { path: '/manager', icon: Users, label: 'Approvals', roles: ['Admin', 'Manager'] },
    { path: '/payments', icon: CreditCard, label: 'Internal Payments', roles: ['Admin', 'InternalPayments'] },
    { path: '/external-payments', icon: CreditCard, label: 'External Payments', roles: ['Admin', 'ExternalPayments'] },
    { path: '/logistics', icon: Truck, label: 'Logistics', roles: ['Admin', 'Logistics'] },
    { path: '/inventory', icon: Boxes, label: 'Inventory', roles: ['Admin', 'Inventory'] },
    { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['Admin', 'Purchase', 'Manager', 'InternalPayments', 'ExternalPayments', 'Logistics', 'Inventory'] },
    { path: '/users', icon: Users, label: 'Users', roles: ['Admin'] },
  ];

  const filteredMenu = menuItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  // Filter menu items based on search query
  const searchFilteredMenu = filteredMenu.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="sidebar bg-white flex flex-col" data-testid="sidebar">
      {/* Logo - larger */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex flex-col items-center gap-2">
          <img src={require('../assets/magnova_logo.png')} alt="Magnova Logo" className="h-14 w-auto object-contain" />
          <p className="text-xs text-gray-500 font-semibold tracking-wide">ERP SYSTEM</p>
        </div>
      </div>

      {/* Welcome card - redesigned */}
      <div className="px-3 pt-4">
        <div className="mb-3 px-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium">Welcome back,</p>
              <p className="text-sm font-bold text-gray-900 truncate" title={user?.name}>{user?.name}</p>
              <p className="text-xs text-gray-600 font-semibold">{roleDisplayNames[user?.role] || user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - compact */}
      <div className="px-3 mb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none z-10" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-14 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            <kbd className="px-1 py-0.5 text-[10px] font-semibold text-neutral-400 bg-white border border-neutral-200 rounded">
              ⌘
            </kbd>
            <span className="text-[10px] font-semibold text-neutral-400">K</span>
          </div>
        </div>
      </div>

      {/* Navigation - compact */}
      <nav className="flex-1 px-3 py-1 overflow-y-auto space-y-0.5">
        {searchFilteredMenu.length > 0 ? (
          searchFilteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`nav-item flex items-center px-3 py-2 text-[13px] font-medium rounded-md transition-all duration-150 ${
                  isActive
                    ? 'text-gray-900 bg-[#EAEFEF] border-l-[3px] border-gray-800'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] mr-2.5 ${isActive ? 'text-gray-800' : 'text-neutral-400'}`} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })
        ) : (
          <div className="text-center py-4 text-neutral-400 text-xs">
            No menu items found
          </div>
        )}
      </nav>

      {/* Bottom Section - compact */}
      <div className="border-t border-neutral-200 bg-white mt-auto">
        <div className="px-3 py-2 space-y-0.5">
          <button
            className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition-all duration-150"
            onClick={() => navigate('/maintenance')}
          >
            <Settings className="w-[18px] h-[18px] mr-2.5 text-neutral-400" strokeWidth={2} />
            Settings
          </button>
          <button
            className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition-all duration-150"
            onClick={() => navigate('/maintenance')}
          >
            <HelpCircle className="w-[18px] h-[18px] mr-2.5 text-neutral-400" strokeWidth={2} />
            Help & Center
          </button>
        </div>
        
        {/* Logout */}
        <div className="px-3 py-2 border-t border-neutral-200">
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-150"
          >
            <LogOut className="w-[18px] h-[18px] mr-2.5 text-neutral-400" strokeWidth={2} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
