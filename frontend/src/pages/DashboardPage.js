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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reports/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      title: 'Total Purchase Orders',
      value: stats?.total_pos || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_pos || 0,
      icon: Clock,
      color: 'text-magnova-orange',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Total Procurement',
      value: stats?.total_procurement || 0,
      icon: Package,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Total Inventory',
      value: stats?.total_inventory || 0,
      icon: Boxes,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Available Stock',
      value: stats?.available_inventory || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Sales Orders',
      value: stats?.total_sales || 0,
      icon: TrendingUp,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
  ];

  return (
    <Layout>
      <div data-testid="dashboard-page">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome back, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="card-hover shadow-sm bg-white" data-testid={`stat-card-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {user?.organization === 'Magnova' && (
                  <Link
                    to="/purchase-orders"
                    data-testid="quick-action-po"
                    className="block p-3 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors duration-200 group"
                  >
                    <p className="font-medium text-magnova-orange group-hover:text-magnova-blue">Create Purchase Order</p>
                    <p className="text-sm text-slate-600">Start a new procurement request</p>
                  </Link>
                )}
                {user?.organization === 'Nova' && (
                  <Link
                    to="/procurement"
                    data-testid="quick-action-procurement"
                    className="block p-3 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors duration-200 group"
                  >
                    <p className="font-medium text-magnova-orange group-hover:text-magnova-blue">Add Procurement</p>
                    <p className="text-sm text-slate-600">Record new device procurement</p>
                  </Link>
                )}
                <Link
                  to="/inventory"
                  data-testid="quick-action-inventory"
                  className="block p-3 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors duration-200 group"
                >
                  <p className="font-medium text-magnova-orange group-hover:text-magnova-blue">View Inventory</p>
                  <p className="text-sm text-slate-600">Check current stock levels</p>
                </Link>
                <Link
                  to="/reports"
                  data-testid="quick-action-reports"
                  className="block p-3 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors duration-200 group"
                >
                  <p className="font-medium text-magnova-orange group-hover:text-magnova-blue">Generate Reports</p>
                  <p className="text-sm text-slate-600">Export data and analytics</p>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Organization</p>
                    <p className="text-lg font-bold text-slate-900">{user?.organization}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Your Role</p>
                    <p className="text-lg font-bold text-slate-900">{user?.role}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-md border border-emerald-200">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">System Status</p>
                    <p className="text-lg font-bold text-emerald-900">Operational</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
