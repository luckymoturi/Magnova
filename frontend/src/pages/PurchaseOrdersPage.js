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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, CheckCircle, XCircle, Eye, Trash2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import { POLineItemRow } from '../components/POLineItemRow';

const emptyItem = { vendor: '', location: '', brand: '', model: '', storage: '', colour: '', qty: '1', rate: '' };

export const PurchaseOrdersPage = () => {
  const [pos, setPos] = useState([]);
  const [filteredPos, setFilteredPos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState({ open: false, po: null });
  const [approvalDialog, setApprovalDialog] = useState({ open: false, po: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseOffice, setPurchaseOffice] = useState('Magnova Head Office');
  const [lineItems, setLineItems] = useState([{ ...emptyItem }]);
  const { user } = useAuth();
  const { refreshTimestamps, triggerGlobalRefresh, refreshAfterPOChange, addProcurementNotification } = useDataRefresh();
  const isAdmin = user?.role === 'Admin';

  useEffect(() => { fetchPOs(); }, [refreshTimestamps.purchaseOrders]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPos(pos);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = pos.filter(po => 
        po.po_number?.toLowerCase().includes(term) ||
        po.purchase_office?.toLowerCase().includes(term) ||
        po.status?.toLowerCase().includes(term) ||
        po.items?.some(item => 
          item.vendor?.toLowerCase().includes(term) ||
          item.location?.toLowerCase().includes(term) ||
          item.brand?.toLowerCase().includes(term) ||
          item.model?.toLowerCase().includes(term) ||
          item.storage?.toLowerCase().includes(term)
        )
      );
      setFilteredPos(filtered);
    }
  }, [searchTerm, pos]);

  const fetchPOs = async () => {
    try {
      const response = await api.get('/purchase-orders');
      setPos(response.data);
      setFilteredPos(response.data);
    } catch (error) {
      toast.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPoDate(new Date().toISOString().split('T')[0]);
    setPurchaseOffice('Magnova Head Office');
    setLineItems([{ ...emptyItem }]);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const items = lineItems.map((item, index) => ({
        sl_no: index + 1, vendor: item.vendor, location: item.location, brand: item.brand, model: item.model,
        storage: item.storage || null,
        qty: parseInt(item.qty) || 1, rate: parseFloat(item.rate) || 0,
        po_value: (parseInt(item.qty) || 1) * (parseFloat(item.rate) || 0)
      }));
      const response = await api.post('/purchase-orders', { po_date: new Date(poDate).toISOString(), purchase_office: purchaseOffice, items, notes: null });
      
      toast.success('Purchase order created successfully - Awaiting approval');
      setDialogOpen(false);
      resetForm();
      refreshAfterPOChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create PO');
    }
  };

  const addLineItem = () => setLineItems([...lineItems, { ...emptyItem }]);
  const removeLineItem = (index) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated.length > 0 ? updated : [{ ...emptyItem }]);
  };
  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const calcValue = (q, r) => ((parseFloat(q) || 0) * (parseFloat(r) || 0)).toFixed(2);
  const totalQty = lineItems.reduce((s, i) => s + parseInt(i.qty || 0), 0);
  const totalValue = lineItems.reduce((s, i) => s + parseFloat(calcValue(i.qty, i.rate)), 0).toFixed(2);

  const handleApproval = async (poNumber, action) => {
    try {
      await api.post(`/purchase-orders/${poNumber}/approve`, { action, rejection_reason: action === 'reject' ? rejectionReason : null });
      toast.success(`PO ${action}d successfully`);
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
      refreshAfterPOChange(); // Trigger refresh across all related modules
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} PO`);
    }
  };

  const handleDelete = async (poNumber) => {
    try {
      // First get related counts
      const countsResponse = await api.get(`/purchase-orders/${poNumber}/related-counts`);
      const counts = countsResponse.data;
      
      // Build confirmation message with related counts
      let confirmMsg = `Are you sure you want to delete PO ${poNumber}?\n\n`;
      confirmMsg += `This will also DELETE all related records:\n`;
      confirmMsg += `• Procurement Records: ${counts.procurement_records}\n`;
      confirmMsg += `• Payments: ${counts.payments}\n`;
      confirmMsg += `• Logistics Shipments: ${counts.logistics_shipments}\n`;
      confirmMsg += `• Inventory Items: ${counts.inventory_items}\n`;
      confirmMsg += `• Invoices: ${counts.invoices}\n`;
      confirmMsg += `\nTotal related records: ${counts.total_related}\n\n`;
      confirmMsg += `This action cannot be undone!`;
      
      if (!window.confirm(confirmMsg)) return;
      
      const response = await api.delete(`/purchase-orders/${poNumber}`);
      toast.success(response.data.message || 'Purchase order and all related data deleted');
      triggerGlobalRefresh(); // Trigger GLOBAL refresh - all modules need to update
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete PO');
    }
  };

  const getStatusBadge = (status) => {
    const styles = { Approved: 'status-approved', Pending: 'status-pending', Rejected: 'status-rejected', Created: 'status-created' };
    return <span className={`status-badge ${styles[status] || 'status-created'}`}>{status}</span>;
  };

  const canCreatePO = user?.role?.toLowerCase() === 'purchase' || user?.role?.toLowerCase() === 'admin';

  return (
    <Layout pageTitle="Purchase Orders" pageDescription="Manage procurement requests">
      <div data-testid="purchase-orders-page">
        <div className="mb-8 flex items-center justify-end">
          {canCreatePO && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-po-button" className="bg-gray-900 hover:bg-gray-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />Create Purchase Order
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-neutral-900">Create Purchase Order</DialogTitle>
                  <DialogDescription className="text-neutral-600">Nova to Magnova PO - Add line items</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-6" data-testid="create-po-form">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div className="space-y-2">
                      <Label className="text-neutral-700 font-medium">P.O Date *</Label>
                      <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="bg-white text-neutral-900 border-neutral-400" required data-testid="po-date-input" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-700 font-medium">Purchase Office *</Label>
                      <Select value={purchaseOffice} onValueChange={setPurchaseOffice}>
                        <SelectTrigger className="bg-white text-neutral-900 border-neutral-400" data-testid="purchase-office-select"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-neutral-300 z-[100]">
                          <SelectItem value="Magnova Head Office" className="text-neutral-900">Magnova Head Office</SelectItem>
                          <SelectItem value="Magnova Branch Office" className="text-neutral-900">Magnova Branch Office</SelectItem>
                          <SelectItem value="Nova Enterprises" className="text-neutral-900">Nova Enterprises</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-neutral-50">
                          <tr>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">SL No</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">Vendor</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">Location</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">Brand</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">Model</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">Storage</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">Qty</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">Rate</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">PO Value</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-neutral-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item, index) => (
                            <POLineItemRow key={index} item={item} index={index} onUpdate={updateLineItem} onRemove={removeLineItem} canRemove={lineItems.length > 1} />
                          ))}
                        </tbody>
                        <tfoot className="bg-neutral-50 border-t-2 border-neutral-200">
                          <tr>
                            <td colSpan="6" className="px-2 py-3 text-right font-medium text-neutral-900">Total:</td>
                            <td className="px-2 py-3 font-bold text-neutral-900">{totalQty}</td>
                            <td className="px-2 py-3"></td>
                            <td className="px-2 py-3 font-bold text-neutral-900">₹{totalValue}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={addLineItem} className="w-full border-gray-900 text-neutral-600 hover:bg-neutral-100">
                    <Plus className="w-4 h-4 mr-2" />Add Another Item
                  </Button>
                  <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white" data-testid="po-submit-button">Create Purchase Order</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 pointer-events-none z-10" />
            <Input
              placeholder="Search by PO Number, Office, Vendor, Location, Brand, Model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
              data-testid="search-input"
            />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs" data-testid="po-table">
              <thead className="sticky top-0 z-10">
                <tr className="text-gray-900" style={{ backgroundColor: '#BFC9D1' }}>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">SL</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">PO ID</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Office</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Vendor</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Brand</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Model</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Storage</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Qty</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Rate</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Value</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} className="px-3 py-6 text-center text-neutral-500 text-xs">Loading...</td></tr>
                ) : filteredPos.length === 0 ? (
                  <tr><td colSpan={14} className="px-3 py-6 text-center text-neutral-500 text-xs">{searchTerm ? `No results found for "${searchTerm}"` : 'No purchase orders found'}</td></tr>
                ) : filteredPos.flatMap((po, poIndex) => {
                  const items = po.items && po.items.length > 0 ? po.items : [{}];
                  return items.map((item, itemIndex) => (
                    <tr key={`${po.po_number}-${itemIndex}`} className={`border-b border-neutral-100 ${itemIndex === 0 ? 'bg-neutral-50' : 'bg-white'} hover:bg-gray-100`} data-testid="po-row">
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{item.sl_no || itemIndex + 1}</td>
                      <td className="px-2 py-1.5 text-xs font-mono font-medium text-neutral-900">{itemIndex === 0 ? po.po_number : ''}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{itemIndex === 0 ? (po.po_date ? new Date(po.po_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-') : ''}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{itemIndex === 0 ? (po.purchase_office || '-') : ''}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{item.vendor || '-'}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{item.location || '-'}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{item.brand || '-'}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{item.model || '-'}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{item.storage || '-'}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{item.qty || '-'}</td>
                      <td className="px-2 py-1.5 text-xs text-neutral-900">{item.rate ? `₹${item.rate.toFixed(2)}` : '-'}</td>
                      <td className="px-2 py-1.5 text-xs font-medium text-neutral-900">{item.po_value ? `₹${item.po_value.toFixed(2)}` : '-'}</td>
                      <td className="px-2 py-1.5 text-xs">{itemIndex === 0 ? getStatusBadge(po.approval_status) : ''}</td>
                      <td className="px-2 py-1.5 text-xs">
                        {itemIndex === 0 && (
                          <div className="flex flex-row items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewDialog({ open: true, po })} className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 h-7 w-7 p-0" data-testid="view-po-button" title="View PO"><Eye className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(po.po_number)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0" data-testid="delete-po-button" title="Delete PO"><Trash2 className="w-4 h-4" /></Button>
                            {po.approval_status === 'Pending' && (user?.role === 'Approver' || user?.role === 'Admin' || user?.role === 'Manager') && (
                              <Button size="sm" variant="outline" onClick={() => setApprovalDialog({ open: true, po })} className="h-6 text-xs px-2" data-testid="approve-po-button">Review</Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ open, po: approvalDialog.po })}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-neutral-900">Review Purchase Order</DialogTitle>
              <DialogDescription className="text-neutral-600">PO: <span className="font-mono font-bold">{approvalDialog.po?.po_number}</span></DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p><span className="text-neutral-500">PO Date:</span> {approvalDialog.po?.po_date ? new Date(approvalDialog.po.po_date).toLocaleDateString() : '-'}</p>
                <p><span className="text-neutral-500">Office:</span> {approvalDialog.po?.purchase_office || '-'}</p>
                <p><span className="text-neutral-500">Qty:</span> {approvalDialog.po?.total_quantity}</p>
                <p><span className="text-neutral-500">Value:</span> ₹{(approvalDialog.po?.total_value || 0).toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-neutral-700 font-medium">Rejection Reason (if rejecting)</Label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} className="bg-white text-neutral-900 border-neutral-400" data-testid="rejection-reason-input" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleApproval(approvalDialog.po?.po_number, 'approve')} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white" data-testid="approve-button"><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
                <Button onClick={() => handleApproval(approvalDialog.po?.po_number, 'reject')} variant="destructive" className="flex-1" data-testid="reject-button"><XCircle className="w-4 h-4 mr-2" />Reject</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, po: viewDialog.po })}>
          <DialogContent className="bg-white max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-neutral-900">Purchase Order Details</DialogTitle>
              <DialogDescription className="text-neutral-600">PO: <span className="font-mono font-bold text-neutral-900">{viewDialog.po?.po_number}</span></DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div><p className="text-xs text-neutral-500 uppercase">PO Date</p><p className="text-sm font-medium text-neutral-900">{viewDialog.po?.po_date ? new Date(viewDialog.po.po_date).toLocaleDateString() : '-'}</p></div>
                <div><p className="text-xs text-neutral-500 uppercase">Purchase Office</p><p className="text-sm font-medium text-neutral-900">{viewDialog.po?.purchase_office || '-'}</p></div>
                <div><p className="text-xs text-neutral-500 uppercase">Created By</p><p className="text-sm font-medium text-neutral-900">{viewDialog.po?.created_by_name}</p></div>
                <div><p className="text-xs text-neutral-500 uppercase">Status</p>{viewDialog.po && getStatusBadge(viewDialog.po.approval_status)}</div>
              </div>
              {viewDialog.po?.items?.length > 0 ? (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10 text-gray-900" style={{ backgroundColor: '#BFC9D1' }}>
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium">SL</th>
                          <th className="px-2 py-2 text-left text-xs font-medium">Vendor</th>
                          <th className="px-2 py-2 text-left text-xs font-medium">Location</th>
                          <th className="px-2 py-2 text-left text-xs font-medium">Brand</th>
                          <th className="px-2 py-2 text-left text-xs font-medium">Model</th>
                          <th className="px-2 py-2 text-left text-xs font-medium">Storage</th>
                          <th className="px-2 py-2 text-left text-xs font-medium">Qty</th>
                          <th className="px-2 py-2 text-left text-xs font-medium">Rate</th>
                          <th className="px-2 py-2 text-left text-xs font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewDialog.po.items.map((item, i) => (
                          <tr key={i} className="border-t border-neutral-100 hover:bg-neutral-50">
                            <td className="px-2 py-1.5 text-xs text-neutral-900">{item.sl_no || i + 1}</td>
                            <td className="px-2 py-1.5 text-xs text-neutral-900">{item.vendor}</td>
                            <td className="px-2 py-1.5 text-xs text-neutral-900">{item.location}</td>
                            <td className="px-2 py-1.5 text-xs text-neutral-900">{item.brand}</td>
                            <td className="px-2 py-1.5 text-xs text-neutral-900">{item.model}</td>
                            <td className="px-2 py-1.5 text-xs text-neutral-900">{item.storage || '-'}</td>
                            <td className="px-2 py-1.5 text-xs text-neutral-900">{item.qty}</td>
                            <td className="px-2 py-1.5 text-xs text-neutral-900">₹{(item.rate || 0).toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-xs text-neutral-900 font-medium">₹{(item.po_value || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="sticky bottom-0 bg-neutral-50 border-t-2 border-neutral-200">
                        <tr>
                          <td colSpan="6" className="px-2 py-2 text-right font-medium text-neutral-900 text-xs">Total:</td>
                          <td className="px-2 py-2 font-bold text-neutral-900 text-xs">{viewDialog.po.total_quantity}</td>
                          <td></td>
                          <td className="px-2 py-2 font-bold text-neutral-600 text-xs">₹{(viewDialog.po.total_value || 0).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 bg-neutral-50 rounded-lg">No line items found</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
