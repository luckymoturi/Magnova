import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, FileText, Trash2, Printer, X, Bell, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';

export const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const printRef = useRef(null);
  const { user } = useAuth();
  const { 
    refreshTimestamps, 
    refreshAfterInvoiceChange,
    pendingInvoices,
    clearInvoiceNotification,
  } = useDataRefresh();
  const isAdmin = user?.role === 'Admin';
  const [formData, setFormData] = useState({
    from_organization: 'Nova Enterprises',
    to_organization: '',
    selling_price: '', // User enters selling price (inclusive of GST)
    gst_percentage: '18',
    base_price: '', // Calculated: price excluding GST
    gst_amount: '', // Calculated: GST amount
    imei_list: '',
    invoice_date: new Date().toISOString().split('T')[0],
    description: '',
    billing_address: '',
    shipping_address: '',
  });

  useEffect(() => {
    fetchInvoices();
  }, [refreshTimestamps.invoices]);

  // Auto-calculate base price and GST when selling price or percentage changes
  useEffect(() => {
    if (formData.selling_price && formData.gst_percentage) {
      const sellingPrice = parseFloat(formData.selling_price) || 0;
      const gstPercent = parseFloat(formData.gst_percentage) || 0;
      
      // Calculate base price (excluding GST) from selling price (including GST)
      // Formula: Base Price = Selling Price / (1 + GST%/100)
      const basePrice = sellingPrice / (1 + gstPercent / 100);
      const gstAmount = sellingPrice - basePrice;
      
      setFormData(prev => ({ 
        ...prev, 
        base_price: basePrice.toFixed(2),
        gst_amount: gstAmount.toFixed(2) 
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        base_price: '',
        gst_amount: '' 
      }));
    }
  }, [formData.selling_price, formData.gst_percentage]);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const imeiArray = formData.imei_list ? formData.imei_list.split(',').map(i => i.trim()).filter(i => i) : [];
      await api.post('/invoices', {
        invoice_type: 'Store Invoice',
        po_number: 'N/A',
        from_organization: formData.from_organization,
        to_organization: formData.to_organization,
        amount: parseFloat(formData.base_price), // Send base price (excluding GST)
        gst_amount: parseFloat(formData.gst_amount),
        gst_percentage: parseFloat(formData.gst_percentage),
        imei_list: imeiArray,
        invoice_date: new Date(formData.invoice_date).toISOString(),
        description: formData.description,
        billing_address: formData.billing_address,
        shipping_address: formData.shipping_address,
      });
      toast.success('Invoice created successfully');
      setDialogOpen(false);
      resetForm();
      refreshAfterInvoiceChange(); // Trigger refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    }
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${invoiceId}`);
      toast.success('Invoice deleted successfully');
      refreshAfterInvoiceChange(); // Trigger refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const resetForm = () => {
    setFormData({
      from_organization: 'Nova Enterprises',
      to_organization: '',
      selling_price: '',
      gst_percentage: '18',
      base_price: '',
      gst_amount: '',
      imei_list: '',
      invoice_date: new Date().toISOString().split('T')[0],
      description: '',
      billing_address: '',
      shipping_address: '',
    });
  };

  const openPrintDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPrintDialogOpen(true);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${selectedInvoice?.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
            .invoice-container { max-width: 800px; margin: 0 auto; border: 2px solid #e5e7eb; padding: 30px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 20px; }
            .company-info h1 { font-size: 28px; color: #1e3a5f; margin-bottom: 5px; }
            .company-info p { font-size: 12px; color: #666; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { font-size: 32px; color: #f97316; }
            .invoice-title p { font-size: 14px; color: #666; margin-top: 5px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .bill-to, .invoice-info { width: 48%; }
            .bill-to h3, .invoice-info h3 { font-size: 14px; color: #f97316; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .bill-to p, .invoice-info p { font-size: 13px; line-height: 1.6; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { background: #1e3a5f; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
            .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            .items-table tr:nth-child(even) { background: #f9fafb; }
            .totals { width: 300px; margin-left: auto; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .totals-row.total { border-top: 2px solid #1e3a5f; border-bottom: none; font-weight: bold; font-size: 18px; color: #1e3a5f; padding-top: 12px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
            .footer-left { width: 60%; }
            .footer-right { width: 35%; text-align: center; }
            .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 10px; }
            .terms { font-size: 11px; color: #666; line-height: 1.5; }
            .terms h4 { color: #333; margin-bottom: 5px; }
            @media print { body { padding: 0; } .invoice-container { border: none; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
  };

  // Handle notification click - pre-fill form
  const handleNotificationClick = (notification) => {
    setFormData(prev => ({
      ...prev,
      imei_list: notification.imei || '',
      description: `${notification.brand || ''} ${notification.model || ''} - ${notification.action || 'Device'}`.trim(),
    }));
    clearInvoiceNotification(notification.po_number, notification.imei);
    setDialogOpen(true);
  };

  return (
    <Layout pageTitle="Invoices" pageDescription="Manage store invoices and billing">
      <div data-testid="invoices-page">
        {/* Invoice Notifications Banner - Inventory Complete, Ready for Invoice */}
        {pendingInvoices.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-teal-50 to-teal-50 border border-teal-200 rounded-lg p-4" data-testid="invoice-notifications">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-teal-600 animate-pulse" />
              <h3 className="font-semibold text-teal-800">Inventory Updated - Ready for Invoice</h3>
              <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingInvoices.length}</span>
            </div>
            <div className="space-y-2">
              {pendingInvoices.map((notif, index) => (
                <div 
                  key={`invoice-${notif.po_number}-${notif.imei}-${index}`}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-teal-100 hover:border-teal-300 transition-colors cursor-pointer"
                  onClick={() => handleNotificationClick(notif)}
                  data-testid="invoice-notification-item"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-100 p-2 rounded-lg">
                      <Receipt className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">
                        <span className="font-mono text-neutral-900">{notif.po_number || 'N/A'}</span>
                        <span className="mx-2 text-neutral-400">|</span>
                        <span>{notif.brand} {notif.model}</span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        IMEI: {notif.imei} • Vendor: {notif.vendor} • Action: {notif.action}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                      onClick={(e) => { e.stopPropagation(); handleNotificationClick(notif); }}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Create Invoice
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-neutral-400 hover:text-neutral-600"
                      onClick={(e) => { e.stopPropagation(); clearInvoiceNotification(notif.po_number, notif.imei); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-invoice-button" className="bg-teal-600 hover:bg-neutral-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-teal-600">Create Invoice</DialogTitle>
                <DialogDescription className="text-neutral-600">Generate new store invoice</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4" data-testid="invoice-form">
                <div className="grid grid-cols-2 gap-4">
                  {/* From Organization */}
                  <div>
                    <Label className="text-neutral-700">From (Seller) *</Label>
                    <Select 
                      value={formData.from_organization} 
                      onValueChange={(value) => setFormData({ ...formData, from_organization: value })} 
                      required
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Nova Enterprises">Nova Enterprises</SelectItem>
                        <SelectItem value="Magnova Exim Pvt. Ltd.">Magnova Exim Pvt. Ltd.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* To Organization - Editable */}
                  <div>
                    <Label className="text-neutral-700">To (Buyer) *</Label>
                    <Input
                      value={formData.to_organization}
                      onChange={(e) => setFormData({ ...formData, to_organization: e.target.value })}
                      required
                      placeholder="Enter buyer name / company"
                      className="bg-white"
                      data-testid="to-org-input"
                    />
                  </div>

                  {/* Invoice Date */}
                  <div>
                    <Label className="text-neutral-700">Invoice Date *</Label>
                    <Input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      required
                      className="bg-white"
                      data-testid="date-input"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-neutral-700">Description / Item</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Mobile Phone, Accessories"
                      className="bg-white"
                    />
                  </div>

                  {/* Selling Price (Including GST) */}
                  <div>
                    <Label className="text-neutral-700">Selling Price (Including GST) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      required
                      placeholder="Enter total selling price"
                      className="bg-white"
                      data-testid="selling-price-input"
                    />
                  </div>

                  {/* GST Percentage */}
                  <div>
                    <Label className="text-neutral-700">GST Percentage *</Label>
                    <Select 
                      value={formData.gst_percentage} 
                      onValueChange={(value) => setFormData({ ...formData, gst_percentage: value })} 
                      required
                    >
                      <SelectTrigger className="bg-white" data-testid="gst-percent-select">
                        <SelectValue placeholder="Select GST %" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="5">5% GST</SelectItem>
                        <SelectItem value="12">12% GST</SelectItem>
                        <SelectItem value="18">18% GST</SelectItem>
                        <SelectItem value="28">28% GST</SelectItem>
                        <SelectItem value="0">0% (Exempt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Breakdown Section */}
                  {formData.selling_price && formData.base_price && (
                    <div className="col-span-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <h4 className="text-sm font-semibold text-neutral-700 mb-3">Price Breakdown</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Base Price (Excluding GST) */}
                        <div className="bg-white p-3 rounded-lg border border-neutral-200">
                          <Label className="text-neutral-500 text-xs">Cost (Excl. GST)</Label>
                          <p className="text-lg font-bold text-neutral-900" data-testid="base-price-display">
                            ₹{parseFloat(formData.base_price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                        </div>
                        
                        {/* GST Amount */}
                        <div className="bg-white p-3 rounded-lg border border-neutral-200">
                          <Label className="text-neutral-500 text-xs">GST Amount ({formData.gst_percentage}%)</Label>
                          <p className="text-lg font-bold text-teal-600" data-testid="gst-amount-display">
                            + ₹{parseFloat(formData.gst_amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                        </div>
                        
                        {/* Total (Selling Price) */}
                        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                          <Label className="text-teal-600 text-xs">Total (Incl. GST)</Label>
                          <p className="text-lg font-bold text-teal-700" data-testid="total-price-display">
                            ₹{parseFloat(formData.selling_price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Billing Address */}
                  <div className="col-span-2">
                    <Label className="text-neutral-700">Billing Address</Label>
                    <Input
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      placeholder="Enter billing address"
                      className="bg-white"
                    />
                  </div>

                  {/* IMEI List */}
                  <div className="col-span-2">
                    <Label className="text-neutral-700">IMEI List (comma-separated)</Label>
                    <Input
                      value={formData.imei_list}
                      onChange={(e) => setFormData({ ...formData, imei_list: e.target.value })}
                      placeholder="356789012345678, 356789012345679"
                      className="font-mono bg-white"
                      data-testid="imei-list-input"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Optional - Enter IMEIs for device sales</p>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-teal-600 hover:bg-neutral-700 text-white" data-testid="submit-invoice">
                  Create Invoice
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="invoices-table">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Invoice No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">From → To</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Base Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">GST %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">GST Amt</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.invoice_id} className="table-row border-b border-neutral-100 hover:bg-neutral-50" data-testid="invoice-row">
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openPrintDialog(invoice)}
                          className="font-mono font-medium text-neutral-900 hover:text-neutral-800 hover:underline"
                          data-testid="view-invoice-button"
                        >
                          {invoice.invoice_number}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{invoice.from_organization} → {invoice.to_organization}</td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-900">₹{invoice.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-600">{invoice.gst_percentage || 18}%</td>
                      <td className="px-4 py-3 text-sm text-right text-teal-600">₹{invoice.gst_amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-teal-700">₹{invoice.total_amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openPrintDialog(invoice)}
                          className="text-neutral-900 hover:text-neutral-800 h-8 w-8 p-0"
                          data-testid="print-invoice-button"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(invoice.invoice_id)}
                            className="text-neutral-800 hover:text-neutral-900 hover:bg-neutral-100 h-8 w-8 p-0"
                            data-testid="delete-invoice-button"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Print Invoice Dialog */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="text-neutral-900">Invoice Preview</span>
                <div className="flex gap-2">
                  <Button onClick={handlePrint} className="bg-teal-600 hover:bg-neutral-700 text-white">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Invoice
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            {selectedInvoice && (
              <div ref={printRef} className="bg-white p-6">
                <div className="invoice-container border-2 border-neutral-200 p-8 rounded-lg">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-4 border-teal-600 pb-6 mb-6">
                    <div className="company-info">
                      <h1 className="text-2xl font-black text-neutral-900">{selectedInvoice.from_organization}</h1>
                      <p className="text-neutral-600 mt-1">Mobile & Electronics Store</p>
                      <p className="text-neutral-500 text-sm mt-2">GST No: 29AABCU9603R1ZM</p>
                      <p className="text-neutral-500 text-sm">Phone: +91 98765 43210</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-4xl font-black text-teal-600">INVOICE</h2>
                      <p className="text-neutral-600 mt-2 font-mono text-lg">{selectedInvoice.invoice_number}</p>
                      <p className="text-neutral-500 text-sm mt-1">Date: {formatDate(selectedInvoice.invoice_date)}</p>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-3">Bill To</h3>
                      <p className="text-lg font-semibold text-neutral-900">{selectedInvoice.to_organization}</p>
                      <p className="text-neutral-600 text-sm mt-1">{selectedInvoice.billing_address || 'Address not provided'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-3">Invoice Details</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Invoice No:</span>
                          <span className="font-mono font-medium">{selectedInvoice.invoice_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Invoice Date:</span>
                          <span className="font-medium">{formatDate(selectedInvoice.invoice_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Payment Terms:</span>
                          <span className="font-medium">Due on Receipt</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full mb-6">
                    <thead>
                      <tr className="bg-teal-600 text-white">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">S.No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Description</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase">HSN</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-neutral-200">
                        <td className="px-4 py-4 text-sm">1</td>
                        <td className="px-4 py-4 text-sm">
                          <p className="font-medium">{selectedInvoice.description || 'Goods/Services'}</p>
                          {selectedInvoice.imei_list && selectedInvoice.imei_list.length > 0 && (
                            <p className="text-xs text-neutral-500 mt-1 font-mono">
                              IMEI: {selectedInvoice.imei_list.join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-center">8517</td>
                        <td className="px-4 py-4 text-sm text-center">1</td>
                        <td className="px-4 py-4 text-sm text-right">₹{selectedInvoice.amount?.toLocaleString()}</td>
                        <td className="px-4 py-4 text-sm text-right font-medium">₹{selectedInvoice.amount?.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end mb-8">
                    <div className="w-80">
                      <div className="flex justify-between py-2 border-b border-neutral-200">
                        <span className="text-neutral-600">Subtotal:</span>
                        <span className="font-medium">₹{selectedInvoice.amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-neutral-200">
                        <span className="text-neutral-600">CGST ({(selectedInvoice.gst_percentage || 18) / 2}%):</span>
                        <span className="font-medium">₹{(selectedInvoice.gst_amount / 2)?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-neutral-200">
                        <span className="text-neutral-600">SGST ({(selectedInvoice.gst_percentage || 18) / 2}%):</span>
                        <span className="font-medium">₹{(selectedInvoice.gst_amount / 2)?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-3 bg-neutral-900 text-white px-3 rounded mt-2">
                        <span className="font-bold">TOTAL:</span>
                        <span className="font-bold text-lg">₹{selectedInvoice.total_amount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount in Words */}
                  <div className="bg-neutral-50 p-4 rounded-lg mb-8">
                    <p className="text-sm text-neutral-600">
                      <span className="font-medium">Amount in Words:</span>{' '}
                      <span className="italic">Rupees {numberToWords(Math.floor(selectedInvoice.total_amount || 0))} Only</span>
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-neutral-200">
                    <div>
                      <h4 className="font-bold text-sm text-neutral-700 mb-2">Terms & Conditions:</h4>
                      <ul className="text-xs text-neutral-500 space-y-1">
                        <li>• Goods once sold will not be taken back or exchanged.</li>
                        <li>• Warranty as per manufacturer terms.</li>
                        <li>• Subject to local jurisdiction only.</li>
                        <li>• E. & O.E.</li>
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-700 mb-16">For {selectedInvoice.from_organization}</p>
                      <div className="border-t border-neutral-400 pt-2 inline-block px-8">
                        <p className="text-sm text-neutral-600">Authorized Signatory</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
