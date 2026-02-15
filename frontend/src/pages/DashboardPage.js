import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  ShoppingCart,
  Package,
  CreditCard,
  Boxes,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const { refreshTimestamps } = useDataRefresh();

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // React to global refresh triggers
  useEffect(() => {
    if (!loading) {
      fetchStats();
    }
  }, [refreshTimestamps.dashboard]);

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      const response = await api.get('/reports/dashboard');
      setStats(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-500">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      title: 'Total Purchase Orders',
      value: stats?.total_pos || 0,
      icon: ShoppingCart,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50/50',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_pos || 0,
      icon: Clock,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-50',
    },
    {
      title: 'Total Procurement',
      value: stats?.total_procurement || 0,
      icon: Package,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50/50',
    },
    {
      title: 'Total Inventory',
      value: stats?.total_inventory || 0,
      icon: Boxes,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50/50',
    },
    {
      title: 'Available Stock',
      value: stats?.available_inventory || 0,
      icon: CheckCircle2,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50/50',
    },
    {
      title: 'Total Sales Orders',
      value: stats?.total_sales || 0,
      icon: TrendingUp,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50/50',
    },
  ];

  return (
    <Layout pageTitle="Dashboard" pageDescription={`Welcome back, ${user?.name}`}>
      <div data-testid="dashboard-page" className="space-y-8">
        {/* Header Section - Enhanced */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-neutral-200 shadow-sm">
                <Clock className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-600">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            )}
            <button 
              onClick={fetchStats}
              disabled={isRefreshing}
              className={`p-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-teal-50 hover:border-teal-300 transition-all shadow-sm ${isRefreshing ? 'opacity-50' : ''}`}
              data-testid="refresh-dashboard-btn"
            >
              <RefreshCw className={`w-4 h-4 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Cards - Enhanced Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="relative overflow-hidden border-2 border-neutral-200 hover:border-teal-300 hover:shadow-xl transition-all duration-300 bg-white" 
                data-testid={`stat-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">{stat.title}</p>
                      <p className="text-4xl font-black text-neutral-900">{stat.value}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${stat.bgColor} border-2 border-neutral-100 shadow-sm`}>
                      <Icon className={`w-7 h-7 ${stat.color}`} strokeWidth={2} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions & System Overview - Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="border-2 border-neutral-200 shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader className="border-b border-neutral-100 bg-gradient-to-r from-neutral-50 to-white">
              <CardTitle className="text-xl font-black text-neutral-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {user?.organization === 'Magnova' && (
                  <Link
                    to="/purchase-orders"
                    data-testid="quick-action-po"
                    className="flex items-center gap-4 p-4 hover:bg-teal-50 rounded-lg border-2 border-neutral-200 hover:border-teal-300 transition-all duration-200 group"
                  >
                    <div className="p-3 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                      <ShoppingCart className="w-5 h-5 text-teal-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 group-hover:text-teal-700 transition-colors">Create Purchase Order</p>
                      <p className="text-sm text-neutral-500">Start a new procurement request</p>
                    </div>
                  </Link>
                )}
                {user?.organization === 'Nova' && (
                  <Link
                    to="/procurement"
                    data-testid="quick-action-procurement"
                    className="flex items-center gap-4 p-4 hover:bg-teal-50 rounded-lg border-2 border-neutral-200 hover:border-teal-300 transition-all duration-200 group"
                  >
                    <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <Package className="w-5 h-5 text-purple-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 group-hover:text-purple-700 transition-colors">Add Procurement</p>
                      <p className="text-sm text-neutral-500">Record new device procurement</p>
                    </div>
                  </Link>
                )}
                <Link
                  to="/inventory"
                  data-testid="quick-action-inventory"
                  className="flex items-center gap-4 p-4 hover:bg-teal-50 rounded-lg border-2 border-neutral-200 hover:border-teal-300 transition-all duration-200 group"
                >
                  <div className="p-3 bg-cyan-100 rounded-lg group-hover:bg-cyan-200 transition-colors">
                    <Boxes className="w-5 h-5 text-cyan-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-neutral-900 group-hover:text-cyan-700 transition-colors">View Inventory</p>
                    <p className="text-sm text-neutral-500">Check current stock levels</p>
                  </div>
                </Link>
                <Link
                  to="/reports"
                  data-testid="quick-action-reports"
                  className="flex items-center gap-4 p-4 hover:bg-teal-50 rounded-lg border-2 border-neutral-200 hover:border-teal-300 transition-all duration-200 group"
                >
                  <div className="p-3 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                    <CreditCard className="w-5 h-5 text-violet-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-neutral-900 group-hover:text-violet-700 transition-colors">Generate Reports</p>
                    <p className="text-sm text-neutral-500">Export data and analytics</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* System Overview */}
          <Card className="border-2 border-neutral-200 shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader className="border-b border-neutral-100 bg-gradient-to-r from-neutral-50 to-white">
              <CardTitle className="text-xl font-black text-neutral-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-teal-600" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-white rounded-lg border-2 border-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-200 rounded-lg">
                      <Package className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Organization</p>
                      <p className="text-lg font-black text-neutral-900">{user?.organization}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-white rounded-lg border-2 border-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-200 rounded-lg">
                      <CreditCard className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Your Role</p>
                      <p className="text-lg font-black text-neutral-900">{user?.role}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-2 border-teal-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-200 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">System Status</p>
                      <p className="text-lg font-black text-teal-700">Operational</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
