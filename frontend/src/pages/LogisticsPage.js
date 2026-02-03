import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';

export const LogisticsPage = () => {
  const [shipments, setShipments] = useState([]);
  const [pos, setPOs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPOItems] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState('');
  const [availableQty, setAvailableQty] = useState({});
  const { user } = useAuth();
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
  }, []);

  const fetchShipments = async () => {
    try {
      const response = await api.get('/logistics/shipments');
      setShipments(response.data);
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
      const itemQty = item.qty || 0;
      const shippedQty = getShippedQuantityForItem(poNumber, item.vendor, item.location, item.model);
      const available = itemQty - shippedQty;
      
      setFormData(prev => ({
        ...prev,
        po_number: poNumber,
        from_location: item.location || '',
        brand: item.brand || '',
        model: item.model || '',
        vendor: item.vendor || '',
        total_quantity: itemQty.toString(),
      }));
      
      setAvailableQty({
        total: itemQty,
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

      await api.post('/logistics/shipments', {
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
      toast.success('Shipment created successfully');
      setDialogOpen(false);
      resetForm();
      fetchShipments();
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
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const openStatusDialog = (shipment) => {
    setSelectedShipment(shipment);
    setNewStatus(shipment.status);
    setStatusDialogOpen(true);
  };

  const handleDelete = async (shipmentId) => {
    if (!window.confirm('Are you sure you want to delete this shipment?')) return;
    try {
      await api.delete(`/logistics/shipments/${shipmentId}`);
      toast.success('Shipment deleted successfully');
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete shipment');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-orange-50 text-orange-700 border-orange-300',
      'In Transit': 'bg-blue-50 text-blue-700 border-blue-200',
      'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Cancelled': 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Logistics & Shipments</h1>
            <p className="text-slate-600 mt-1">Track shipments and e-way bills</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-shipment-button" className="bg-magnova-blue hover:bg-magnova-dark-blue">
                <Plus className="w-4 h-4 mr-2" />
                Create Shipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-magnova-orange">Create Shipment</DialogTitle>
                <DialogDescription className="text-slate-600">Record new shipment details - Select PO to auto-populate</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4" data-testid="shipment-form">
                {/* PO Selection */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-700 font-medium">PO Number *</Label>
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
                        <Label className="text-slate-700 font-medium">Select Line Item *</Label>
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
                    <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Total Qty:</span>
                          <span className="ml-2 font-bold text-slate-900">{availableQty.total}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Already Shipped:</span>
                          <span className="ml-2 font-bold text-orange-600">{availableQty.shipped}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Available:</span>
                          <span className="ml-2 font-bold text-emerald-600">{availableQty.available}</span>
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
                        <Label className="text-slate-700">Vendor</Label>
                        <Input
                          value={formData.vendor}
                          className="bg-slate-100 text-slate-900"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Brand</Label>
                        <Input
                          value={formData.brand}
                          className="bg-slate-100 text-slate-900"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Model</Label>
                        <Input
                          value={formData.model}
                          className="bg-slate-100 text-slate-900"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Pickup Quantity *</Label>
                        <Input
                          type="number"
                          value={formData.pickup_quantity}
                          onChange={(e) => setFormData({ ...formData, pickup_quantity: e.target.value })}
                          required
                          min="1"
                          max={availableQty.available || 999}
                          className="bg-white text-slate-900"
                          placeholder={`Max: ${availableQty.available || 0}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-700">Pickup Location *</Label>
                        <Select value={formData.from_location} onValueChange={(value) => setFormData({ ...formData, from_location: value })} required>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select pickup location" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {allLocations.length > 0 ? (
                              allLocations.map((loc) => (
                                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Mumbai">Mumbai</SelectItem>
                                <SelectItem value="Delhi">Delhi</SelectItem>
                                <SelectItem value="Bangalore">Bangalore</SelectItem>
                                <SelectItem value="Chennai">Chennai</SelectItem>
                                <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                                <SelectItem value="Vijayawada">Vijayawada</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-700">To Location *</Label>
                        <Select value={formData.to_location} onValueChange={(value) => setFormData({ ...formData, to_location: value })} required>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {allLocations.length > 0 ? (
                              allLocations.map((loc) => (
                                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Mumbai">Mumbai</SelectItem>
                                <SelectItem value="Delhi">Delhi</SelectItem>
                                <SelectItem value="Bangalore">Bangalore</SelectItem>
                                <SelectItem value="Chennai">Chennai</SelectItem>
                                <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                                <SelectItem value="Vijayawada">Vijayawada</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-700">Transporter Name *</Label>
                        <Input
                          value={formData.transporter_name}
                          onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                          required
                          className="bg-white text-slate-900"
                          data-testid="transporter-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Vehicle Number *</Label>
                        <Input
                          value={formData.vehicle_number}
                          onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                          required
                          className="bg-white text-slate-900 font-mono"
                          data-testid="vehicle-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Pickup Date *</Label>
                        <Input
                          type="date"
                          value={formData.pickup_date}
                          onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                          required
                          className="bg-white text-slate-900"
                          data-testid="pickup-date-input"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">Expected Delivery *</Label>
                        <Input
                          type="date"
                          value={formData.expected_delivery}
                          onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                          required
                          className="bg-white text-slate-900"
                          data-testid="delivery-date-input"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-magnova-blue hover:bg-magnova-dark-blue" data-testid="submit-shipment">
                      Create Shipment
                    </Button>
                  </>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="shipments-table">
              <thead>
                <tr className="bg-magnova-blue text-white">
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
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      No shipments found
                    </td>
                  </tr>
                ) : (
                  shipments.map((shipment) => (
                    <tr key={shipment.shipment_id} className="table-row border-b border-slate-100 hover:bg-slate-50" data-testid="shipment-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-magnova-blue">{shipment.po_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{shipment.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{shipment.brand} {shipment.model}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{shipment.transporter_name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{shipment.vehicle_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{shipment.from_location} → {shipment.to_location}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{shipment.pickup_quantity || shipment.imei_list?.length || 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`status-badge ${getStatusColor(shipment.status)}`}>{shipment.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(shipment.pickup_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openStatusDialog(shipment)}
                          className="text-magnova-blue hover:text-magnova-dark-blue"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(shipment.shipment_id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
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
              <DialogTitle className="text-magnova-orange">Update Shipment Status</DialogTitle>
              <DialogDescription className="text-slate-600">
                PO: {selectedShipment?.po_number} | {selectedShipment?.vendor}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-700">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleStatusUpdate} className="w-full bg-magnova-blue hover:bg-magnova-dark-blue">
                Update Status
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
