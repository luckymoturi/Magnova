import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Bell, Package, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';

export const ProcurementPage = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchImei, setSearchImei] = useState('');
  const [pos, setPOs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPOItems] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState('');
  const { user } = useAuth();
  const { 
    refreshTimestamps, 
    refreshAfterProcurementChange, 
    pendingProcurements, 
    clearProcurementNotification,
    addLogisticsNotification,
  } = useDataRefresh();
  const isAdmin = user?.role === 'Admin';
  const [formData, setFormData] = useState({
    po_number: '',
    vendor_name: '',
    store_location: '',
    imei: '',
    serial_number: '',
    device_model: '',
    brand: '',
    storage: '',
    colour: '',
    quantity: '',
    purchase_price: '',
  });

  useEffect(() => {
    fetchRecords();
    fetchPOs();
  }, [refreshTimestamps.procurement, refreshTimestamps.purchaseOrders]);

  // Filter records when search IMEI changes
  useEffect(() => {
    if (searchImei.trim() === '') {
      setFilteredRecords(records);
    } else {
      const filtered = records.filter(record => 
        record.imei && record.imei.toLowerCase().includes(searchImei.toLowerCase())
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
      // Show ALL POs - not just approved ones
      setPOs(response.data);
    } catch (error) {
      console.error('Error fetching POs:', error);
    }
  };

  // Auto-populate when PO is selected
  const handlePOSelect = (poNumber) => {
    const po = pos.find(p => p.po_number === poNumber);
    setSelectedPO(po);
    setFormData(prev => ({ ...prev, po_number: poNumber }));
    
    if (po && po.items && po.items.length > 0) {
      setPOItems(po.items);
      // Auto-select first item if only one
      if (po.items.length === 1) {
        handleItemSelect('0', po.items);
      } else {
        setSelectedItemIndex('');
      }
    } else {
      setPOItems([]);
      setSelectedItemIndex('');
    }
  };

  // Auto-populate when line item is selected - INCLUDING quantity and price
  const handleItemSelect = (index, items = poItems) => {
    setSelectedItemIndex(index);
    const item = items[parseInt(index)];
    if (item) {
      setFormData(prev => ({
        ...prev,
        vendor_name: item.vendor || '',
        store_location: item.location || '',
        device_model: item.model || '',
        brand: item.brand || '',
        storage: item.storage || '',
        colour: item.colour || '',
        quantity: item.qty ? item.qty.toString() : '',
        purchase_price: item.rate ? item.rate.toString() : '',
      }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const procurementData = {
        po_number: formData.po_number,
        vendor_name: formData.vendor_name,
        store_location: formData.store_location,
        imei: formData.imei,
        serial_number: formData.serial_number,
        device_model: `${formData.brand} ${formData.device_model}`,
        quantity: parseInt(formData.quantity) || 1,
        purchase_price: parseFloat(formData.purchase_price),
      };
      
      await api.post('/procurement', procurementData);
      
      // Add notification for logistics page
      addProcurementNotification({
        po_number: formData.po_number,
        imei: formData.imei,
        vendor_name: formData.vendor_name,
        brand: formData.brand,
        model: formData.device_model,
        store_location: formData.store_location,
      });
      
      toast.success('Procurement record created successfully');
      setDialogOpen(false);
      resetForm();
      refreshAfterProcurementChange(); // Trigger refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create record');
    }
  };

  const resetForm = () => {
    setFormData({
      po_number: '',
      vendor_name: '',
      store_location: '',
      imei: '',
      serial_number: '',
      device_model: '',
      brand: '',
      storage: '',
      colour: '',
      quantity: '',
      purchase_price: '',
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
      refreshAfterProcurementChange(); // Trigger refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete record');
    }
  };

  return (
    <Layout>
      <div data-testid="procurement-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Procurement</h1>
            <p className="text-slate-600 mt-1">Record device procurement with IMEI tracking</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-procurement-button" className="bg-magnova-blue hover:bg-magnova-dark-blue">
                <Plus className="w-4 h-4 mr-2" />
                Add Procurement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-magnova-orange">Add Procurement Record</DialogTitle>
                <DialogDescription className="text-slate-600">Record new device procurement - Select PO to auto-populate details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4" data-testid="procurement-form">
                {/* PO Selection */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-700 font-medium">PO Number *</Label>
                      <Select value={formData.po_number} onValueChange={handlePOSelect} required>
                        <SelectTrigger data-testid="po-select" className="bg-white">
                          <SelectValue placeholder="Select PO" />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-60">
                          {pos.length === 0 ? (
                            <SelectItem value="none" disabled>No POs available</SelectItem>
                          ) : (
                            pos.map((po) => (
                              <SelectItem key={po.po_number} value={po.po_number}>
                                {po.po_number} - {po.purchase_office} ({po.approval_status})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {poItems.length > 1 && (
                      <div>
                        <Label className="text-slate-700 font-medium">Select Line Item *</Label>
                        <Select value={selectedItemIndex} onValueChange={handleItemSelect} required>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-60">
                            {poItems.map((item, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                {item.vendor} - {item.brand} {item.model} (Qty: {item.qty})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto-populated Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-700">Vendor Name</Label>
                    <Input
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      required
                      className="bg-slate-100 text-slate-900"
                      data-testid="vendor-input"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Store Location</Label>
                    <Input
                      value={formData.store_location}
                      onChange={(e) => setFormData({ ...formData, store_location: e.target.value })}
                      required
                      className="bg-slate-100 text-slate-900"
                      data-testid="location-input"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Brand</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      required
                      className="bg-slate-100 text-slate-900"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Device Model</Label>
                    <Input
                      value={formData.device_model}
                      onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                      required
                      className="bg-slate-100 text-slate-900"
                      data-testid="model-input"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Storage</Label>
                    <Input
                      value={formData.storage}
                      onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                      className="bg-slate-100 text-slate-900"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Colour</Label>
                    <Input
                      value={formData.colour}
                      onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                      className="bg-slate-100 text-slate-900"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Quantity</Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                      className="bg-white text-slate-900"
                      placeholder="Enter quantity"
                      min="1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Purchase Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      required
                      data-testid="price-input"
                      className="bg-white text-slate-900"
                      placeholder="Enter price"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">IMEI Number *</Label>
                    <Input
                      value={formData.imei}
                      onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                      required
                      data-testid="imei-input"
                      className="font-mono bg-white text-slate-900"
                      placeholder="Enter IMEI"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Serial Number</Label>
                    <Input
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      data-testid="serial-input"
                      className="font-mono bg-white text-slate-900"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-magnova-blue hover:bg-magnova-dark-blue" data-testid="submit-procurement">
                  Add Procurement Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* IMEI Search Filter */}
        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Label className="text-slate-700 font-medium mb-1 block">Search by IMEI</Label>
              <Input
                value={searchImei}
                onChange={(e) => setSearchImei(e.target.value)}
                placeholder="Enter IMEI to filter records..."
                className="bg-white text-slate-900 font-mono"
                data-testid="imei-search-input"
              />
            </div>
            {searchImei && (
              <div className="flex items-center gap-2 mt-6">
                <span className="text-sm text-slate-500">
                  Showing {filteredRecords.length} of {records.length} records
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchImei('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="procurement-table">
              <thead>
                <tr className="bg-magnova-blue text-white">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">IMEI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Device Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500">
                      {searchImei ? `No records found for IMEI "${searchImei}"` : 'No procurement records found'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.procurement_id} className="table-row border-b border-slate-100 hover:bg-slate-50" data-testid="procurement-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-magnova-blue">{record.po_number}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-900">{record.imei}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{record.device_model}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{record.vendor_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.store_location}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{record.quantity || 1}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900 font-medium">₹{record.purchase_price?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(record.procurement_date).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(record.procurement_id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                            data-testid="delete-procurement-button"
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
