import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, Users, X, Bell, CreditCard, Banknote, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import { Navigate } from 'react-router-dom';

export const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pos, setPOs] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [linkedPaymentsDialog, setLinkedPaymentsDialog] = useState({ open: false, poNumber: '', internalPayment: null });
  const { user } = useAuth();
  
  const { 
    refreshTimestamps, 
    refreshAfterPaymentChange,
    allInternalPayments: allInternalNotifications,
    clearInternalPaymentNotification,
    addExternalPaymentNotification,
    allExternalPayments: allExternalNotifications,
    clearExternalPaymentNotification,
    addLogisticsNotification,
  } = useDataRefresh();

  const isAdmin = user?.role === 'Admin';
  const canDoInternal = user?.role === 'Admin' || user?.role === 'InternalPayments';
  const canDoExternal = user?.role === 'Admin' || user?.role === 'ExternalPayments';
  const hasAccess = isAdmin || canDoInternal || canDoExternal;

  // Internal Payment Form
  const [internalForm, setInternalForm] = useState({
    po_number: '',
    payee_name: 'Nova Enterprises',
    payee_account: '',
    payee_bank: '',
    payment_mode: '',
    amount: '',
    transaction_ref: '',
    payment_date: new Date().toISOString().split('T')[0],
  });

  // External Payment Form
  const [externalForm, setExternalForm] = useState({
    po_number: '',
    payee_type: '',
    payee_name: '',
    payee_phone: '',
    account_number: '',
    ifsc_code: '',
    location: '',
    payment_mode: '',
    amount: '',
    utr_number: '',
    payment_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (hasAccess) {
      fetchPayments();
      fetchPOs();
      fetchProcurements();
    }
  }, [refreshTimestamps.payments, refreshTimestamps.purchaseOrders, refreshTimestamps.procurement, hasAccess]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPayments(payments);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = payments.filter(payment => 
        payment.po_number?.toLowerCase().includes(term) ||
        payment.payment_type?.toLowerCase().includes(term) ||
        payment.payee_name?.toLowerCase().includes(term) ||
        payment.transaction_ref?.toLowerCase().includes(term) ||
        payment.utr_number?.toLowerCase().includes(term) ||
        payment.payee_bank?.toLowerCase().includes(term)
      );
      setFilteredPayments(filtered);
    }
  }, [searchTerm, payments]);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
      setFilteredPayments(response.data);
    } catch (error) {
      toast.error('Failed to fetch payments');
    }
  };

  const fetchPOs = async () => {
    try {
      const response = await api.get('/purchase-orders');
      setPOs(response.data);
    } catch (error) {
      console.error('Error fetching POs:', error);
    }
  };

  const fetchProcurements = async () => {
    try {
      const response = await api.get('/procurement');
      setProcurements(response.data);
    } catch (error) {
      console.error('Error fetching procurements:', error);
    }
  };

  const handleInternalPOSelect = async (poNumber) => {
    const po = pos.find(p => p.po_number === poNumber);
    if (po) {
      setInternalForm(prev => ({
        ...prev,
        po_number: poNumber,
        payee_name: 'Nova Enterprises',
        payee_account: 'NOVA-ACC-001',
        payee_bank: 'HDFC Bank',
        amount: po.total_value?.toString() || '',
      }));
    }
  };

  const handleExternalPOSelect = async (poNumber) => {
    setExternalForm(prev => ({ ...prev, po_number: poNumber }));
    try {
      const response = await api.get(`/payments/summary/${poNumber}`);
      setPaymentSummary(response.data);
    } catch (error) {
      setPaymentSummary(null);
    }
  };

  const handleCreateInternal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments/internal', {
        ...internalForm,
        amount: parseFloat(internalForm.amount),
        payment_date: new Date(internalForm.payment_date).toISOString(),
      });
      clearInternalPaymentNotification(internalForm.po_number);
      const po = pos.find(p => p.po_number === internalForm.po_number);
      addExternalPaymentNotification({
        po_number: internalForm.po_number,
        internal_amount: parseFloat(internalForm.amount),
        vendor: po?.items?.[0]?.vendor || '',
        brand: po?.items?.[0]?.brand || '',
        model: po?.items?.[0]?.model || '',
        location: po?.items?.[0]?.location || '',
      });
      toast.success('Internal payment recorded');
      setDialogOpen(false);
      resetForms();
      refreshAfterPaymentChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record internal payment');
    }
  };

  const handleCreateExternal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments/external', {
        ...externalForm,
        amount: parseFloat(externalForm.amount),
        payment_date: new Date(externalForm.payment_date).toISOString(),
      });
      clearExternalPaymentNotification(externalForm.po_number);
      const po = pos.find(p => p.po_number === externalForm.po_number);
      addLogisticsNotification({
        po_number: externalForm.po_number,
        vendor_name: externalForm.payee_name || po?.items?.[0]?.vendor || '',
        brand: po?.items?.[0]?.brand || '',
        model: po?.items?.[0]?.model || '',
        store_location: po?.items?.[0]?.location || '',
      });
      toast.success('External payment recorded');
      setDialogOpen(false);
      resetForms();
      refreshAfterPaymentChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record external payment');
    }
  };

  const handleInternalNotificationClick = (notification) => {
    setPaymentType('internal');
    setInternalForm(prev => ({
      ...prev,
      po_number: notification.po_number,
      amount: notification.total_value?.toString() || '',
    }));
    handleInternalPOSelect(notification.po_number);
    setDialogOpen(true);
  };

  const handleExternalNotificationClick = (notification) => {
    setPaymentType('external');
    setExternalForm(prev => ({
      ...prev,
      po_number: notification.po_number,
      payee_name: notification.vendor || '',
      location: notification.location || '',
    }));
    handleExternalPOSelect(notification.po_number);
    setDialogOpen(true);
  };

  const resetForms = () => {
    setPaymentType('');
    setPaymentSummary(null);
    setInternalForm({
      po_number: '', payee_name: 'Nova Enterprises', payee_account: '', payee_bank: '',
      payment_mode: '', amount: '', transaction_ref: '', payment_date: new Date().toISOString().split('T')[0],
    });
    setExternalForm({
      po_number: '', payee_type: '', payee_name: '', payee_phone: '',
      account_number: '', ifsc_code: '', location: '', payment_mode: '',
      amount: '', utr_number: '', payment_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await api.delete(`/payments/${paymentId}`);
      toast.success('Payment deleted successfully');
      refreshAfterPaymentChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete payment');
    }
  };

  const internalPaymentsTable = filteredPayments.filter(p => p.payment_type === 'internal' || !p.payment_type);
  const externalPaymentsTable = filteredPayments.filter(p => p.payment_type === 'external');

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const pageDesc = canDoInternal && canDoExternal
    ? 'Track internal and external payment transactions'
    : canDoInternal ? 'Record Magnova → Nova internal payments' : 'Record Nova → Vendor external payments';

  return (
    <Layout pageTitle="Payments" pageDescription={pageDesc}>
      <div data-testid="payments-page">
        {canDoInternal && allInternalNotifications.length > 0 && (
          <div className="mb-6 bg-neutral-50 border border-neutral-300 rounded-lg p-4" data-testid="internal-payment-notifications">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-neutral-600 animate-pulse" />
              <h3 className="font-semibold text-neutral-800">Procurement Complete - Internal Payment Required</h3>
              <span className="bg-neutral-800 text-white text-xs px-2 py-0.5 rounded-full">{allInternalNotifications.length}</span>
            </div>
            <div className="space-y-2">
              {allInternalNotifications.map((notif, index) => (
                <div 
                  key={`internal-${notif.po_number}-${index}`}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100 hover:border-gray-300 transition-colors cursor-pointer"
                  onClick={() => handleInternalNotificationClick(notif)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-neutral-100 p-2 rounded-lg border border-neutral-200">
                      <Banknote className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">
                        <span className="font-mono text-neutral-900">{notif.po_number}</span>
                        <span className="mx-2 text-neutral-400">|</span>
                        <span>{notif.brand} {notif.model}</span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        Vendor: {notif.vendor} • Total: ₹{notif.total_value?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                      onClick={(e) => { e.stopPropagation(); handleInternalNotificationClick(notif); }}
                    >
                      Record Internal Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-neutral-400 hover:text-neutral-600"
                      onClick={(e) => { e.stopPropagation(); clearInternalPaymentNotification(notif.po_number); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {canDoExternal && allExternalNotifications.length > 0 && (
          <div className="mb-6 bg-neutral-50 border border-neutral-300 rounded-lg p-4" data-testid="external-payment-notifications">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-neutral-700 animate-pulse" />
              <h3 className="font-semibold text-neutral-900">Internal Payment Complete - External Payment Required</h3>
              <span className="bg-neutral-800 text-white text-xs px-2 py-0.5 rounded-full">{allExternalNotifications.length}</span>
            </div>
            <div className="space-y-2">
              {allExternalNotifications.map((notif, index) => (
                <div 
                  key={`external-${notif.po_number}-${index}`}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer"
                  onClick={() => handleExternalNotificationClick(notif)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-neutral-200 p-2 rounded-lg">
                      <CreditCard className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">
                        <span className="font-mono text-neutral-900">{notif.po_number}</span>
                        <span className="mx-2 text-neutral-400">|</span>
                        <span>Pay to: {notif.vendor}</span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        Brand: {notif.brand} • Amount: ₹{notif.internal_amount?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-neutral-700 hover:bg-neutral-800"
                      onClick={(e) => { e.stopPropagation(); handleExternalNotificationClick(notif); }}
                    >
                      Record External Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-neutral-400 hover:text-neutral-600"
                      onClick={(e) => { e.stopPropagation(); clearExternalPaymentNotification(notif.po_number); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForms(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-neutral-900">Record Payment</DialogTitle>
                <DialogDescription className="text-neutral-600">Select payment type to record transaction</DialogDescription>
              </DialogHeader>
                {!paymentType && (
                  <div className="grid grid-cols-2 gap-4 py-6">
                    <button onClick={() => setPaymentType('internal')} className="p-6 border-2 border-neutral-200 rounded-lg hover:border-neutral-900 transition-all text-left">
                      <Building2 className="w-8 h-8 text-neutral-900 mb-3" />
                      <h3 className="font-bold text-neutral-900 mb-1">Internal Payment</h3>
                      <p className="text-sm text-neutral-600">Magnova → Nova</p>
                    </button>
                    <button onClick={() => setPaymentType('external')} className="p-6 border-2 border-neutral-200 rounded-lg hover:border-neutral-900 transition-all text-left">
                      <Users className="w-8 h-8 text-neutral-900 mb-3" />
                      <h3 className="font-bold text-neutral-900 mb-1">External Payment</h3>
                      <p className="text-sm text-neutral-600">Nova → Vendor</p>
                    </button>
                  </div>
                )}
                {paymentType === 'internal' && (
                  <form onSubmit={handleCreateInternal} className="space-y-4">
                    <div className="flex items-center justify-between"><h3 className="font-bold">Internal Payment</h3><Button type="button" variant="ghost" size="sm" onClick={() => setPaymentType('')}>← Back</Button></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>PO Number *</Label><Select value={internalForm.po_number} onValueChange={handleInternalPOSelect} required><SelectTrigger className="bg-white border-neutral-400"><SelectValue placeholder="Select PO" /></SelectTrigger><SelectContent className="bg-white z-[100]">{pos.map(po => <SelectItem key={po.po_number} value={po.po_number}>{po.po_number}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Payee Name</Label><Input value={internalForm.payee_name} readOnly className="bg-neutral-100" /></div>
                      <div><Label>Amount *</Label><Input type="number" value={internalForm.amount} onChange={e => setInternalForm({...internalForm, amount: e.target.value})} required className="bg-white border-neutral-400" /></div>
                      <div><Label>Payment Mode *</Label><Select value={internalForm.payment_mode} onValueChange={v => setInternalForm({...internalForm, payment_mode: v})} required><SelectTrigger className="bg-white border-neutral-400"><SelectValue placeholder="Select mode" /></SelectTrigger><SelectContent className="bg-white z-[100]"><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="UPI">UPI</SelectItem></SelectContent></Select></div>
                      <div><Label>Transaction Ref</Label><Input value={internalForm.transaction_ref} onChange={e => setInternalForm({...internalForm, transaction_ref: e.target.value})} className="bg-white border-neutral-400" /></div>
                      <div><Label>Payment Date *</Label><Input type="date" value={internalForm.payment_date} onChange={e => setInternalForm({...internalForm, payment_date: e.target.value})} required className="bg-white border-neutral-400" /></div>
                    </div>
                    <Button type="submit" className="w-full bg-gray-900 text-white">Record Internal Payment</Button>
                  </form>
                )}
                {paymentType === 'external' && (
                  <form onSubmit={handleCreateExternal} className="space-y-4">
                    <div className="flex items-center justify-between"><h3 className="font-bold">External Payment</h3><Button type="button" variant="ghost" size="sm" onClick={() => setPaymentType('')}>← Back</Button></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>PO Number *</Label><Select value={externalForm.po_number} onValueChange={handleExternalPOSelect} required><SelectTrigger className="bg-white border-neutral-400"><SelectValue placeholder="Select PO" /></SelectTrigger><SelectContent className="bg-white z-[100]">{pos.map(po => <SelectItem key={po.po_number} value={po.po_number}>{po.po_number}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Payee Name *</Label><Input value={externalForm.payee_name} onChange={e => setExternalForm({...externalForm, payee_name: e.target.value})} required className="bg-white border-neutral-400" /></div>
                      <div><Label>Amount *</Label><Input type="number" value={externalForm.amount} onChange={e => setExternalForm({...externalForm, amount: e.target.value})} required className="bg-white border-neutral-400" /></div>
                      <div><Label>UTR Number *</Label><Input value={externalForm.utr_number} onChange={e => setExternalForm({...externalForm, utr_number: e.target.value})} required className="bg-white border-neutral-400" /></div>
                      <div><Label>Location *</Label><Input value={externalForm.location} onChange={e => setExternalForm({...externalForm, location: e.target.value})} required className="bg-white border-neutral-400" /></div>
                    </div>
                    <Button type="submit" className="w-full bg-neutral-800 text-white">Record External Payment</Button>
                  </form>
                )}
            </DialogContent>
          </Dialog>
        </div>

        {canDoInternal && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Building2 className="w-5 h-5" /> Internal Payments</h2>
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-900" style={{ backgroundColor: '#BFC9D1' }}>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Payee</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {internalPaymentsTable.map(p => (
                    <tr key={p.payment_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-mono">{p.po_number}</td>
                      <td className="px-4 py-3 text-sm">{p.payee_name}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">₹{p.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{new Date(p.payment_date).toLocaleDateString()}</td>
                      {isAdmin && <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => handleDelete(p.payment_id)}><Trash2 className="w-4 h-4" /></Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {canDoExternal && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> External Payments</h2>
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-900" style={{ backgroundColor: '#BFC9D1' }}>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Payee</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {externalPaymentsTable.map(p => (
                    <tr key={p.payment_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-mono">{p.po_number}</td>
                      <td className="px-4 py-3 text-sm">{p.payee_name}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">₹{p.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{new Date(p.payment_date).toLocaleDateString()}</td>
                      {isAdmin && <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => handleDelete(p.payment_id)}><Trash2 className="w-4 h-4" /></Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
