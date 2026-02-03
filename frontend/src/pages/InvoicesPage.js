import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, FileText, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [pos, setPOs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poLookup, setPOLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [formData, setFormData] = useState({
    invoice_type: '',
    po_number: '',
    from_organization: '',
    to_organization: '',
    amount: '',
    gst_amount: '',
    imei_list: '',
    invoice_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchInvoices();
    fetchPOs();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoices');
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

  // Handle PO selection and auto-populate fields
  const handlePOSelect = async (poNumber) => {
    setFormData(prev => ({ ...prev, po_number: poNumber }));
    setPOLookup(null);
    setLookupLoading(true);

    try {
      // Find PO from loaded data
      const po = pos.find(p => p.po_number === poNumber);
      
      if (po) {
        setPOLookup(po);
        
        // Determine billing direction based on PO data
        // PO from Magnova means billing is Nova → Magnova
        const purchaseOffice = po.purchase_office || '';
        let fromOrg = 'Nova';
        let toOrg = 'Magnova';
        let invoiceType = 'Nova to Magnova';
        
        // If PO is from Magnova office, billing goes Nova → Magnova
        if (purchaseOffice.toLowerCase().includes('magnova')) {
          fromOrg = 'Nova';
          toOrg = 'Magnova';
          invoiceType = 'Nova to Magnova';
        }
        
        // Calculate total amount from PO
        const totalAmount = po.total_value || 0;
        const gstRate = 0.18; // 18% GST
        const baseAmount = totalAmount / (1 + gstRate);
        const gstAmount = totalAmount - baseAmount;
        
        // Get IMEI list from PO items
        let imeiList = '';
        if (po.items && po.items.length > 0) {
          imeiList = po.items
            .filter(item => item.imei)
            .map(item => item.imei)
            .join(', ');
        }

        setFormData(prev => ({
          ...prev,
          po_number: poNumber,
          invoice_type: invoiceType,
          from_organization: fromOrg,
          to_organization: toOrg,
          amount: baseAmount.toFixed(2),
          gst_amount: gstAmount.toFixed(2),
          imei_list: imeiList,
        }));

        toast.success(`PO found - Billing: ${fromOrg} → ${toOrg}`);
      } else {
        setPOLookup(null);
        toast.error('PO not found');
      }
    } catch (error) {
      console.error('PO lookup error:', error);
      setPOLookup(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const imeiArray = formData.imei_list.split(',').map(i => i.trim()).filter(i => i);
      await api.post('/invoices', {
        ...formData,
        amount: parseFloat(formData.amount),
        gst_amount: parseFloat(formData.gst_amount),
        imei_list: imeiArray,
        invoice_date: new Date(formData.invoice_date).toISOString(),
      });
      toast.success('Invoice created successfully');
      setDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    }
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${invoiceId}`);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_type: '',
      po_number: '',
      from_organization: '',
      to_organization: '',
      amount: '',
      gst_amount: '',
      imei_list: '',
      invoice_date: new Date().toISOString().split('T')[0],
    });
    setPOLookup(null);
  };

  return (
    <Layout>
      <div data-testid="invoices-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invoices</h1>
            <p className="text-slate-600 mt-1">Manage invoicing across organizations</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-invoice-button" className="bg-magnova-orange hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-magnova-orange">Create Invoice</DialogTitle>
                <DialogDescription className="text-slate-600">Generate new invoice - Select PO to auto-populate details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4" data-testid="invoice-form">
                {/* PO Number Selection */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <Label className="text-slate-700 font-medium">PO Number *</Label>
                  <div className="relative mt-1">
                    <Select value={formData.po_number} onValueChange={handlePOSelect} required>
                      <SelectTrigger className="bg-white" data-testid="po-select">
                        <SelectValue placeholder="Select PO to auto-populate" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-60">
                        {pos.map((po) => (
                          <SelectItem key={po.po_number} value={po.po_number}>
                            {po.po_number} - ₹{po.total_value?.toLocaleString()} ({po.purchase_office || 'N/A'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lookupLoading && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-magnova-blue border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>

                  {/* PO Info Display */}
                  {poLookup && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 text-emerald-700 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">PO Details Loaded</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Office:</span>
                          <span className="ml-1 font-medium">{poLookup.purchase_office || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Total:</span>
                          <span className="ml-1 font-medium">₹{poLookup.total_value?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Items:</span>
                          <span className="ml-1 font-medium">{poLookup.items?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Invoice Type - Auto-populated but editable */}
                  <div>
                    <Label className="text-slate-700">Invoice Type {poLookup ? '(Auto)' : '*'}</Label>
                    <Select 
                      value={formData.invoice_type} 
                      onValueChange={(value) => setFormData({ ...formData, invoice_type: value })} 
                      required
                    >
                      <SelectTrigger className={poLookup ? 'bg-slate-100' : 'bg-white'} data-testid="invoice-type-select">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Vendor">Vendor Invoice</SelectItem>
                        <SelectItem value="Nova to Magnova">Nova to Magnova</SelectItem>
                        <SelectItem value="Magnova to Export">Magnova to Export Agency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invoice Date - Manual */}
                  <div>
                    <Label className="text-slate-700">Invoice Date *</Label>
                    <Input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      required
                      className="bg-white"
                      data-testid="date-input"
                    />
                  </div>

                  {/* From Organization - Auto-populated */}
                  <div>
                    <Label className="text-slate-700">From Organization {poLookup ? '(Auto)' : '*'}</Label>
                    <Select 
                      value={formData.from_organization} 
                      onValueChange={(value) => setFormData({ ...formData, from_organization: value })} 
                      required
                    >
                      <SelectTrigger className={poLookup ? 'bg-slate-100' : 'bg-white'} data-testid="from-org-select">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Nova">Nova Enterprises</SelectItem>
                        <SelectItem value="Magnova">Magnova Exim Pvt. Ltd.</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* To Organization - Auto-populated */}
                  <div>
                    <Label className="text-slate-700">To Organization {poLookup ? '(Auto)' : '*'}</Label>
                    <Select 
                      value={formData.to_organization} 
                      onValueChange={(value) => setFormData({ ...formData, to_organization: value })} 
                      required
                    >
                      <SelectTrigger className={poLookup ? 'bg-slate-100' : 'bg-white'} data-testid="to-org-select">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Nova">Nova Enterprises</SelectItem>
                        <SelectItem value="Magnova">Magnova Exim Pvt. Ltd.</SelectItem>
                        <SelectItem value="Export Agency">Export Agency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount - Auto-populated but editable */}
                  <div>
                    <Label className="text-slate-700">Amount (excl. GST) {poLookup ? '(Auto)' : '*'}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      className={poLookup ? 'bg-slate-100' : 'bg-white'}
                      data-testid="amount-input"
                    />
                  </div>

                  {/* GST Amount - Auto-populated but editable */}
                  <div>
                    <Label className="text-slate-700">GST Amount {poLookup ? '(Auto)' : '*'}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.gst_amount}
                      onChange={(e) => setFormData({ ...formData, gst_amount: e.target.value })}
                      required
                      className={poLookup ? 'bg-slate-100' : 'bg-white'}
                      data-testid="gst-input"
                    />
                  </div>

                  {/* Total Display */}
                  {(formData.amount && formData.gst_amount) && (
                    <div className="col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Total Amount:</span>
                        <span className="text-xl font-bold text-magnova-blue">
                          ₹{(parseFloat(formData.amount || 0) + parseFloat(formData.gst_amount || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* IMEI List - Auto-populated but editable */}
                  <div className="col-span-2">
                    <Label className="text-slate-700">IMEI List (comma-separated) {poLookup ? '(Auto)' : ''}</Label>
                    <Input
                      value={formData.imei_list}
                      onChange={(e) => setFormData({ ...formData, imei_list: e.target.value })}
                      placeholder="356789012345678, 356789012345679"
                      className={`font-mono ${poLookup && formData.imei_list ? 'bg-slate-100' : 'bg-white'}`}
                      data-testid="imei-list-input"
                    />
                    <p className="text-xs text-slate-500 mt-1">Optional - Enter IMEIs included in this invoice</p>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-magnova-orange hover:bg-orange-600" data-testid="submit-invoice">
                  Create Invoice
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="invoices-table">
              <thead>
                <tr className="bg-magnova-orange text-white">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Invoice No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">From → To</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">GST</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.invoice_id} className="table-row border-b border-slate-100 hover:bg-slate-50" data-testid="invoice-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          invoice.invoice_type === 'Nova to Magnova' ? 'bg-blue-100 text-blue-700' :
                          invoice.invoice_type === 'Magnova to Export' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {invoice.invoice_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-magnova-blue">{invoice.po_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{invoice.from_organization} → {invoice.to_organization}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900">₹{invoice.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">₹{invoice.gst_amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">₹{invoice.total_amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(invoice.invoice_id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                            data-testid="delete-invoice-button"
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
    </Layout>
  );
};
