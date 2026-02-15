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

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'Purchase', 'Approver', 'Accounts', 'Stores', 'Logistics', 'Sales'] },
    { path: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders', roles: ['Admin', 'Purchase', 'Approver'] },
    { path: '/payments', icon: CreditCard, label: 'Payments', roles: ['Admin', 'Accounts'] },
    { path: '/procurement', icon: Package, label: 'Procurement', roles: ['Admin', 'Stores'] },
    { path: '/logistics', icon: Truck, label: 'Logistics', roles: ['Admin', 'Logistics'] },
    { path: '/inventory', icon: Boxes, label: 'Inventory', roles: ['Admin', 'Stores', 'Logistics'] },
    { path: '/invoices', icon: FileText, label: 'Invoices', roles: ['Admin', 'Accounts'] },
    { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['Admin', 'Approver'] },
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
    <div className="sidebar bg-white" data-testid="sidebar">
      <div className="p-3 border-b border-gray-200">
        <div className="text-center flex flex-col items-center justify-center">
          <img src={require('../assets/magnova_logo.png')} alt="Magnova Logo" className="h-24 w-auto object-contain" />
          <p className="text-xs text-gray-600 -mt-2 font-medium">ERP System</p>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6 p-3 bg-gradient-to-br from-teal-50 to-white rounded-lg border border-teal-200 shadow-sm">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Welcome</p>
          <p className="text-sm font-bold text-neutral-900 mt-1 truncate" title={user?.name}>{user?.name}</p>
          <p className="text-xs text-teal-600 font-bold mt-1">{user?.role}</p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none z-10" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-16 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-neutral-500 bg-white border border-neutral-200 rounded shadow-sm">
              ⌘
            </kbd>
            <span className="text-sm font-semibold text-neutral-500">K</span>
          </div>
        </div>

        <nav className="space-y-2">
          {searchFilteredMenu.length > 0 ? (
            searchFilteredMenu.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`nav-item flex items-center px-3 py-2.5 rounded-lg text-base font-bold transition-all duration-200 ${
                    isActive
                      ? 'active text-teal-700 bg-teal-50 border-l-4 border-teal-600'
                      : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" strokeWidth={2.5} />
                  {item.label}
                </Link>
              );
            })
          ) : (
            <div className="text-center py-4 text-neutral-500 text-sm">
              No menu items found
            </div>
          )}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white">
        {/* Settings and Help */}
        <div className="p-4 space-y-2 border-b border-neutral-200">
          <button
            className="flex items-center w-full px-3 py-2.5 text-base font-bold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-all duration-200"
            onClick={() => navigate('/maintenance')}
          >
            <Settings className="w-5 h-5 mr-3" strokeWidth={2.5} />
            Settings
          </button>
          <button
            className="flex items-center w-full px-3 py-2.5 text-base font-bold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-all duration-200"
            onClick={() => navigate('/maintenance')}
          >
            <HelpCircle className="w-5 h-5 mr-3" strokeWidth={2.5} />
            Help & Center
          </button>
        </div>
        
        {/* Logout */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center w-full px-3 py-2.5 text-base font-bold text-neutral-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
          >
            <LogOut className="w-5 h-5 mr-3" strokeWidth={2.5} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
