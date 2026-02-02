import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Download, Search, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [masterReport, setMasterReport] = useState([]);
  const [filteredReport, setFilteredReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [poFilter, setPOFilter] = useState('all');
  const [uniquePOs, setUniquePOs] = useState([]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    fetchStats();
    fetchMasterReport();
  }, []);

  useEffect(() => {
    filterReport();
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

            // Find related payments
            const relatedPayment = payments.find(p => p.po_number === po.po_number);

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
              // PROCUREMENT SECTION (Nova to Magnova PO)
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
              
              // FINANCE SECTION (Magnova to Nova)
              payment_no: relatedPayment?.payment_id?.slice(0, 8) || '-',
              bank_account: relatedPayment?.payment_mode === 'Bank Transfer' ? 'XXXX1234' : '-',
              ifsc_code: relatedPayment?.payment_mode === 'Bank Transfer' ? 'HDFC0001234' : '-',
              payment_date: relatedPayment?.payment_date || '-',
              utr_no: relatedPayment?.transaction_ref || '-',
              payment_amount: relatedPayment?.amount || 0,
              
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
      'SL No', 'PO ID', 'PO Date', 'Purchase Office', 'Vendor', 'Location', 'Brand', 'Model', 
      'Storage', 'Colour', 'IMEI', 'Qty', 'Rate', 'PO Value', 'GRN No',
      'Payment#', 'Bank Account', 'IFSC Code', 'Payment Date', 'UTR No', 'Payment Amount',
      'Courier Name', 'Dispatch Date', 'POD Number', 'Shipment Status',
      'Stock Received Date', 'Received Qty', 'Warehouse', 'Stock Status'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredReport.map(row => [
        row.sl_no, row.po_id, row.po_date ? new Date(row.po_date).toLocaleDateString() : '-',
        row.purchase_office, row.vendor, row.location, row.brand, row.model,
        row.storage, row.colour, row.imei, row.qty, row.rate, row.po_value, row.grn_no,
        row.payment_no, row.bank_account, row.ifsc_code, 
        row.payment_date !== '-' ? new Date(row.payment_date).toLocaleDateString() : '-',
        row.utr_no, row.payment_amount,
        row.courier_name, row.dispatch_date !== '-' ? new Date(row.dispatch_date).toLocaleDateString() : '-',
        row.pod_number, row.shipment_status,
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

  return (
    <Layout>
      <div data-testid="reports-page">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Master Report</h1>
            <p className="text-slate-600 mt-1">Complete view of all linked data - PO, Finance, Logistics, Stores</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchMasterReport} variant="outline" className="border-magnova-blue text-magnova-blue">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExportCSV} className="bg-magnova-blue hover:bg-magnova-dark-blue">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Total POs</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.total_pos || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Procurement</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.total_procurement || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Inventory</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.total_inventory || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Available</p>
            <p className="text-2xl font-bold text-emerald-600">{stats?.available_inventory || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Sales Orders</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.total_sales || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Payments</p>
            <p className="text-2xl font-bold text-magnova-orange">{formatCurrency(stats?.total_payment_amount)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by PO, Vendor, Brand, Model, IMEI, Location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <Select value={poFilter} onValueChange={setPOFilter}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Filter by PO" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-60">
              <SelectItem value="all">All Purchase Orders</SelectItem>
              {uniquePOs.map(po => (
                <SelectItem key={po} value={po}>{po}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Master Report Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="master-report-table">
              <thead>
                {/* Section Headers */}
                <tr>
                  <th colSpan="15" className="bg-green-600 text-white px-2 py-2 text-left text-sm font-bold border-r border-green-500">
                    PROCUREMENT (Nova to Magnova PO)
                  </th>
                  <th colSpan="6" className="bg-orange-500 text-white px-2 py-2 text-left text-sm font-bold border-r border-orange-400">
                    FINANCE (Magnova to Nova)
                  </th>
                  <th colSpan="4" className="bg-orange-600 text-white px-2 py-2 text-left text-sm font-bold border-r border-orange-500">
                    LOGISTICS
                  </th>
                  <th colSpan="4" className="bg-pink-500 text-white px-2 py-2 text-left text-sm font-bold">
                    STORES
                  </th>
                </tr>
                {/* Column Headers */}
                <tr className="bg-slate-100">
                  {/* PROCUREMENT */}
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">SL No</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">PO ID</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">PO Date</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Purchase Office</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Vendor</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Location</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Brand</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Model</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Storage</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Colour</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">IMEI</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Qty</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Rate</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">PO Value</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200 border-r border-slate-300">GRN No</th>
                  {/* FINANCE */}
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Payment#</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Bank Acc#</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">IFSC</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Payment Dt</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">UTR No</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200 border-r border-slate-300">Amount</th>
                  {/* LOGISTICS */}
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Courier</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Dispatch Dt</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">POD No</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200 border-r border-slate-300">Status</th>
                  {/* STORES */}
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Received Dt</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Rcvd Qty</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Warehouse</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-700 border-b border-slate-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="29" className="px-4 py-8 text-center text-slate-500">Loading report data...</td>
                  </tr>
                ) : filteredReport.length === 0 ? (
                  <tr>
                    <td colSpan="29" className="px-4 py-8 text-center text-slate-500">No data found</td>
                  </tr>
                ) : (
                  filteredReport.map((row, index) => (
                    <tr key={index} className={`border-b border-slate-100 hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      {/* PROCUREMENT */}
                      <td className="px-2 py-2 text-slate-900">{row.sl_no}</td>
                      <td className="px-2 py-2 font-mono text-magnova-blue font-medium">{row.po_id}</td>
                      <td className="px-2 py-2 text-slate-900">{formatDate(row.po_date)}</td>
                      <td className="px-2 py-2 text-slate-900">{row.purchase_office || '-'}</td>
                      <td className="px-2 py-2 text-slate-900">{row.vendor || '-'}</td>
                      <td className="px-2 py-2 text-slate-900">{row.location || '-'}</td>
                      <td className="px-2 py-2 text-slate-900">{row.brand || '-'}</td>
                      <td className="px-2 py-2 text-slate-900">{row.model || '-'}</td>
                      <td className="px-2 py-2 text-slate-900">{row.storage || '-'}</td>
                      <td className="px-2 py-2 text-slate-900">{row.colour || '-'}</td>
                      <td className="px-2 py-2 font-mono text-slate-700">{row.imei || '-'}</td>
                      <td className="px-2 py-2 text-slate-900">{row.qty || '-'}</td>
                      <td className="px-2 py-2 text-slate-900">{formatCurrency(row.rate)}</td>
                      <td className="px-2 py-2 font-medium text-slate-900">{formatCurrency(row.po_value)}</td>
                      <td className="px-2 py-2 text-slate-700 border-r border-slate-200">{row.grn_no}</td>
                      {/* FINANCE */}
                      <td className="px-2 py-2 text-slate-700">{row.payment_no}</td>
                      <td className="px-2 py-2 text-slate-700">{row.bank_account}</td>
                      <td className="px-2 py-2 text-slate-700">{row.ifsc_code}</td>
                      <td className="px-2 py-2 text-slate-700">{formatDate(row.payment_date)}</td>
                      <td className="px-2 py-2 font-mono text-slate-700">{row.utr_no}</td>
                      <td className="px-2 py-2 font-medium text-orange-600 border-r border-slate-200">{formatCurrency(row.payment_amount)}</td>
                      {/* LOGISTICS */}
                      <td className="px-2 py-2 text-slate-700">{row.courier_name}</td>
                      <td className="px-2 py-2 text-slate-700">{formatDate(row.dispatch_date)}</td>
                      <td className="px-2 py-2 text-slate-700">{row.pod_number}</td>
                      <td className="px-2 py-2 border-r border-slate-200">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          row.shipment_status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                          row.shipment_status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                          row.shipment_status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {row.shipment_status}
                        </span>
                      </td>
                      {/* STORES */}
                      <td className="px-2 py-2 text-slate-700">{formatDate(row.stock_received_date)}</td>
                      <td className="px-2 py-2 text-slate-700">{row.received_qty || '-'}</td>
                      <td className="px-2 py-2 text-slate-700">{row.warehouse}</td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          row.stock_status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                          row.stock_status === 'Inward Nova' ? 'bg-purple-100 text-purple-700' :
                          row.stock_status === 'Inward Magnova' ? 'bg-indigo-100 text-indigo-700' :
                          row.stock_status === 'Dispatched' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {row.stock_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {filteredReport.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Total Records:</span>
                <span className="ml-2 font-bold text-slate-900">{filteredReport.length}</span>
              </div>
              <div>
                <span className="text-slate-500">Total PO Value:</span>
                <span className="ml-2 font-bold text-slate-900">
                  {formatCurrency(filteredReport.reduce((sum, r) => sum + (r.po_value || 0), 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Total Qty:</span>
                <span className="ml-2 font-bold text-slate-900">
                  {filteredReport.reduce((sum, r) => sum + (r.qty || 0), 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Total Payments:</span>
                <span className="ml-2 font-bold text-orange-600">
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
