import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

export const ReportsPage = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reports/dashboard');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch statistics');
    }
  };

  const handleExportInventory = async () => {
    try {
      const response = await api.get('/reports/export/inventory', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  return (
    <Layout>
      <div data-testid="reports-page">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">Generate and export business reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-2">Total Purchase Orders</p>
            <p className="text-4xl font-bold text-slate-900">{stats?.total_pos || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-2">Total Procurement</p>
            <p className="text-4xl font-bold text-slate-900">{stats?.total_procurement || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-2">Total Inventory</p>
            <p className="text-4xl font-bold text-slate-900">{stats?.total_inventory || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-2">Available Stock</p>
            <p className="text-4xl font-bold text-emerald-600">{stats?.available_inventory || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-2">Total Sales Orders</p>
            <p className="text-4xl font-bold text-slate-900">{stats?.total_sales || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-2">Total Payments</p>
            <p className="text-4xl font-bold text-slate-900">₹{stats?.total_payment_amount?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Export Reports</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-medium text-slate-900">Inventory Report</p>
                <p className="text-sm text-slate-600">Export complete IMEI inventory data</p>
              </div>
              <Button onClick={handleExportInventory} data-testid="export-inventory-button">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
