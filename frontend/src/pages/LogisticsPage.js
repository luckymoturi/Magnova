import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Package, Edit, Trash2, Bell, X, Truck, Box, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';

export const LogisticsPage = () => {
  const [shipments, setShipments] = useState([]);
  const [filteredShipments, setFilteredShipments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pos, setPOs] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPOItems] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState('');
  const [availableQty, setAvailableQty] = useState({});
  const { user } = useAuth();
  const { 
    refreshTimestamps, 
    refreshAfterLogisticsChange, 
    pendingLogistics, 
    clearLogisticsNotification,
    addInventoryNotification,
  } = useDataRefresh();
  const isAdmin = user?.role === 'Admin';
  const [formData, setFormData] = useState({
    po_number: '',
    transporter_name: '',
    vehicle_number: '',
    from_location: '',
    to_location: '',
    pickup_date: new Date().toISOString().split('T')[0],
    expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    pickup_quantity: '',
    brand: '',
    model: '',
    vendor: '',
    total_quantity: '',
  });
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchShipments();
    fetchPOs();
    fetchProcurements();
  }, [refreshTimestamps.logistics, refreshTimestamps.purchaseOrders, refreshTimestamps.procurement]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredShipments(shipments);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = shipments.filter(shipment => 
        shipment.po_number?.toLowerCase().includes(term) ||
        shipment.transporter_name?.toLowerCase().includes(term) ||
        shipment.vehicle_number?.toLowerCase().includes(term) ||
        shipment.from_location?.toLowerCase().includes(term) ||
        shipment.to_location?.toLowerCase().includes(term) ||
        shipment.brand?.toLowerCase().includes(term) ||
        shipment.model?.toLowerCase().includes(term) ||
        shipment.status?.toLowerCase().includes(term)
      );
      setFilteredShipments(filtered);
    }
  }, [searchTerm, shipments]);

  const fetchShipments = async () => {
    try {
      const response = await api.get('/logistics/shipments');
      setShipments(response.data);
      setFilteredShipments(response.data);
    } catch (error) {
      toast.error('Failed to fetch shipments');
    }
  };

  const fetchPOs = async () => {
    try {
      const response = await api.get('/purchase-orders');
      const approved = response.data.filter((po) => po.approval_status === 'Approved');
      setPOs(approved);
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

  // Calculate shipped quantity for a specific PO line item (by vendor + location + model)
  const getShippedQuantityForItem = (poNumber, vendor, location, model) => {
    return shipments
      .filter(s => s.po_number === poNumber && s.vendor === vendor && s.from_location === location && s.model === model)
      .reduce((sum, s) => sum + (s.pickup_quantity || 0), 0);
  };

  // Auto-populate when PO is selected
  const handlePOSelect = (poNumber) => {
    const po = pos.find(p => p.po_number === poNumber);
    setSelectedPO(po);
    setSelectedItemIndex('');
    
    if (po && po.items && po.items.length > 0) {
      setPOItems(po.items);
      
      // If only one item, auto-select it
      if (po.items.length === 1) {
        handleItemSelect('0', po.items, poNumber);
      } else {
        // Multiple items - reset form and wait for item selection
        setFormData(prev => ({
          ...prev,
          po_number: poNumber,
          from_location: '',
          brand: '',
          model: '',
          vendor: '',
          total_quantity: '',
          pickup_quantity: '',
        }));
        setAvailableQty({});
      }
    } else {
      setPOItems([]);
      setAvailableQty({});
    }
  };

  // Auto-populate when line item is selected
  const handleItemSelect = (index, items = poItems, poNumber = formData.po_number) => {
    setSelectedItemIndex(index);
    const item = items[parseInt(index)];
    
    if (item) {
      // Calculate total purchase quantity from procurement records for this PO
      const procurementForItem = procurements.filter(
        p => p.po_number === poNumber && 
             p.vendor_name === item.vendor && 
             p.device_model.includes(item.model)
      );
      const totalPurchaseQty = procurementForItem.reduce((sum, p) => sum + (p.purchase_quantity || 0), 0) || item.qty || 0;
      const shippedQty = getShippedQuantityForItem(poNumber, item.vendor, item.location, item.model);
      const available = totalPurchaseQty - shippedQty;
      
      setFormData(prev => ({
        ...prev,
        po_number: poNumber,
        from_location: item.location || '',
        brand: item.brand || '',
        model: item.model || '',
        vendor: item.vendor || '',
        total_quantity: totalPurchaseQty.toString(),
      }));
      
      setAvailableQty({
        total: totalPurchaseQty,
        shipped: shippedQty,
        available: available
      });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Validate pickup quantity
      const pickupQty = parseInt(formData.pickup_quantity) || 0;
      if (pickupQty > availableQty.available) {
        toast.error(`Cannot ship more than available quantity (${availableQty.available})`);
        return;
      }

      const response = await api.post('/logistics/shipments', {
        po_number: formData.po_number,
        transporter_name: formData.transporter_name,
        vehicle_number: formData.vehicle_number,
        from_location: formData.from_location,
        to_location: formData.to_location,
        pickup_date: new Date(formData.pickup_date).toISOString(),
        expected_delivery: new Date(formData.expected_delivery).toISOString(),
        imei_list: [],
        pickup_quantity: pickupQty,
        brand: formData.brand,
        model: formData.model,
        vendor: formData.vendor,
      });
      
      // Clear logistics notification
      clearLogisticsNotification(formData.po_number);
      
      // Trigger inventory notification
      addInventoryNotification({
        po_number: formData.po_number,
        shipment_id: response.data.shipment_id,
        brand: formData.brand,
        model: formData.model,
        vendor: formData.vendor,
        from_location: formData.from_location,
        to_location: formData.to_location,
        pickup_quantity: pickupQty,
        transporter: formData.transporter_name,
      });
      
      toast.success('Shipment created - Inventory notification sent');
      setDialogOpen(false);
      resetForm();
      refreshAfterLogisticsChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create shipment');
    }
  };

  const resetForm = () => {
    setFormData({
      po_number: '',
      transporter_name: '',
      vehicle_number: '',
      from_location: '',
      to_location: '',
      pickup_date: new Date().toISOString().split('T')[0],
      expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pickup_quantity: '',
      brand: '',
      model: '',
      vendor: '',
      total_quantity: '',
    });
    setSelectedPO(null);
    setPOItems([]);
    setSelectedItemIndex('');
    setAvailableQty({});
  };

  const handleStatusUpdate = async () => {
    if (!selectedShipment || !newStatus) return;
    try {
      await api.patch(`/logistics/shipments/${selectedShipment.shipment_id}/status`, {
        status: newStatus
      });
      toast.success('Status updated successfully');
      setStatusDialogOpen(false);
      setSelectedShipment(null);
      setNewStatus('');
      refreshAfterLogisticsChange(); // Trigger refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const openStatusDialog = (shipment) => {
    setSelectedShipment(shipment);
    setNewStatus(shipment.status);
    setStatusDialogOpen(true);
  };

  // Handle clicking on a procurement notification - open create shipment dialog with pre-filled data
  const handleNotificationClick = (procurement) => {
    // Find the PO to get line item details
    const po = pos.find(p => p.po_number === procurement.po_number);
    if (po) {
      setSelectedPO(po);
      if (po.items && po.items.length > 0) {
        setPOItems(po.items);
        // Find matching item by vendor or model
        const matchingItemIndex = po.items.findIndex(item => 
          item.vendor === procurement.vendor_name || 
          item.model === procurement.model
        );
        if (matchingItemIndex >= 0) {
          handleItemSelect(matchingItemIndex.toString(), po.items, po.po_number);
        } else if (po.items.length === 1) {
          handleItemSelect('0', po.items, po.po_number);
        }
      }
    }
    
    // Pre-fill with procurement location
    setFormData(prev => ({
      ...prev,
      po_number: procurement.po_number,
      from_location: procurement.store_location || '',
      vendor: procurement.vendor_name || '',
      brand: procurement.brand || '',
      model: procurement.model || '',
    }));
    
    // Clear this notification
    clearLogisticsNotification(procurement.po_number, procurement.imei);
    
    // Open dialog
    setDialogOpen(true);
  };

  const handleDelete = async (shipmentId) => {
    if (!window.confirm('Are you sure you want to delete this shipment?')) return;
    try {
      await api.delete(`/logistics/shipments/${shipmentId}`);
      toast.success('Shipment deleted successfully');
      refreshAfterLogisticsChange(); // Trigger refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete shipment');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-neutral-100 text-neutral-800 border-neutral-400',
      'In Transit': 'bg-teal-50 text-teal-700 border-teal-200',
      'Delivered': 'bg-teal-50 text-teal-700 border-teal-200',
      'Cancelled': 'bg-neutral-100 text-neutral-900 border-neutral-300',
    };
    return colors[status] || 'bg-neutral-50 text-neutral-700 border-neutral-200';
  };

  // Get unique locations from all PO items
  const getAllLocations = () => {
    const locations = new Set();
    pos.forEach(po => {
      if (po.items) {
        po.items.forEach(item => {
          if (item.location) locations.add(item.location);
        });
      }
    });
    return Array.from(locations);
  };

  const allLocations = getAllLocations();

  return (
    <Layout>
      <div data-testid="logistics-page">
        {/* Logistics Notifications Banner - Procurement Complete, Ready for Shipment */}
        {pendingLogistics.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-neutral-100 to-neutral-100 border border-neutral-300 rounded-lg p-4" data-testid="logistics-notifications">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-neutral-700 animate-pulse" />
              <h3 className="font-semibold text-neutral-900">Procurement Complete - Ready for Shipment</h3>
              <span className="bg-neutral-1000 text-white text-xs px-2 py-0.5 rounded-full">{pendingLogistics.length}</span>
            </div>
            <div className="space-y-2">
              {pendingLogistics.map((proc, index) => (
                <div 
                  key={`logistics-${proc.po_number}-${proc.imei}-${index}`}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer"
                  onClick={() => handleNotificationClick(proc)}
                  data-testid="logistics-notification-item"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-neutral-200 p-2 rounded-lg">
                      <Truck className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">
                        <span className="font-mono text-neutral-900">{proc.po_number}</span>
                        <span className="mx-2 text-neutral-400">|</span>
                        <span>{proc.brand} {proc.model}</span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        Vendor: {proc.vendor_name} • Location: {proc.store_location} • IMEI: {proc.imei}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-neutral-700 hover:bg-neutral-800"
                      onClick={(e) => { e.stopPropagation(); handleNotificationClick(proc); }}
                    >
                      <Truck className="w-4 h-4 mr-1" />
                      Create Shipment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-neutral-400 hover:text-neutral-600"
                      onClick={(e) => { e.stopPropagation(); clearLogisticsNotification(proc.po_number, proc.imei); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Logistics & Shipments</h1>
              <p className="text-neutral-600 mt-1">Track shipments and e-way bills</p>
            </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-shipment-button" className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Shipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-teal-600">Create Shipment</DialogTitle>
                <DialogDescription className="text-neutral-600">Record new shipment details - Select PO to auto-populate</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4" data-testid="shipment-form">
                {/* PO Selection */}
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-neutral-700 font-medium">PO Number *</Label>
                      <Select value={formData.po_number} onValueChange={handlePOSelect} required>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select PO" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {pos.map((po) => (
                            <SelectItem key={po.po_number} value={po.po_number}>
                              {po.po_number} - {po.purchase_office}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Line Item Dropdown - Only show if PO has multiple items */}
                    {poItems.length > 1 && (
                      <div>
                        <Label className="text-neutral-700 font-medium">Select Line Item *</Label>
                        <Select value={selectedItemIndex} onValueChange={(idx) => handleItemSelect(idx)} required>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select item from PO" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {poItems.map((item, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                {item.vendor} - {item.location} - {item.brand} {item.model} (Qty: {item.qty})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {/* Quantity Info - Show only when item is selected */}
                  {availableQty.total !== undefined && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-neutral-200">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-neutral-500">Total Qty:</span>
                          <span className="ml-2 font-bold text-neutral-900">{availableQty.total}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500">Already Shipped:</span>
                          <span className="ml-2 font-bold text-neutral-700">{availableQty.shipped}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500">Available:</span>
                          <span className="ml-2 font-bold text-teal-600">{availableQty.available}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto-populated Fields - Only show when item is selected */}
                {(selectedItemIndex !== '' || poItems.length === 1) && formData.brand && (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label className="text-neutral-700">Vendor</Label>
                        <Input
                          value={formData.vendor}
                          className="bg-neutral-100 text-neutral-900"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-700">Brand</Label>
                        <Input
                          value={formData.brand}
                          className="bg-neutral-100 text-neutral-900"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-700">Model</Label>
                        <Input
                          value={formData.model}
                          className="bg-neutral-100 text-neutral-900"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-700">Pickup Quantity *</Label>
                        <Input
                          type="number"
                          value={formData.pickup_quantity}
                          onChange={(e) => setFormData({ ...formData, pickup_quantity: e.target.value })}
                          required
                          min="1"
                          max={availableQty.available || 999}
                          className="bg-white text-neutral-900"
                          placeholder={`Max: ${availableQty.available || 0}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-neutral-700">Pickup Location *</Label>
                        <Input
                          value={formData.from_location}
                          onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                          required
                          className="bg-white text-neutral-900"
                          placeholder="Enter pickup location"
                          data-testid="pickup-location-input"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-700">To Location *</Label>
                        <Input
                          value={formData.to_location}
                          onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                          required
                          className="bg-white text-neutral-900"
                          placeholder="Enter destination"
                          data-testid="to-location-input"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-700">Transporter Name *</Label>
                        <Input
                          value={formData.transporter_name}
                          onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                          required
                          className="bg-white text-neutral-900"
                          data-testid="transporter-input"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-700">Vehicle Number *</Label>
                        <Input
                          value={formData.vehicle_number}
                          onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                          required
                          className="bg-white text-neutral-900 font-mono"
                          data-testid="vehicle-input"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-700">Pickup Date *</Label>
                        <Input
                          type="date"
                          value={formData.pickup_date}
                          onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                          required
                          className="bg-white text-neutral-900"
                          data-testid="pickup-date-input"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-700">Expected Delivery *</Label>
                        <Input
                          type="date"
                          value={formData.expected_delivery}
                          onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                          required
                          className="bg-white text-neutral-900"
                          data-testid="delivery-date-input"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" data-testid="submit-shipment">
                      Create Shipment
                    </Button>
                  </>
                )}
              </form>
            </DialogContent>
          </Dialog>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search by PO, Transporter, Vehicle, Location, Brand, Model, Status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white text-sm placeholder:text-sm"
              data-testid="search-input"
            />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="shipments-table">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Brand/Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Transporter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Pickup Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                      {searchTerm ? `No results found for "${searchTerm}"` : 'No shipments found'}
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.shipment_id} className="table-row border-b border-neutral-100 hover:bg-neutral-50" data-testid="shipment-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-neutral-900">{shipment.po_number}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900">{shipment.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900">{shipment.brand} {shipment.model}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900">{shipment.transporter_name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-neutral-600">{shipment.vehicle_number}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{shipment.from_location} → {shipment.to_location}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900 font-medium">{shipment.pickup_quantity || shipment.imei_list?.length || 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`status-badge ${getStatusColor(shipment.status)}`}>{shipment.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{new Date(shipment.pickup_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openStatusDialog(shipment)}
                          className="text-neutral-900 hover:text-neutral-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(shipment.shipment_id)}
                            className="text-neutral-800 hover:text-neutral-900 hover:bg-neutral-100"
                            data-testid="delete-shipment-button"
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

        {/* Status Update Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-teal-600">Update Shipment Status</DialogTitle>
              <DialogDescription className="text-neutral-600">
                PO: {selectedShipment?.po_number} | {selectedShipment?.vendor}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-neutral-700">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleStatusUpdate} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                Update Status
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
