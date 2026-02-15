import React from 'react';
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
} from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  return (
    <div className="sidebar bg-white" data-testid="sidebar">
      <div className="p-1 border-b border-gray-200">
        <div className="text-center flex flex-col items-center justify-center">
          <img src={require('../assets/magnova_logo.png')} alt="Magnova Logo" className="h-40 w-auto object-contain" />
          <p className="text-xs text-gray-600 -mt-4">ERP System</p>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-8 p-5 bg-gradient-to-br from-neutral-50 to-white rounded-lg border border-neutral-200 shadow-sm">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Logged in as</p>
          <p className="text-base font-bold text-neutral-900 mt-2">{user?.name}</p>
          <p className="text-sm text-neutral-600 mt-1.5 font-medium">{user?.organization}</p>
          <p className="text-sm text-teal-600 font-bold mt-1.5">{user?.role}</p>
        </div>

        <nav className="space-y-3">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`nav-item flex items-center px-5 py-3.5 rounded-lg text-lg font-bold transition-all duration-200 ${
                  isActive
                    ? 'active text-teal-700 bg-teal-50 border-l-4 border-teal-600'
                    : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Icon className="w-6 h-6 mr-4" strokeWidth={2.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-neutral-200 bg-white">
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="flex items-center w-full px-5 py-3.5 text-lg font-bold text-neutral-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
        >
          <LogOut className="w-6 h-6 mr-4" strokeWidth={2.5} />
          Logout
        </button>
      </div>
    </div>
  );
};
