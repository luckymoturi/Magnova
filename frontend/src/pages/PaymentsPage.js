import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, Users, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [pos, setPOs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [linkedPaymentsDialog, setLinkedPaymentsDialog] = useState({ open: false, poNumber: '', internalPayment: null });
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

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
    account_number: '',
    ifsc_code: '',
    location: '',
    payment_mode: '',
    amount: '',
    utr_number: '',
    payment_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPayments();
    fetchPOs();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
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

  // Auto-populate Internal Payment fields when PO is selected
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

  // Auto-populate External Payment fields when PO is selected
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
      toast.success('Internal payment recorded successfully');
      setDialogOpen(false);
      resetForms();
      fetchPayments();
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
      toast.success('External payment recorded successfully');
      setDialogOpen(false);
      resetForms();
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record external payment');
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await api.delete(`/payments/${paymentId}`);
      toast.success('Payment deleted successfully');
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete payment');
    }
  };

  const resetForms = () => {
    setPaymentType('');
    setPaymentSummary(null);
    setInternalForm({
      po_number: '',
      payee_name: 'Nova Enterprises',
      payee_account: '',
      payee_bank: '',
      payment_mode: '',
      amount: '',
      transaction_ref: '',
      payment_date: new Date().toISOString().split('T')[0],
    });
    setExternalForm({
      po_number: '',
      payee_type: '',
      payee_name: '',
      account_number: '',
      ifsc_code: '',
      location: '',
      payment_mode: '',
      amount: '',
      utr_number: '',
      payment_date: new Date().toISOString().split('T')[0],
    });
  };

  // Show linked external payments for a PO
  const showLinkedExternalPayments = async (poNumber, internalPayment) => {
    try {
      const response = await api.get(`/payments/summary/${poNumber}`);
      setLinkedPaymentsDialog({
        open: true,
        poNumber,
        internalPayment,
        summary: response.data
      });
    } catch (error) {
      toast.error('Failed to fetch payment details');
    }
  };

  // Separate payments by type
  const internalPayments = payments.filter(p => p.payment_type === 'internal' || !p.payment_type);
  const externalPayments = payments.filter(p => p.payment_type === 'external');

  // Get external payments for a specific PO
  const getExternalPaymentsForPO = (poNumber) => {
    return externalPayments.filter(p => p.po_number === poNumber);
  };

  return (
    <Layout>
      <div data-testid="payments-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payments</h1>
            <p className="text-slate-600 mt-1">Track internal and external payment transactions</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForms(); }}>
              <DialogTrigger asChild>
                <Button data-testid="create-payment-button" className="bg-magnova-blue hover:bg-magnova-dark-blue">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white">
                <DialogHeader>
                  <DialogTitle className="text-magnova-orange">Record Payment</DialogTitle>
                  <DialogDescription className="text-slate-600">Select payment type to record transaction</DialogDescription>
                </DialogHeader>
                
                {/* Payment Type Selection */}
                {!paymentType && (
                  <div className="grid grid-cols-2 gap-4 py-6">
                    <button
                      onClick={() => setPaymentType('internal')}
                      className="p-6 border-2 border-slate-200 rounded-lg hover:border-magnova-blue hover:bg-blue-50 transition-all text-left"
                      data-testid="select-internal-payment"
                    >
                      <Building2 className="w-8 h-8 text-magnova-blue mb-3" />
                      <h3 className="font-bold text-slate-900 mb-1">Internal Payment</h3>
                      <p className="text-sm text-slate-600">Magnova → Nova payment</p>
                    </button>
                    <button
                      onClick={() => setPaymentType('external')}
                      className="p-6 border-2 border-slate-200 rounded-lg hover:border-magnova-orange hover:bg-orange-50 transition-all text-left"
                      data-testid="select-external-payment"
                    >
                      <Users className="w-8 h-8 text-magnova-orange mb-3" />
                      <h3 className="font-bold text-slate-900 mb-1">External Payment</h3>
                      <p className="text-sm text-slate-600">Nova → Vendor/CC payment</p>
                    </button>
                  </div>
                )}

                {/* Internal Payment Form */}
                {paymentType === 'internal' && (
                  <form onSubmit={handleCreateInternal} className="space-y-4" data-testid="internal-payment-form">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-magnova-blue flex items-center gap-2">
                        <Building2 className="w-5 h-5" /> Internal Payment (Magnova → Nova)
                      </h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPaymentType('')}>
                        ← Back
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-700">PO Number *</Label>
                        <Select value={internalForm.po_number} onValueChange={handleInternalPOSelect} required>
                          <SelectTrigger className="bg-white" data-testid="internal-po-select">
                            <SelectValue placeholder="Select PO" />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-60">
                            {pos.map((po) => (
                              <SelectItem key={po.po_number} value={po.po_number}>
                                {po.po_number} - ₹{po.total_value?.toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-700">Payee Name</Label>
                        <Input
                          value={internalForm.payee_name}
                          className="bg-slate-100"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Payee Account *</Label>
                        <Input
                          value={internalForm.payee_account}
                          onChange={(e) => setInternalForm({ ...internalForm, payee_account: e.target.value })}
                          required
                          className="bg-white font-mono"
                          placeholder="Auto-populated"
                          data-testid="payee-account-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Payee Bank *</Label>
                        <Input
                          value={internalForm.payee_bank}
                          onChange={(e) => setInternalForm({ ...internalForm, payee_bank: e.target.value })}
                          required
                          className="bg-white"
                          placeholder="Auto-populated"
                          data-testid="payee-bank-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={internalForm.amount}
                          onChange={(e) => setInternalForm({ ...internalForm, amount: e.target.value })}
                          required
                          className="bg-white"
                          placeholder="Auto-populated from PO"
                          data-testid="internal-amount-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Payment Mode *</Label>
                        <Select value={internalForm.payment_mode} onValueChange={(v) => setInternalForm({ ...internalForm, payment_mode: v })} required>
                          <SelectTrigger className="bg-white" data-testid="internal-mode-select">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="RTGS">RTGS</SelectItem>
                            <SelectItem value="NEFT">NEFT</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-700">Transaction Ref (UTR)</Label>
                        <Input
                          value={internalForm.transaction_ref}
                          onChange={(e) => setInternalForm({ ...internalForm, transaction_ref: e.target.value })}
                          className="bg-white font-mono"
                          data-testid="internal-ref-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Payment Date *</Label>
                        <Input
                          type="date"
                          value={internalForm.payment_date}
                          onChange={(e) => setInternalForm({ ...internalForm, payment_date: e.target.value })}
                          required
                          className="bg-white"
                          data-testid="internal-date-input"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-magnova-blue hover:bg-magnova-dark-blue" data-testid="submit-internal-payment">
                      Record Internal Payment
                    </Button>
                  </form>
                )}

                {/* External Payment Form */}
                {paymentType === 'external' && (
                  <form onSubmit={handleCreateExternal} className="space-y-4" data-testid="external-payment-form">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-magnova-orange flex items-center gap-2">
                        <Users className="w-5 h-5" /> External Payment (Nova → Vendor/CC)
                      </h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPaymentType('')}>
                        ← Back
                      </Button>
                    </div>
                    
                    {/* PO Selection with Summary */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <Label className="text-slate-700 font-medium">PO Number *</Label>
                        <Select value={externalForm.po_number} onValueChange={handleExternalPOSelect} required>
                          <SelectTrigger className="bg-white" data-testid="external-po-select">
                            <SelectValue placeholder="Select PO" />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-60">
                            {pos.map((po) => (
                              <SelectItem key={po.po_number} value={po.po_number}>
                                {po.po_number} - ₹{po.total_value?.toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Payment Summary - Shows internal vs external balance */}
                      {paymentSummary && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500 uppercase font-medium mb-2">Payment Balance</p>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-slate-500">Internal Paid:</span>
                              <span className="ml-1 font-bold text-slate-900">₹{paymentSummary.internal_paid?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">External Paid:</span>
                              <span className="ml-1 font-bold text-magnova-orange">₹{paymentSummary.external_paid?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Remaining:</span>
                              <span className="ml-1 font-bold text-emerald-600">₹{paymentSummary.external_remaining?.toLocaleString()}</span>
                            </div>
                          </div>
                          {paymentSummary.external_remaining <= 0 && (
                            <p className="mt-2 text-xs text-red-600 font-medium">⚠ No remaining balance for external payments</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-700">Payee Type *</Label>
                        <Select value={externalForm.payee_type} onValueChange={(v) => setExternalForm({ ...externalForm, payee_type: v })} required>
                          <SelectTrigger className="bg-white" data-testid="payee-type-select">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="vendor">Vendor</SelectItem>
                            <SelectItem value="cc">Credit Card (CC)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-700">Payee Name *</Label>
                        <Input
                          value={externalForm.payee_name}
                          onChange={(e) => setExternalForm({ ...externalForm, payee_name: e.target.value })}
                          required
                          className="bg-white"
                          placeholder="Vendor or CC holder name"
                          data-testid="external-payee-name-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Account Number *</Label>
                        <Input
                          value={externalForm.account_number}
                          onChange={(e) => setExternalForm({ ...externalForm, account_number: e.target.value })}
                          required
                          className="bg-white font-mono"
                          placeholder="Bank account number"
                          data-testid="account-number-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">IFSC Code *</Label>
                        <Input
                          value={externalForm.ifsc_code}
                          onChange={(e) => setExternalForm({ ...externalForm, ifsc_code: e.target.value.toUpperCase() })}
                          required
                          className="bg-white font-mono uppercase"
                          placeholder="HDFC0001234"
                          data-testid="ifsc-code-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Location *</Label>
                        <Input
                          value={externalForm.location}
                          onChange={(e) => setExternalForm({ ...externalForm, location: e.target.value })}
                          required
                          className="bg-white"
                          placeholder="City/Location"
                          data-testid="external-location-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={externalForm.amount}
                          onChange={(e) => setExternalForm({ ...externalForm, amount: e.target.value })}
                          required
                          className="bg-white"
                          placeholder={paymentSummary ? `Max: ₹${paymentSummary.external_remaining}` : 'Enter amount'}
                          max={paymentSummary?.external_remaining || undefined}
                          data-testid="external-amount-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Payment Mode *</Label>
                        <Select value={externalForm.payment_mode} onValueChange={(v) => setExternalForm({ ...externalForm, payment_mode: v })} required>
                          <SelectTrigger className="bg-white" data-testid="external-mode-select">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="RTGS">RTGS</SelectItem>
                            <SelectItem value="NEFT">NEFT</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-700">UTR Number *</Label>
                        <Input
                          value={externalForm.utr_number}
                          onChange={(e) => setExternalForm({ ...externalForm, utr_number: e.target.value })}
                          required
                          className="bg-white font-mono"
                          placeholder="Transaction reference"
                          data-testid="utr-number-input"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-slate-700">Payment Date *</Label>
                        <Input
                          type="date"
                          value={externalForm.payment_date}
                          onChange={(e) => setExternalForm({ ...externalForm, payment_date: e.target.value })}
                          required
                          className="bg-white"
                          data-testid="external-date-input"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-magnova-orange hover:bg-orange-600" 
                      data-testid="submit-external-payment"
                      disabled={paymentSummary && paymentSummary.external_remaining <= 0}
                    >
                      Record External Payment
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Internal Payments Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-magnova-blue" />
            Internal Payments (Magnova → Nova)
          </h2>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="internal-payments-table">
                <thead>
                  <tr className="bg-magnova-blue text-white">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Payee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Bank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Mode</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">UTR</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {internalPayments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500">
                        No internal payments found
                      </td>
                    </tr>
                  ) : (
                    internalPayments.map((payment) => (
                      <tr key={payment.payment_id} className="border-b border-slate-100 hover:bg-slate-50" data-testid="internal-payment-row">
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => showLinkedExternalPayments(payment.po_number, payment)}
                            className="font-mono font-medium text-magnova-blue hover:text-magnova-dark-blue hover:underline flex items-center gap-1"
                            data-testid="view-linked-payments"
                          >
                            {payment.po_number}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{payment.payee_name}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{payment.payee_account || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{payment.payee_bank || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{payment.payment_mode}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">₹{payment.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{payment.transaction_ref || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(payment.payment_date).toLocaleDateString()}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-sm">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(payment.payment_id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                              data-testid="delete-internal-payment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* External Payments Section */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-magnova-orange" />
            External Payments (Nova → Vendor/CC)
          </h2>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="external-payments-table">
                <thead>
                  <tr className="bg-magnova-orange text-white">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Payee Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Payee Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">IFSC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">UTR</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {externalPayments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 10 : 9} className="px-4 py-8 text-center text-slate-500">
                        No external payments found
                      </td>
                    </tr>
                  ) : (
                    externalPayments.map((payment) => (
                      <tr key={payment.payment_id} className="border-b border-slate-100 hover:bg-slate-50" data-testid="external-payment-row">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-magnova-blue">{payment.po_number}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            payment.payee_type === 'vendor' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {payment.payee_type?.toUpperCase() || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{payment.payee_name}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{payment.account_number || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{payment.ifsc_code || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{payment.location || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">₹{payment.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{payment.utr_number || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(payment.payment_date).toLocaleDateString()}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-sm">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(payment.payment_id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                              data-testid="delete-external-payment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Linked External Payments Dialog */}
        <Dialog open={linkedPaymentsDialog.open} onOpenChange={(open) => setLinkedPaymentsDialog({ ...linkedPaymentsDialog, open })}>
          <DialogContent className="max-w-3xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-magnova-blue flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Payment Details - {linkedPaymentsDialog.poNumber}
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Internal payment and linked external payments for this PO
              </DialogDescription>
            </DialogHeader>

            {/* Internal Payment Info */}
            {linkedPaymentsDialog.internalPayment && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <h4 className="font-bold text-magnova-blue mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Internal Payment (Magnova → Nova)
                </h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Payee:</span>
                    <span className="ml-1 font-medium">{linkedPaymentsDialog.internalPayment.payee_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Amount:</span>
                    <span className="ml-1 font-bold text-magnova-blue">₹{linkedPaymentsDialog.internalPayment.amount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Mode:</span>
                    <span className="ml-1 font-medium">{linkedPaymentsDialog.internalPayment.payment_mode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Date:</span>
                    <span className="ml-1 font-medium">{new Date(linkedPaymentsDialog.internalPayment.payment_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            {linkedPaymentsDialog.summary && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                <h4 className="font-bold text-slate-700 mb-3">Payment Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-white rounded-lg border">
                    <span className="text-slate-500 block text-xs uppercase">Internal Paid</span>
                    <span className="font-bold text-lg text-magnova-blue">₹{linkedPaymentsDialog.summary.internal_paid?.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <span className="text-slate-500 block text-xs uppercase">External Paid</span>
                    <span className="font-bold text-lg text-magnova-orange">₹{linkedPaymentsDialog.summary.external_paid?.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <span className="text-slate-500 block text-xs uppercase">Remaining</span>
                    <span className="font-bold text-lg text-emerald-600">₹{linkedPaymentsDialog.summary.external_remaining?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Linked External Payments */}
            <div>
              <h4 className="font-bold text-magnova-orange mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> External Payments (Nova → Vendor/CC)
              </h4>
              {getExternalPaymentsForPO(linkedPaymentsDialog.poNumber).length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-lg text-center text-slate-500">
                  No external payments found for this PO
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-magnova-orange text-white">
                        <th className="px-3 py-2 text-left text-xs">Payee Type</th>
                        <th className="px-3 py-2 text-left text-xs">Payee Name</th>
                        <th className="px-3 py-2 text-left text-xs">Account</th>
                        <th className="px-3 py-2 text-left text-xs">Location</th>
                        <th className="px-3 py-2 text-right text-xs">Amount</th>
                        <th className="px-3 py-2 text-left text-xs">UTR</th>
                        <th className="px-3 py-2 text-left text-xs">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getExternalPaymentsForPO(linkedPaymentsDialog.poNumber).map((payment) => (
                        <tr key={payment.payment_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              payment.payee_type === 'vendor' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {payment.payee_type?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-900">{payment.payee_name}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{payment.account_number}</td>
                          <td className="px-3 py-2 text-slate-600">{payment.location}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{payment.amount?.toLocaleString()}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{payment.utr_number}</td>
                          <td className="px-3 py-2 text-slate-600">{new Date(payment.payment_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setLinkedPaymentsDialog({ ...linkedPaymentsDialog, open: false })}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
