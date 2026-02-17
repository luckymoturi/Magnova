import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Download, Search, RefreshCw, Trash2, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';

export const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [masterReport, setMasterReport] = useState([]);
  const [filteredReport, setFilteredReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [poFilter, setPOFilter] = useState('all');
  const [uniquePOs, setUniquePOs] = useState([]);
  const { user } = useAuth();
  const { refreshTimestamps, triggerGlobalRefresh } = useDataRefresh();
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    fetchStats();
    fetchMasterReport();
  }, [refreshTimestamps.reports]);

  useEffect(() => {
    filterReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterReport, searchTerm, poFilter]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reports/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch statistics');
    }
  };

  const fetchMasterReport = async () => {
    setLoading(true);
    try {
      // Fetch all data from different modules
      const [posRes, procurementRes, paymentsRes, shipmentsRes, inventoryRes] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/procurement'),
        api.get('/payments'),
        api.get('/logistics/shipments'),
        api.get('/inventory'),
      ]);

      const pos = posRes.data;
      const procurements = procurementRes.data;
      const payments = paymentsRes.data;
      const shipments = shipmentsRes.data;
      const inventory = inventoryRes.data;

      // Separate internal (Magnova->Nova) and external (Nova->Vendors) payments
      const internalPayments = payments.filter(p => p.payment_type === 'internal' || !p.payment_type);
      const externalPayments = payments.filter(p => p.payment_type === 'external');

      // Build master report by linking all data
      const report = [];
      let slNo = 1;

      // Process each PO and its items
      pos.forEach(po => {
        if (po.items && po.items.length > 0) {
          po.items.forEach((item, itemIndex) => {
            // Find related procurement records
            const relatedProcurement = procurements.find(p => 
              p.po_number === po.po_number && 
              (p.vendor_name === item.vendor || p.device_model?.includes(item.model))
            );

            // Find related internal payment (Magnova -> Nova)
            const relatedInternalPayment = internalPayments.find(p => p.po_number === po.po_number);

            // Find related external payment (Nova -> Vendors)
            const relatedExternalPayment = externalPayments.find(p => p.po_number === po.po_number);

            // Find related shipments
            const relatedShipment = shipments.find(s => 
              s.po_number === po.po_number && 
              (s.vendor === item.vendor || s.from_location === item.location)
            );

            // Find related inventory
            const relatedInventory = inventory.find(inv => 
              inv.device_model?.includes(item.brand) || inv.device_model?.includes(item.model)
            );

            report.push({
              sl_no: slNo++,
              // PROCUREMENT SECTION (Magnova → Nova PO)
              po_id: po.po_number,
              po_date: po.po_date,
              purchase_office: po.purchase_office,
              vendor: item.vendor,
              location: item.location,
              brand: item.brand,
              model: item.model,
              storage: item.storage,
              colour: item.colour,
              imei: item.imei || relatedProcurement?.imei || '-',
              qty: item.qty,
              rate: item.rate,
              po_value: item.po_value,
              grn_no: relatedProcurement?.procurement_id?.slice(0, 8) || '-',
              
              // PAYMENT SECTION (Magnova → Nova) - Internal Payments
              payment_no: relatedInternalPayment?.payment_id?.slice(0, 8) || '-',
              bank_account: relatedInternalPayment?.payment_mode === 'Bank Transfer' ? 'XXXX1234' : '-',
              ifsc_code: relatedInternalPayment?.payment_mode === 'Bank Transfer' ? 'HDFC0001234' : '-',
              payment_date: relatedInternalPayment?.payment_date || '-',
              utr_no: relatedInternalPayment?.transaction_ref || '-',
              payment_amount: relatedInternalPayment?.amount || 0,
              
              // PAYMENTS SECTION (Nova → Vendors) - External Payments
              ext_payment_no: relatedExternalPayment?.payment_id?.slice(0, 8) || '-',
              ext_payee_name: relatedExternalPayment?.payee_name || '-',
              ext_payee_type: relatedExternalPayment?.payee_type || '-',
              ext_bank_account: relatedExternalPayment?.bank_account || '-',
              ext_payment_date: relatedExternalPayment?.payment_date || '-',
              ext_utr_no: relatedExternalPayment?.transaction_ref || '-',
              ext_payment_amount: relatedExternalPayment?.amount || 0,
              
              // LOGISTICS SECTION
              courier_name: relatedShipment?.transporter_name || '-',
              dispatch_date: relatedShipment?.pickup_date || '-',
              pod_number: relatedShipment?.shipment_id?.slice(0, 8) || '-',
              shipment_status: relatedShipment?.status || '-',
              
              // STORES SECTION
              stock_received_date: relatedInventory?.created_at || '-',
              received_qty: relatedInventory ? 1 : 0,
              warehouse: relatedInventory?.current_location || '-',
              stock_status: relatedInventory?.status || '-',
              
              // Meta
              po_status: po.approval_status,
            });
          });
        }
      });

      setMasterReport(report);
      
      // Extract unique POs for filter
      const uniquePOList = [...new Set(report.map(r => r.po_id))];
      setUniquePOs(uniquePOList);
      
    } catch (error) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const filterReport = () => {
    let filtered = masterReport;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.po_id?.toLowerCase().includes(term) ||
        row.vendor?.toLowerCase().includes(term) ||
        row.brand?.toLowerCase().includes(term) ||
        row.model?.toLowerCase().includes(term) ||
        row.imei?.toLowerCase().includes(term) ||
        row.location?.toLowerCase().includes(term)
      );
    }
    
    if (poFilter !== 'all') {
      filtered = filtered.filter(row => row.po_id === poFilter);
    }
    
    setFilteredReport(filtered);
  };

  const handleExportCSV = () => {
    if (filteredReport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      // PROCUREMENT (Magnova → Nova PO)
      'SL No', 'PO ID', 'PO Date', 'Purchase Office', 'Vendor', 'Location', 'Brand', 'Model', 
      'Storage', 'Colour', 'IMEI', 'Qty', 'Rate', 'PO Value', 'GRN No',
      // PAYMENT (Magnova → Nova)
      'Payment#', 'Bank Account', 'IFSC Code', 'Payment Date', 'UTR No', 'Amount',
      // PAYMENTS (Nova → Vendors)
      'Ext Payment#', 'Payee Name', 'Payee Type', 'Ext Bank Acc#', 'Ext Payment Date', 'Ext UTR No', 'Ext Amount',
      // LOGISTICS
      'Courier Name', 'Dispatch Date', 'POD Number', 'Shipment Status',
      // STORES
      'Stock Received Date', 'Received Qty', 'Warehouse', 'Stock Status'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredReport.map(row => [
        row.sl_no, row.po_id, row.po_date ? new Date(row.po_date).toLocaleDateString() : '-',
        row.purchase_office, row.vendor, row.location, row.brand, row.model,
        row.storage, row.colour, row.imei, row.qty, row.rate, row.po_value, row.grn_no,
        // PAYMENT (Magnova → Nova)
        row.payment_no, row.bank_account, row.ifsc_code, 
        row.payment_date !== '-' ? new Date(row.payment_date).toLocaleDateString() : '-',
        row.utr_no, row.payment_amount,
        // PAYMENTS (Nova → Vendors)
        row.ext_payment_no, row.ext_payee_name, row.ext_payee_type, row.ext_bank_account,
        row.ext_payment_date !== '-' ? new Date(row.ext_payment_date).toLocaleDateString() : '-',
        row.ext_utr_no, row.ext_payment_amount,
        // LOGISTICS
        row.courier_name, row.dispatch_date !== '-' ? new Date(row.dispatch_date).toLocaleDateString() : '-',
        row.pod_number, row.shipment_status,
        // STORES
        row.stock_received_date !== '-' ? new Date(row.stock_received_date).toLocaleDateString() : '-',
        row.received_qty, row.warehouse, row.stock_status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `master_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Report exported successfully');
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Generating Excel report...');
      const response = await api.get('/reports/export/master', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `master_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel report downloaded successfully');
    } catch (error) {
      toast.error('Failed to export Excel report');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN');
    } catch {
      return '-';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '-';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handleDeleteRow = async (row) => {
    const confirmMsg = `Are you sure you want to delete this record?\n\nPO: ${row.po_id}\nVendor: ${row.vendor}\nThis will delete the PO entry and related data.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // Delete the PO (this is the source record)
      await api.delete(`/purchase-orders/${row.po_id}`);
      toast.success(`Record for ${row.po_id} deleted successfully`);
      triggerGlobalRefresh(); // Trigger global refresh for cascade delete
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete record');
    }
  };

  return (
    <Layout pageTitle="Master Report" pageDescription="Complete view of all linked data - PO, Finance, Logistics, Stores">
      <div data-testid="reports-page">
        <div className="mb-6 flex items-center justify-end">
          <div className="flex gap-2">
            <Button onClick={fetchMasterReport} variant="outline" className="border-neutral-900 text-neutral-900">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="border-neutral-300 text-neutral-700">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button onClick={handleExportExcel} className="bg-gray-900 hover:bg-gray-800 text-white">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-neutral-500 mb-1">Total POs</p>
            <p className="text-2xl font-bold text-neutral-900">{stats?.total_pos || 0}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-neutral-500 mb-1">Procurement</p>
            <p className="text-2xl font-bold text-neutral-900">{stats?.total_procurement || 0}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-neutral-500 mb-1">Inventory</p>
            <p className="text-2xl font-bold text-neutral-900">{stats?.total_inventory || 0}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-neutral-500 mb-1">Available</p>
            <p className="text-2xl font-bold text-neutral-600">{stats?.available_inventory || 0}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-neutral-500 mb-1">Sales Orders</p>
            <p className="text-2xl font-bold text-neutral-900">{stats?.total_sales || 0}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-neutral-500 mb-1">Payments</p>
            <p className="text-2xl font-bold text-neutral-600">{formatCurrency(stats?.total_payment_amount)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <div className="flex-1 relative max-w-xl">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 pointer-events-none z-10" />
            <Input
              placeholder="Search by PO, Vendor, Brand, Model, IMEI, Location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={poFilter} onValueChange={setPOFilter}>
            <SelectTrigger className="w-72 bg-white">
              <SelectValue placeholder="Filter by PO" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-60">
              <SelectItem value="all">All Purchase Orders</SelectItem>
              {uniquePOs.map((po) => (
                <SelectItem key={po} value={po}>
                  {po}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Master Report Table */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="master-report-table">
              <thead>
                {/* Section Headers */}
                <tr>
                  <th colSpan="15" className="bg-teal-600 text-white px-2 py-2 text-left text-sm font-bold border-r border-teal-500">
                    PROCUREMENT (Magnova → Nova PO)
                  </th>
                  <th colSpan="6" className="bg-neutral-1000 text-white px-2 py-2 text-left text-sm font-bold border-r border-neutral-500">
                    PAYMENT (Magnova → Nova)
                  </th>
                  <th colSpan="7" className="bg-purple-600 text-white px-2 py-2 text-left text-sm font-bold border-r border-purple-500">
                    PAYMENTS (Nova → Vendors)
                  </th>
                  <th colSpan="4" className="bg-teal-600 text-white px-2 py-2 text-left text-sm font-bold border-r border-teal-500">
                    LOGISTICS
                  </th>
                  <th colSpan="4" className="bg-neutral-600 text-white px-2 py-2 text-left text-sm font-bold border-r border-neutral-500">
                    STORES
                  </th>
                  {isAdmin && (
                    <th className="bg-teal-600 text-white px-2 py-2 text-left text-sm font-bold">
                      ACTIONS
                    </th>
                  )}
                </tr>
                {/* Column Headers */}
                <tr className="bg-neutral-100">
                  {/* PROCUREMENT (Magnova → Nova) */}
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">SL No</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">PO ID</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">PO Date</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Purchase Office</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Vendor</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Location</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Brand</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Model</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Storage</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Colour</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">IMEI</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Qty</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Rate</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">PO Value</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200 border-r border-neutral-300">GRN No</th>
                  {/* PAYMENT (Magnova → Nova) - Internal */}
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Payment#</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Bank Acc#</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">IFSC</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Payment Dt</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">UTR No</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200 border-r border-neutral-300">Amount</th>
                  {/* PAYMENTS (Nova → Vendors) - External */}
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Payment#</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Payee Name</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Payee Type</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Bank Acc#</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Payment Dt</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">UTR No</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200 border-r border-neutral-300">Amount</th>
                  {/* LOGISTICS */}
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Courier</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Dispatch Dt</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">POD No</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200 border-r border-neutral-300">Status</th>
                  {/* STORES */}
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Received Dt</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Rcvd Qty</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Warehouse</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Status</th>
                  {isAdmin && <th className="px-2 py-2 text-left font-medium text-neutral-700 border-b border-neutral-200">Delete</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 37 : 36} className="px-4 py-8 text-center text-neutral-500">Loading report data...</td>
                  </tr>
                ) : filteredReport.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 37 : 36} className="px-4 py-8 text-center text-neutral-500">No data found</td>
                  </tr>
                ) : (
                  filteredReport.map((row, index) => (
                    <tr key={index} className={`border-b border-neutral-100 hover:bg-neutral-50 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                      {/* PROCUREMENT (Magnova → Nova) */}
                      <td className="px-2 py-2 text-neutral-900">{row.sl_no}</td>
                      <td className="px-2 py-2 font-mono text-neutral-900 font-medium">{row.po_id}</td>
                      <td className="px-2 py-2 text-neutral-900">{formatDate(row.po_date)}</td>
                      <td className="px-2 py-2 text-neutral-900">{row.purchase_office || '-'}</td>
                      <td className="px-2 py-2 text-neutral-900">{row.vendor || '-'}</td>
                      <td className="px-2 py-2 text-neutral-900">{row.location || '-'}</td>
                      <td className="px-2 py-2 text-neutral-900">{row.brand || '-'}</td>
                      <td className="px-2 py-2 text-neutral-900">{row.model || '-'}</td>
                      <td className="px-2 py-2 text-neutral-900">{row.storage || '-'}</td>
                      <td className="px-2 py-2 text-neutral-900">{row.colour || '-'}</td>
                      <td className="px-2 py-2 font-mono text-neutral-700">{row.imei || '-'}</td>
                      <td className="px-2 py-2 text-neutral-900">{row.qty || '-'}</td>
                      <td className="px-2 py-2 text-neutral-900">{formatCurrency(row.rate)}</td>
                      <td className="px-2 py-2 font-medium text-neutral-900">{formatCurrency(row.po_value)}</td>
                      <td className="px-2 py-2 text-neutral-700 border-r border-neutral-200">{row.grn_no}</td>
                      {/* PAYMENT (Magnova → Nova) - Internal */}
                      <td className="px-2 py-2 text-neutral-700">{row.payment_no}</td>
                      <td className="px-2 py-2 text-neutral-700">{row.bank_account}</td>
                      <td className="px-2 py-2 text-neutral-700">{row.ifsc_code}</td>
                      <td className="px-2 py-2 text-neutral-700">{formatDate(row.payment_date)}</td>
                      <td className="px-2 py-2 font-mono text-neutral-700">{row.utr_no}</td>
                      <td className="px-2 py-2 font-medium text-neutral-700 border-r border-neutral-200">{formatCurrency(row.payment_amount)}</td>
                      {/* PAYMENTS (Nova → Vendors) - External */}
                      <td className="px-2 py-2 text-neutral-700">{row.ext_payment_no}</td>
                      <td className="px-2 py-2 text-neutral-700">{row.ext_payee_name}</td>
                      <td className="px-2 py-2 text-neutral-700">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          row.ext_payee_type === 'Vendor' ? 'bg-teal-100 text-teal-700' :
                          row.ext_payee_type === 'Credit Card' ? 'bg-teal-100 text-teal-700' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {row.ext_payee_type}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-neutral-700">{row.ext_bank_account}</td>
                      <td className="px-2 py-2 text-neutral-700">{formatDate(row.ext_payment_date)}</td>
                      <td className="px-2 py-2 font-mono text-neutral-700">{row.ext_utr_no}</td>
                      <td className="px-2 py-2 font-medium text-purple-600 border-r border-neutral-200">{formatCurrency(row.ext_payment_amount)}</td>
                      {/* LOGISTICS */}
                      <td className="px-2 py-2 text-neutral-700">{row.courier_name}</td>
                      <td className="px-2 py-2 text-neutral-700">{formatDate(row.dispatch_date)}</td>
                      <td className="px-2 py-2 text-neutral-700">{row.pod_number}</td>
                      <td className="px-2 py-2 border-r border-neutral-200">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          row.shipment_status === 'Delivered' ? 'bg-teal-100 text-teal-700' :
                          row.shipment_status === 'In Transit' ? 'bg-teal-100 text-teal-700' :
                          row.shipment_status === 'Pending' ? 'bg-neutral-200 text-neutral-800' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {row.shipment_status}
                        </span>
                      </td>
                      {/* STORES */}
                      <td className="px-2 py-2 text-neutral-700">{formatDate(row.stock_received_date)}</td>
                      <td className="px-2 py-2 text-neutral-700">{row.received_qty || '-'}</td>
                      <td className="px-2 py-2 text-neutral-700">{row.warehouse}</td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          row.stock_status === 'Available' ? 'bg-teal-100 text-teal-700' :
                          row.stock_status === 'Inward Nova' ? 'bg-purple-100 text-purple-700' :
                          row.stock_status === 'Inward Magnova' ? 'bg-indigo-100 text-indigo-700' :
                          row.stock_status === 'Dispatched' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {row.stock_status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-2 py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRow(row)}
                            className="text-neutral-800 hover:text-neutral-900 hover:bg-neutral-100 h-6 w-6 p-0"
                            data-testid="delete-report-row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Summary */}
        {filteredReport.length > 0 && (
          <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Total Records:</span>
                <span className="ml-2 font-bold text-neutral-900">{filteredReport.length}</span>
              </div>
              <div>
                <span className="text-neutral-500">Total PO Value:</span>
                <span className="ml-2 font-bold text-neutral-900">
                  {formatCurrency(filteredReport.reduce((sum, r) => sum + (r.po_value || 0), 0))}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Total Qty:</span>
                <span className="ml-2 font-bold text-neutral-900">
                  {filteredReport.reduce((sum, r) => sum + (r.qty || 0), 0)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Total Payments:</span>
                <span className="ml-2 font-bold text-neutral-700">
                  {formatCurrency(filteredReport.reduce((sum, r) => sum + (r.payment_amount || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
