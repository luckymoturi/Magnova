import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Bell, Package, X, RefreshCcw, CheckCircle2, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import { Navigate } from 'react-router-dom';

export const ProcurementPage = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchImei, setSearchImei] = useState('');
  const [pos, setPOs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPOItems] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState('');
  
  // Resolve Gap Dialog State
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [settlementData, setSettlementData] = useState({ amount: '', utr: '' });

  const { user } = useAuth();
  
  const { 
    refreshTimestamps, 
    refreshAfterProcurementChange, 
    allProcurements: allNotifications,
    clearProcurementNotification,
    addInternalPaymentNotification,
  } = useDataRefresh();

  const isAdmin = user?.role === 'Admin';
  const hasAccess = user?.role === 'Admin' || user?.role === 'Purchase';

  const [formData, setFormData] = useState({
    po_number: '', vendor_name: '', store_location: '', serial_number: '',
    device_model: '', brand: '', storage: '', colour: '',
    quantity: '', purchase_quantity: '', purchase_price: '',
  });

  useEffect(() => {
    fetchRecords();
    fetchPOs();
  }, [refreshTimestamps.procurement, refreshTimestamps.purchaseOrders]);

  useEffect(() => {
    if (searchImei.trim() === '') {
      setFilteredRecords(records);
    } else {
      const filtered = records.filter(record => 
        (record.imei && record.imei.toLowerCase().includes(searchImei.toLowerCase())) ||
        (record.po_number && record.po_number.toLowerCase().includes(searchImei.toLowerCase()))
      );
      setFilteredRecords(filtered);
    }
  }, [searchImei, records]);

  const fetchRecords = async () => {
    try {
      const response = await api.get('/procurement');
      setRecords(response.data);
      setFilteredRecords(response.data);
    } catch (error) {
      toast.error('Failed to fetch procurement records');
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

  const handlePOSelect = (poNumber) => {
    const po = pos.find(p => p.po_number === poNumber);
    setSelectedPO(po);
    setFormData(prev => ({ ...prev, po_number: poNumber }));
    if (po && po.items && po.items.length > 0) {
      setPOItems(po.items);
      if (po.items.length === 1) handleItemSelect('0', po.items);
      else setSelectedItemIndex('');
    } else {
      setPOItems([]);
      setSelectedItemIndex('');
    }
  };

  const handleItemSelect = (index, items = poItems) => {
    setSelectedItemIndex(index);
    const item = items[parseInt(index)];
    if (item) {
      setFormData(prev => ({
        ...prev, vendor_name: item.vendor || '', store_location: item.location || '',
        device_model: item.model || '', brand: item.brand || '', storage: item.storage || '',
        colour: item.colour || '', quantity: item.qty ? item.qty.toString() : '',
        purchase_price: item.rate ? item.rate.toString() : '',
      }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (!formData.purchase_quantity) {
        toast.error('Please enter purchase quantity');
        return;
      }
      const procurementData = {
        po_number: formData.po_number, vendor_name: formData.vendor_name,
        store_location: formData.store_location, serial_number: formData.serial_number,
        device_model: `${formData.brand} ${formData.device_model}`, colour: formData.colour,
        po_quantity: parseInt(formData.quantity) || 1, purchase_quantity: parseInt(formData.purchase_quantity),
        purchase_price: parseFloat(formData.purchase_price),
      };
      await api.post('/procurement', procurementData);
      addInternalPaymentNotification({
        po_number: formData.po_number, po_date: new Date().toISOString(),
        vendor: formData.vendor_name, total_value: parseFloat(formData.purchase_price) * parseInt(formData.purchase_quantity),
        total_qty: parseInt(formData.purchase_quantity), brand: formData.brand, model: formData.device_model,
      });
      clearProcurementNotification(formData.po_number);
      toast.success('Procurement completed');
      setDialogOpen(false);
      resetForm();
      refreshAfterProcurementChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create record');
    }
  };

  const handleResolveGap = async (action) => {
    if (!selectedRecord) return;
    try {
      if (action === 'update' && !settlementData.amount) {
        toast.error("Please enter settlement amount");
        return;
      }
      await api.post(`/procurement/${selectedRecord.procurement_id}/resolve-gap`, {
        action,
        settlement_amount: settlementData.amount ? parseFloat(settlementData.amount) : null,
        settlement_utr: settlementData.utr || null
      });
      toast.success(action === 'reverse' ? 'Reverse notification sent' : 'Gap resolved successfully');
      setResolveDialogOpen(false);
      setSelectedRecord(null);
      setSettlementData({ amount: '', utr: '' });
      refreshAfterProcurementChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resolve gap');
    }
  };

  const openResolveDialog = (record) => {
    setSelectedRecord(record);
    setSettlementData({ amount: record.gap_amt?.toString() || '', utr: '' });
    setResolveDialogOpen(true);
  };

  const handleNotificationClick = (notification) => {
    const po = pos.find(p => p.po_number === notification.po_number);
    if (po) {
      handlePOSelect(notification.po_number);
      if (po.items && po.items.length > 0) {
        setPOItems(po.items);
        setSelectedItemIndex('0');
        handleItemSelect('0', po.items);
      }
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      po_number: '', vendor_name: '', store_location: '', serial_number: '',
      device_model: '', brand: '', storage: '', colour: '',
      quantity: '', purchase_quantity: '', purchase_price: '',
    });
    setSelectedPO(null);
    setPOItems([]);
    setSelectedItemIndex('');
  };

  const handleDelete = async (procurementId) => {
    if (!window.confirm('Are you sure you want to delete this procurement record?')) return;
    try {
      await api.delete(`/procurement/${procurementId}`);
      toast.success('Procurement record deleted successfully');
      refreshAfterProcurementChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete record');
    }
  };

  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return (
    <Layout pageTitle="Procurement" pageDescription="Record device procurement with gap tracking">
      <div data-testid="procurement-page">
        {allNotifications.length > 0 && (
          <div className="mb-6 bg-neutral-50 border border-neutral-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-neutral-600 animate-pulse" />
              <h3 className="font-semibold text-neutral-800">Ready for Procurement</h3>
              <span className="bg-neutral-800 text-white text-xs px-2 py-0.5 rounded-full">{allNotifications.length}</span>
            </div>
            <div className="space-y-2">
              {allNotifications.map((notif, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-neutral-100 hover:border-neutral-300 cursor-pointer" onClick={() => handleNotificationClick(notif)}>
                  <div>
                    <div className="font-medium text-neutral-900">{notif.po_number} | {notif.brand} {notif.model}</div>
                    <div className="text-sm text-neutral-500">Vendor: {notif.vendor} • Location: {notif.location}</div>
                  </div>
                  <Button size="sm" className="bg-neutral-800 text-white" onClick={(e) => { e.stopPropagation(); handleNotificationClick(notif); }}>Add Procurement</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <div className="relative max-w-md flex-1">
            <Input value={searchImei} onChange={(e) => setSearchImei(e.target.value)} placeholder="Search by PO or IMEI..." className="bg-white" />
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button className="bg-gray-900 text-white"><Plus className="w-4 h-4 mr-2" />Add Procurement</Button></DialogTrigger>
            <DialogContent className="max-w-2xl bg-white">
              <DialogHeader><DialogTitle>Add Procurement Record</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-lg">
                  <div><Label>PO Number *</Label><Select value={formData.po_number} onValueChange={handlePOSelect} required><SelectTrigger className="bg-white border-neutral-400"><SelectValue placeholder="Select PO" /></SelectTrigger><SelectContent className="bg-white">{pos.map(po => <SelectItem key={po.po_number} value={po.po_number}>{po.po_number}</SelectItem>)}</SelectContent></Select></div>
                  {poItems.length > 1 && (<div><Label>Item *</Label><Select value={selectedItemIndex} onValueChange={handleItemSelect} required><SelectTrigger className="bg-white border-neutral-400"><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent className="bg-white">{poItems.map((item, i) => <SelectItem key={i} value={i.toString()}>{item.brand} {item.model}</SelectItem>)}</SelectContent></Select></div>)}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Vendor</Label><Input value={formData.vendor_name} readOnly className="bg-neutral-100" /></div>
                  <div><Label>Location</Label><Input value={formData.store_location} readOnly className="bg-neutral-100" /></div>
                  <div><Label>Model</Label><Input value={formData.device_model} readOnly className="bg-neutral-100" /></div>
                  <div><Label>PO Qty</Label><Input value={formData.quantity} readOnly className="bg-neutral-100" /></div>
                  <div><Label>Purchase Qty *</Label><Input type="number" value={formData.purchase_quantity} onChange={e => setFormData({...formData, purchase_quantity: e.target.value})} required className="bg-white border-neutral-400" /></div>
                  <div><Label>Price *</Label><Input type="number" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} required className="bg-white border-neutral-400" /></div>
                </div>
                <Button type="submit" className="w-full bg-neutral-900 text-white">Record Procurement</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#BFC9D1' }}>
                <th className="px-3 py-3 text-left font-semibold uppercase">PO Number</th>
                <th className="px-3 py-3 text-left font-semibold uppercase">Device Model</th>
                <th className="px-3 py-3 text-left font-semibold uppercase">Vendor</th>
                <th className="px-3 py-3 text-left font-semibold uppercase">Location</th>
                <th className="px-3 py-3 text-center font-semibold uppercase">PO Qty</th>
                <th className="px-3 py-3 text-center font-semibold uppercase">Purchase Qty</th>
                <th className="px-3 py-3 text-right font-semibold uppercase">Price</th>
                <th className="px-3 py-3 text-left font-semibold uppercase">Date</th>
                <th className="px-3 py-3 text-center font-semibold uppercase">Gap - QTY</th>
                <th className="px-3 py-3 text-right font-semibold uppercase">Gap - Amt</th>
                <th className="px-3 py-3 text-right font-semibold uppercase">Settlement</th>
                <th className="px-3 py-3 text-left font-semibold uppercase">UTR</th>
                <th className="px-3 py-3 text-left font-semibold uppercase">S. Date</th>
                {isAdmin && <th className="px-3 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const hasGap = record.gap_qty > 0;
                return (
                  <tr key={record.procurement_id} className="border-b hover:bg-neutral-50">
                    <td className="px-3 py-3 font-mono font-medium">{record.po_number}</td>
                    <td className="px-3 py-3">{record.device_model}</td>
                    <td className="px-3 py-3">{record.vendor_name}</td>
                    <td className="px-3 py-3">{record.store_location}</td>
                    <td className="px-3 py-3 text-center">{record.po_quantity}</td>
                    <td className="px-3 py-3 text-center">{record.purchase_quantity}</td>
                    <td className="px-3 py-3 text-right">₹{record.purchase_price?.toLocaleString()}</td>
                    <td className="px-3 py-3">{new Date(record.procurement_date).toLocaleDateString()}</td>
                    <td 
                      className={`px-3 py-3 text-center font-bold cursor-pointer rounded-sm ${hasGap ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                      onClick={() => hasGap && openResolveDialog(record)}
                    >
                      {record.gap_qty}
                    </td>
                    <td className={`px-3 py-3 text-right font-bold ${hasGap ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{record.gap_amt?.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-neutral-900">
                      {record.settlement_amount ? `₹${record.settlement_amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{record.settlement_utr || '-'}</td>
                    <td className="px-3 py-3 text-xs">{record.settlement_date ? new Date(record.settlement_date).toLocaleDateString() : '-'}</td>
                    {isAdmin && (
                      <td className="px-3 py-3 text-center">
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(record.procurement_id)}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Resolve Gap Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-red-600" />
                Review Procurement Issue
              </DialogTitle>
              <DialogDescription>PO: {selectedRecord?.po_number}</DialogDescription>
            </DialogHeader>
            <div className="bg-neutral-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-neutral-500">PO Qty:</span> <span className="font-bold">{selectedRecord?.po_quantity}</span></div>
                <div><span className="text-neutral-500">Purchased:</span> <span className="font-bold">{selectedRecord?.purchase_quantity}</span></div>
                <div><span className="text-neutral-500">Gap Qty:</span> <td className="font-bold text-red-600">{selectedRecord?.gap_qty}</td></div>
                <div><span className="text-neutral-500">Gap Amt:</span> <td className="font-bold text-red-600">₹{selectedRecord?.gap_amt?.toLocaleString()}</td></div>
              </div>
              
              <div className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Settlement Amount (for Update)</Label>
                  <Input 
                    type="number" 
                    value={settlementData.amount} 
                    onChange={e => setSettlementData({...settlementData, amount: e.target.value})}
                    placeholder="Enter amount paid"
                    className="bg-white border-neutral-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UTR Number</Label>
                  <Input 
                    value={settlementData.utr} 
                    onChange={e => setSettlementData({...settlementData, utr: e.target.value})}
                    placeholder="Transaction reference"
                    className="bg-white border-neutral-300"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button 
                variant="outline" 
                className="border-red-600 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                onClick={() => handleResolveGap('reverse')}
              >
                <History className="w-4 h-4" />
                Reverse
              </Button>
              <Button 
                className="bg-green-700 hover:bg-green-800 text-white flex items-center justify-center gap-2"
                onClick={() => handleResolveGap('update')}
              >
                <CheckCircle2 className="w-4 h-4" />
                Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
