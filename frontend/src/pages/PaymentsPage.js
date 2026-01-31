import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    po_number: '',
    payee_type: '',
    payee_name: '',
    payment_mode: '',
    amount: '',
    transaction_ref: '',
    payment_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
    } catch (error) {
      toast.error('Failed to fetch payments');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        ...formData,
        amount: parseFloat(formData.amount),
        payment_date: new Date(formData.payment_date).toISOString(),
      });
      toast.success('Payment recorded successfully');
      setDialogOpen(false);
      setFormData({
        po_number: '',
        payee_type: '',
        payee_name: '',
        payment_mode: '',
        amount: '',
        transaction_ref: '',
        payment_date: new Date().toISOString().split('T')[0],
      });
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  return (
    <Layout>
      <div data-testid="payments-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payments</h1>
            <p className="text-slate-600 mt-1">Track all payment transactions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-payment-button">
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>Track payment transaction</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4" data-testid="payment-form">
                <div>
                  <Label>PO Number</Label>
                  <Input
                    value={formData.po_number}
                    onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                    required
                    className="font-mono"
                    data-testid="payment-po-input"
                  />
                </div>
                <div>
                  <Label>Payee Type</Label>
                  <Select value={formData.payee_type} onValueChange={(value) => setFormData({ ...formData, payee_type: value })} required>
                    <SelectTrigger data-testid="payee-type-select">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vendor">Vendor</SelectItem>
                      <SelectItem value="Card Holder">Credit Card Holder</SelectItem>
                      <SelectItem value="Nova">Nova Enterprises</SelectItem>
                      <SelectItem value="Magnova">Magnova Exim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payee Name</Label>
                  <Input
                    value={formData.payee_name}
                    onChange={(e) => setFormData({ ...formData, payee_name: e.target.value })}
                    required
                    data-testid="payee-name-input"
                  />
                </div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={formData.payment_mode} onValueChange={(value) => setFormData({ ...formData, payment_mode: value })} required>
                    <SelectTrigger data-testid="payment-mode-select">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    data-testid="amount-input"
                  />
                </div>
                <div>
                  <Label>Transaction Reference (UTR)</Label>
                  <Input
                    value={formData.transaction_ref}
                    onChange={(e) => setFormData({ ...formData, transaction_ref: e.target.value })}
                    required
                    className="font-mono"
                    data-testid="transaction-ref-input"
                  />
                </div>
                <div>
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                    data-testid="payment-date-input"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-payment">
                  Record Payment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="payments-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">UTR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No payment records found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.payment_id} className="table-row border-b border-slate-100" data-testid="payment-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">{payment.po_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{payment.payee_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{payment.payee_type}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{payment.payment_mode}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900">₹{payment.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{payment.transaction_ref}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(payment.payment_date).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};
