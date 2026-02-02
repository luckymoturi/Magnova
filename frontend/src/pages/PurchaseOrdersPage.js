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
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PurchaseOrdersPage = () => {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, po: null });
  const [formData, setFormData] = useState({ total_quantity: '', notes: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [lineItems, setLineItems] = useState([{
    vendor: '',
    location: '',
    brand: '',
    model: '',
    storage: '',
    colour: '',
    imei: '',
    qty: '1',
    rate: '',
  }]);
  const { user } = useAuth();

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      const response = await api.get('/purchase-orders');
      setPos(response.data);
    } catch (error) {
      toast.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Calculate total quantity from line items
      const totalQty = lineItems.reduce((sum, item) => sum + parseInt(item.qty || 0), 0);
      
      await api.post('/purchase-orders', {
        total_quantity: totalQty,
        notes: JSON.stringify(lineItems), // Store line items in notes for now
      });
      toast.success('Purchase order created successfully');
      setDialogOpen(false);
      setFormData({ total_quantity: '', notes: '' });
      setLineItems([{
        vendor: '',
        location: '',
        brand: '',
        model: '',
        storage: '',
        colour: '',
        imei: '',
        qty: '1',
        rate: '',
      }]);
      fetchPOs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create PO');
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      vendor: '',
      location: '',
      brand: '',
      model: '',
      storage: '',
      colour: '',
      imei: '',
      qty: '1',
      rate: '',
    }]);
  };

  const removeLineItem = (index) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems.length > 0 ? updatedItems : [{
      vendor: '',
      location: '',
      brand: '',
      model: '',
      storage: '',
      colour: '',
      imei: '',
      qty: '1',
      rate: '',
    }]);
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index][field] = value;
    setLineItems(updatedItems);
  };

  const calculatePOValue = (qty, rate) => {
    const quantity = parseFloat(qty) || 0;
    const price = parseFloat(rate) || 0;
    return (quantity * price).toFixed(2);
  };

  const handleApproval = async (poNumber, action) => {
    try {
      await api.post(`/purchase-orders/${poNumber}/approve`, {
        action,
        rejection_reason: action === 'reject' ? rejectionReason : null,
      });
      toast.success(`PO ${action}d successfully`);
      setApprovalDialog({ open: false, po: null });
      setRejectionReason('');
      fetchPOs();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} PO`);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Approved: 'status-approved',
      Pending: 'status-pending',
      Rejected: 'status-rejected',
      Created: 'status-created',
    };
    return <span className={`status-badge ${styles[status] || 'status-created'}`}>{status}</span>;
  };

  return (
    <Layout>
      <div data-testid="purchase-orders-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Purchase Orders</h1>
            <p className="text-slate-600 mt-1">Manage procurement requests</p>
          </div>
          {user?.organization === 'Magnova' && (user?.role === 'Purchase' || user?.role === 'Admin') && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-po-button" className="bg-magnova-blue hover:bg-magnova-dark-blue">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Purchase Order
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle className="text-magnova-orange">Create Purchase Order</DialogTitle>
                  <DialogDescription className="text-slate-600">Enter purchase order details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4" data-testid="create-po-form">
                  <div>
                    <Label htmlFor="quantity" className="text-slate-900">Total Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.total_quantity}
                      onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                      required
                      placeholder="Enter quantity (e.g., 50)"
                      className="bg-white text-slate-900 border-slate-300"
                      data-testid="po-quantity-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-slate-900">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Add any special instructions or requirements..."
                      className="bg-white text-slate-900 border-slate-300"
                      data-testid="po-notes-input"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-magnova-blue hover:bg-magnova-dark-blue" data-testid="po-submit-button">
                    Create Purchase Order
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="po-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : pos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  pos.map((po) => (
                    <tr key={po.po_number} className="table-row border-b border-slate-100" data-testid="po-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">
                        {po.po_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{po.created_by_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{po.total_quantity}</td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(po.approval_status)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(po.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {po.approval_status === 'Pending' && (user?.role === 'Approver' || user?.role === 'Admin') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setApprovalDialog({ open: true, po })}
                            data-testid="approve-po-button"
                          >
                            Review
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog
          open={approvalDialog.open}
          onOpenChange={(open) => setApprovalDialog({ open, po: approvalDialog.po })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Purchase Order</DialogTitle>
              <DialogDescription>
                PO Number: <span className="font-mono font-bold">{approvalDialog.po?.po_number}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Quantity: {approvalDialog.po?.total_quantity}</p>
                <p className="text-sm text-slate-600">Notes: {approvalDialog.po?.notes || 'N/A'}</p>
              </div>
              <div>
                <Label htmlFor="rejection">Rejection Reason (if rejecting)</Label>
                <Textarea
                  id="rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  data-testid="rejection-reason-input"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApproval(approvalDialog.po?.po_number, 'approve')}
                  className="flex-1"
                  data-testid="approve-button"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleApproval(approvalDialog.po?.po_number, 'reject')}
                  variant="destructive"
                  className="flex-1"
                  data-testid="reject-button"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
