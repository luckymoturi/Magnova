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
    <Layout>
      <div data-testid="dashboard-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Dashboard</h1>
            <p className="text-neutral-600 mt-1">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button 
              onClick={fetchStats}
              disabled={isRefreshing}
              className={`p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
              data-testid="refresh-dashboard-btn"
            >
              <RefreshCw className={`w-4 h-4 text-neutral-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="card-hover shadow-sm bg-white border border-neutral-200" data-testid={`stat-card-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-500 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor} border border-neutral-100`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm bg-white border border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-neutral-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {user?.organization === 'Magnova' && (
                  <Link
                    to="/purchase-orders"
                    data-testid="quick-action-po"
                    className="block p-3 hover:bg-neutral-50 rounded-md border border-neutral-200 transition-colors duration-200 group"
                  >
                    <p className="font-medium text-teal-600 group-hover:text-neutral-900">Create Purchase Order</p>
                    <p className="text-sm text-neutral-500">Start a new procurement request</p>
                  </Link>
                )}
                {user?.organization === 'Nova' && (
                  <Link
                    to="/procurement"
                    data-testid="quick-action-procurement"
                    className="block p-3 hover:bg-neutral-50 rounded-md border border-neutral-200 transition-colors duration-200 group"
                  >
                    <p className="font-medium text-teal-600 group-hover:text-neutral-900">Add Procurement</p>
                    <p className="text-sm text-neutral-500">Record new device procurement</p>
                  </Link>
                )}
                <Link
                  to="/inventory"
                  data-testid="quick-action-inventory"
                  className="block p-3 hover:bg-neutral-50 rounded-md border border-neutral-200 transition-colors duration-200 group"
                >
                  <p className="font-medium text-teal-600 group-hover:text-neutral-900">View Inventory</p>
                  <p className="text-sm text-neutral-500">Check current stock levels</p>
                </Link>
                <Link
                  to="/reports"
                  data-testid="quick-action-reports"
                  className="block p-3 hover:bg-neutral-50 rounded-md border border-neutral-200 transition-colors duration-200 group"
                >
                  <p className="font-medium text-teal-600 group-hover:text-neutral-900">Generate Reports</p>
                  <p className="text-sm text-neutral-500">Export data and analytics</p>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-white border border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-neutral-900">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md border border-neutral-100">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Organization</p>
                    <p className="text-lg font-bold text-neutral-900">{user?.organization}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md border border-neutral-100">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Your Role</p>
                    <p className="text-lg font-bold text-neutral-900">{user?.role}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-teal-50 rounded-md border border-teal-100">
                  <div>
                    <p className="text-sm font-medium text-teal-600">System Status</p>
                    <p className="text-lg font-bold text-teal-700">Operational</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
