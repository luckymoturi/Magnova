import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, Clock, Search, Download, FileSpreadsheet, BarChart3, ShoppingCart, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import { Navigate } from 'react-router-dom';

export const ManagerPage = () => {
  const [pos, setPos] = useState([]);
  const [filteredPos, setFilteredPos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewDialog, setViewDialog] = useState({ open: false, po: null });
  const [approvalDialog, setApprovalDialog] = useState({ open: false, po: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'reports'
  const { user } = useAuth();
  const { refreshTimestamps, refreshAfterPOChange, addProcurementNotification } = useDataRefresh();

  const isAllowed = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    if (isAllowed) fetchPOs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTimestamps.purchaseOrders, isAllowed]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, pos]);

  if (!isAllowed) return <Navigate to="/dashboard" replace />;

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/purchase-orders');
      setPos(response.data);
    } catch (error) {
      toast.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = pos;

    // Tab-based filter
    if (activeTab === 'pending') {
      filtered = filtered.filter(po => po.approval_status === 'Pending');
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(po => po.approval_status === statusFilter);
    }

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(po =>
        po.po_number?.toLowerCase().includes(term) ||
        po.purchase_office?.toLowerCase().includes(term) ||
        po.created_by_name?.toLowerCase().includes(term) ||
        po.items?.some(item =>
          item.vendor?.toLowerCase().includes(term) ||
          item.brand?.toLowerCase().includes(term) ||
          item.model?.toLowerCase().includes(term)
        )
      );
    }

    setFilteredPos(filtered);
  };

  const handleApproval = async (poNumber, action) => {
    try {
      await api.post(`/purchase-orders/${poNumber}/approve`, {
        action,
        rejection_reason: action === 'reject' ? rejectionReason : null,
      });
      toast.success(`PO ${action === 'approve' ? 'Approved' : 'Rejected'} successfully`);
      setApprovalDialog({ open: false, po: null });
      setRejectionReason('');
      
      if (action === 'approve') {
        const po = pos.find(p => p.po_number === poNumber);
        if (po) {
          addProcurementNotification({
            po_number: po.po_number,
            vendor: po.items?.[0]?.vendor || '',
            brand: po.items?.[0]?.brand || '',
            model: po.items?.[0]?.model || '',
            location: po.items?.[0]?.location || '',
            items: po.items || [],
          });
        }
      }
      
      refreshAfterPOChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} PO`);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      Pending: 'bg-amber-100 text-amber-700 border border-amber-200',
      Rejected: 'bg-red-100 text-red-700 border border-red-200',
      Created: 'bg-blue-100 text-blue-700 border border-blue-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles[status] || 'bg-neutral-100 text-neutral-700'}`}>
        {status}
      </span>
    );
  };

  // Stats for Manager
  const pendingPOs = pos.filter(po => po.approval_status === 'Pending');
  const approvedPOs = pos.filter(po => po.approval_status === 'Approved');
  const rejectedPOs = pos.filter(po => po.approval_status === 'Rejected');
  const totalValue = approvedPOs.reduce((sum, po) => sum + (po.total_value || 0), 0);

  // Export approved/rejected report
  const handleExportCSV = () => {
    const reportData = pos.filter(po => po.approval_status === 'Approved' || po.approval_status === 'Rejected');
    if (reportData.length === 0) {
      toast.error('No approval data to export');
      return;
    }
    const headers = ['PO Number', 'Date', 'Purchase Office', 'Created By', 'Total Qty', 'Total Value', 'Status', 'Decision Date'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(po => [
        po.po_number,
        po.po_date ? new Date(po.po_date).toLocaleDateString() : '-',
        po.purchase_office,
        po.created_by_name,
        po.total_quantity,
        po.total_value?.toFixed(2) || '0',
        po.approval_status,
        po.approved_at ? new Date(po.approved_at).toLocaleDateString() : '-',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `manager_approvals_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Report exported successfully');
  };

  const pendingDisplayData = activeTab === 'pending'
    ? filteredPos
    : pos.filter(po => po.approval_status === 'Approved' || po.approval_status === 'Rejected');

  return (
    <Layout pageTitle="Manager Approvals" pageDescription="Review and approve payment requests, view approval reports">
      <div data-testid="manager-page">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Pending</p>
                <p className="text-2xl font-bold text-amber-700">{pendingPOs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Approved</p>
                <p className="text-2xl font-bold text-emerald-700">{approvedPOs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedPOs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-neutral-700" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Approved Value</p>
                <p className="text-lg font-bold text-neutral-900">₹{(totalValue / 100000).toFixed(1)}L</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 bg-neutral-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => { setActiveTab('pending'); setStatusFilter('all'); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pending'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <ShoppingCart className="w-4 h-4 inline mr-2" />
            Pending Approvals
            {pendingPOs.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingPOs.length}</span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('reports'); setStatusFilter('all'); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'reports'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Approval Reports
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 pointer-events-none z-10" />
              <Input
                placeholder="Search PO, office, vendor, model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {activeTab === 'reports' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {activeTab === 'reports' && (
            <Button onClick={handleExportCSV} variant="outline" className="border-neutral-300 text-neutral-700">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-900" style={{ backgroundColor: '#BFC9D1' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Office</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Created By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Total Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">Loading...</td>
                  </tr>
                ) : pendingDisplayData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                      {activeTab === 'pending' ? 'No pending approvals' : 'No approval records found'}
                    </td>
                  </tr>
                ) : (
                  pendingDisplayData.map((po) => (
                    <tr key={po.po_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 font-mono font-semibold text-neutral-900">{po.po_number}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {po.po_date ? new Date(po.po_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{po.purchase_office || '-'}</td>
                      <td className="px-4 py-3 text-neutral-700">{po.created_by_name || '-'}</td>
                      <td className="px-4 py-3 text-neutral-600">{po.items?.length || 0} item(s)</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{po.total_quantity}</td>
                      <td className="px-4 py-3 font-bold text-neutral-900">₹{(po.total_value || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{getStatusBadge(po.approval_status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewDialog({ open: true, po })}
                            className="text-neutral-900 h-7 w-7 p-0"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {po.approval_status === 'Pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setApprovalDialog({ open: true, po })}
                              className="h-7 text-xs px-2 border-neutral-300"
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary for Reports Tab */}
        {activeTab === 'reports' && pendingDisplayData.length > 0 && (
          <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Total Records:</span>
                <span className="ml-2 font-bold text-neutral-900">{pendingDisplayData.length}</span>
              </div>
              <div>
                <span className="text-neutral-500">Total Value:</span>
                <span className="ml-2 font-bold text-neutral-900">
                  ₹{pendingDisplayData.reduce((sum, po) => sum + (po.total_value || 0), 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Total Qty:</span>
                <span className="ml-2 font-bold text-neutral-900">
                  {pendingDisplayData.reduce((sum, po) => sum + (po.total_quantity || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Approval Dialog */}
        <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ open, po: approvalDialog.po })}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-neutral-900">Review Purchase Order</DialogTitle>
              <DialogDescription className="text-neutral-600">
                PO: <span className="font-mono font-bold">{approvalDialog.po?.po_number}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-lg text-sm">
                <div>
                  <p className="text-neutral-500 text-xs">PO Date</p>
                  <p className="font-medium text-neutral-900">
                    {approvalDialog.po?.po_date ? new Date(approvalDialog.po.po_date).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Office</p>
                  <p className="font-medium text-neutral-900">{approvalDialog.po?.purchase_office || '-'}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Created By</p>
                  <p className="font-medium text-neutral-900">{approvalDialog.po?.created_by_name || '-'}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Total Value</p>
                  <p className="font-bold text-neutral-900">₹{(approvalDialog.po?.total_value || 0).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <Label className="text-neutral-700 font-medium">Rejection Reason (only if rejecting)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="bg-white text-neutral-900 border-neutral-300 mt-1"
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleApproval(approvalDialog.po?.po_number, 'approve')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleApproval(approvalDialog.po?.po_number, 'reject')}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View PO Dialog */}
        <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, po: viewDialog.po })}>
          <DialogContent className="bg-white max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-neutral-900">Purchase Order Details</DialogTitle>
              <DialogDescription className="text-neutral-600">
                PO: <span className="font-mono font-bold text-neutral-900">{viewDialog.po?.po_number}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <p className="text-xs text-neutral-500 uppercase">PO Date</p>
                  <p className="text-sm font-medium text-neutral-900">
                    {viewDialog.po?.po_date ? new Date(viewDialog.po.po_date).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Purchase Office</p>
                  <p className="text-sm font-medium text-neutral-900">{viewDialog.po?.purchase_office || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Created By</p>
                  <p className="text-sm font-medium text-neutral-900">{viewDialog.po?.created_by_name}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Status</p>
                  {viewDialog.po && getStatusBadge(viewDialog.po.approval_status)}
                </div>
              </div>
              {viewDialog.po?.items?.length > 0 && (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-gray-900" style={{ backgroundColor: '#BFC9D1' }}>
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">SL</th>
                          <th className="px-3 py-2 text-left font-medium">Vendor</th>
                          <th className="px-3 py-2 text-left font-medium">Location</th>
                          <th className="px-3 py-2 text-left font-medium">Brand</th>
                          <th className="px-3 py-2 text-left font-medium">Model</th>
                          <th className="px-3 py-2 text-left font-medium">Storage</th>
                          <th className="px-3 py-2 text-left font-medium">Qty</th>
                          <th className="px-3 py-2 text-left font-medium">Rate</th>
                          <th className="px-3 py-2 text-left font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewDialog.po.items.map((item, i) => (
                          <tr key={i} className="border-t border-neutral-100 hover:bg-neutral-50">
                            <td className="px-3 py-2 text-neutral-700">{item.sl_no || i + 1}</td>
                            <td className="px-3 py-2 text-neutral-900">{item.vendor}</td>
                            <td className="px-3 py-2 text-neutral-700">{item.location}</td>
                            <td className="px-3 py-2 text-neutral-900">{item.brand}</td>
                            <td className="px-3 py-2 text-neutral-900">{item.model}</td>
                            <td className="px-3 py-2 text-neutral-700">{item.storage || '-'}</td>
                            <td className="px-3 py-2 text-neutral-900 font-medium">{item.qty}</td>
                            <td className="px-3 py-2 text-neutral-900">₹{(item.rate || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-neutral-900 font-bold">₹{(item.po_value || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-neutral-50 border-t-2 border-neutral-200">
                        <tr>
                          <td colSpan={6} className="px-3 py-2 text-right font-semibold text-neutral-900">Total:</td>
                          <td className="px-3 py-2 font-bold text-neutral-900">{viewDialog.po.total_quantity}</td>
                          <td></td>
                          <td className="px-3 py-2 font-bold text-neutral-900">₹{(viewDialog.po.total_value || 0).toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
};
