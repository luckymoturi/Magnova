import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Scan, Search, Trash2, CheckCircle, AlertCircle, Bell, X, Package, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';

export const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [locations, setLocations] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [imeiLookup, setImeiLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const { user } = useAuth();
  const { 
    refreshTimestamps, 
    refreshAfterInventoryChange,
    pendingInventory,
    clearInventoryNotification,
    addInvoiceNotification,
  } = useDataRefresh();
  const isAdmin = user?.role === 'Admin';
  const [scanData, setScanData] = useState({
    imei: '',
    action: '',
    location: '',
    vendor: '',
    brand: '',
    model: '',
    colour: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchPOData();
  }, [refreshTimestamps.inventory, refreshTimestamps.purchaseOrders]);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchTerm, statusFilter]);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    }
  };

  // Fetch unique locations and vendors from POs
  const fetchPOData = async () => {
    try {
      const response = await api.get('/purchase-orders');
      const allLocations = new Set();
      const allVendors = new Set();
      response.data.forEach(po => {
        if (po.items) {
          po.items.forEach(item => {
            if (item.location) allLocations.add(item.location);
            if (item.vendor) allVendors.add(item.vendor);
          });
        }
      });
      setLocations(Array.from(allLocations));
      setVendors(Array.from(allVendors));
    } catch (error) {
      console.error('Error fetching PO data:', error);
    }
  };

  const filterInventory = () => {
    let filtered = inventory;
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }
    setFilteredInventory(filtered);
  };

  // Lookup IMEI when user enters IMEI number
  const handleImeiChange = async (imei) => {
    setScanData(prev => ({ ...prev, imei }));
    setImeiLookup(null);
    
    if (imei.length >= 10) {
      setLookupLoading(true);
      try {
        const response = await api.get(`/inventory/lookup/${imei}`);
        setImeiLookup(response.data);
        
        if (response.data.found) {
          // Auto-populate fields from lookup data if available
          setScanData(prev => ({
            ...prev,
            vendor: response.data.vendor || prev.vendor,
            location: response.data.store_location || response.data.current_location || prev.location,
            brand: response.data.brand || prev.brand,
            model: response.data.model || prev.model,
            colour: response.data.colour || prev.colour,
          }));
          
          if (response.data.in_inventory) {
            toast.success(`IMEI found in inventory - Status: ${response.data.status}`);
          } else if (response.data.in_procurement) {
            toast.success(`IMEI found in procurement - Vendor: ${response.data.vendor}`);
          } else {
            // IMEI not in existing records, but accepted for new entry
            toast.success('IMEI accepted - Ready to enter inventory details');
          }
        }
      } catch (error) {
        console.error('Lookup error:', error);
        // Accept IMEI even if lookup fails
        setImeiLookup({ found: true });
        toast.success('IMEI accepted - Ready to enter inventory details');
      } finally {
        setLookupLoading(false);
      }
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!scanData.imei || !scanData.imei.trim()) {
      toast.error('IMEI is required');
      return;
    }
    if (!scanData.action || !scanData.action.trim()) {
      toast.error('Action is required');
      return;
    }
    if (!scanData.location || !scanData.location.trim()) {
      toast.error('Location is required');
      return;
    }
    if (!scanData.vendor || !scanData.vendor.trim()) {
      toast.error('Vendor is required');
      return;
    }
    
    try {
      await api.post('/inventory/scan', {
        imei: scanData.imei,
        action: scanData.action,
        location: scanData.location,
        organization: 'Nova',
        vendor: scanData.vendor,
        brand: scanData.brand,
        model: scanData.model,
        colour: scanData.colour,
      });
      
      // Clear inventory notification if exists
      // Find matching notification by searching through pending
      pendingInventory.forEach(notif => {
        if (notif.po_number) {
          clearInventoryNotification(notif.po_number, notif.shipment_id);
        }
      });
      
      // Trigger invoice notification
      addInvoiceNotification({
        po_number: imeiLookup?.po_number || '',
        imei: scanData.imei,
        brand: scanData.brand,
        model: scanData.model,
        vendor: scanData.vendor,
        location: scanData.location,
        action: scanData.action,
      });
      
      toast.success('IMEI scanned - Invoice notification sent');
      setDialogOpen(false);
      setScanData({ imei: '', action: '', location: '', vendor: '', brand: '', model: '', colour: '' });
      setImeiLookup(null);
      refreshAfterInventoryChange();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to scan IMEI');
    }
  };

  // Handle notification click - pre-fill form
  const handleNotificationClick = (notification) => {
    setScanData(prev => ({
      ...prev,
      brand: notification.brand || '',
      model: notification.model || '',
      vendor: notification.vendor || '',
      location: notification.to_location || notification.from_location || '',
    }));
    clearInventoryNotification(notification.po_number, notification.shipment_id);
    setDialogOpen(true);
  };

  const handleDelete = async (imei) => {
    if (!window.confirm(`Are you sure you want to delete IMEI ${imei}?`)) return;
    try {
      await api.delete(`/inventory/${imei}`);
      toast.success('Inventory item deleted successfully');
      refreshAfterInventoryChange(); // Trigger refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete item');
    }
  };

  const resetForm = () => {
    setScanData({ imei: '', action: '', location: '', vendor: '', brand: '', model: '', colour: '' });
    setImeiLookup(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      Procured: 'bg-teal-50 text-teal-700 border-teal-200',
      'Inward Nova': 'bg-purple-50 text-purple-700 border-purple-200',
      'Inward Magnova': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Outward Nova': 'bg-neutral-100 text-neutral-800 border-neutral-300',
      'Outward Magnova': 'bg-neutral-100 text-neutral-800 border-neutral-300',
      Available: 'bg-teal-50 text-teal-700 border-teal-200',
      Reserved: 'bg-neutral-100 text-neutral-800 border-neutral-400',
      Dispatched: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    };
    return colors[status] || 'bg-neutral-50 text-neutral-700 border-neutral-200';
  };

  const extractStorage = (value) => {
    if (!value) return 'N/A';
    const strValue = String(value);
    const match = strValue.match(/(\d+)\s?(GB|TB)?/i);
    if (!match) return strValue;
    const size = match[1];
    const unit = match[2] ? match[2].toUpperCase() : 'GB';
    return `${size}${unit === 'GB' ? '' : unit}`;
  };

  const buildDashboardData = (items) => {
    const locationsMap = new Map();

    items.forEach((item) => {
      const location = item.current_location || item.location || 'Unknown';
      const model = item.model || item.device_model || 'Unknown Model';
      const colour = item.colour || 'Unknown';
      const storage = extractStorage(item.storage || item.capacity || item.device_model);

      if (!locationsMap.has(location)) {
        locationsMap.set(location, {
          location,
          total: 0,
          models: new Map(),
        });
      }

      const locationEntry = locationsMap.get(location);
      locationEntry.total += 1;

      if (!locationEntry.models.has(model)) {
        locationEntry.models.set(model, {
          model,
          total: 0,
          storages: new Map(),
        });
      }

      const modelEntry = locationEntry.models.get(model);
      modelEntry.total += 1;

      if (!modelEntry.storages.has(storage)) {
        modelEntry.storages.set(storage, {
          storage,
          total: 0,
          colours: new Map(),
        });
      }

      const storageEntry = modelEntry.storages.get(storage);
      storageEntry.total += 1;
      storageEntry.colours.set(colour, (storageEntry.colours.get(colour) || 0) + 1);
    });

    return Array.from(locationsMap.values()).sort((a, b) => a.location.localeCompare(b.location));
  };

  const dashboardData = useMemo(() => {
    const locations = buildDashboardData(filteredInventory);
    const total = buildDashboardData([
      ...filteredInventory.map((item) => ({
        ...item,
        current_location: 'Total',
      })),
    ]);
    return { locations, total: total[0] };
  }, [filteredInventory]);

  const buildRows = (modelEntry) => {
    const rows = [];
    const storages = Array.from(modelEntry.storages.values()).sort((a, b) => a.storage.localeCompare(b.storage));
    const modelRowSpan = storages.reduce((sum, storageEntry) => sum + storageEntry.colours.size + 1, 0) + 1;

    storages.forEach((storageEntry, storageIndex) => {
      const colours = Array.from(storageEntry.colours.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const storageRowSpan = colours.length + 1;

      colours.forEach(([colour, qty], colourIndex) => {
        rows.push({
          model: modelEntry.model,
          storage: storageEntry.storage,
          colour,
          qty,
          showModel: storageIndex === 0 && colourIndex === 0,
          modelRowSpan,
          showStorage: colourIndex === 0,
          storageRowSpan,
          isTotalRow: false,
        });
      });

      rows.push({
        model: modelEntry.model,
        storage: storageEntry.storage,
        colour: 'Total',
        qty: storageEntry.total,
        showModel: false,
        modelRowSpan: 0,
        showStorage: false,
        storageRowSpan: 0,
        isTotalRow: true,
      });
    });

    rows.push({
      model: modelEntry.model,
      storage: '',
      colour: 'Total',
      qty: modelEntry.total,
      showModel: false,
      modelRowSpan: 0,
      showStorage: false,
      storageRowSpan: 0,
      isTotalRow: true,
      isModelTotal: true,
    });

    return rows;
  };

  const chartPalette = ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

  const buildChartData = (items) => {
    const byLocation = new Map();
    const byModel = new Map();
    const byColour = new Map();

    items.forEach((item) => {
      const location = item.current_location || item.location || 'Unknown';
      const model = item.model || item.device_model || 'Unknown Model';
      const colour = item.colour || 'Unknown';

      byLocation.set(location, (byLocation.get(location) || 0) + 1);
      byModel.set(model, (byModel.get(model) || 0) + 1);
      byColour.set(colour, (byColour.get(colour) || 0) + 1);
    });

    const toSortedArray = (map) =>
      Array.from(map.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    return {
      locations: toSortedArray(byLocation),
      models: toSortedArray(byModel),
      colours: toSortedArray(byColour),
    };
  };

  const chartData = useMemo(() => buildChartData(filteredInventory), [filteredInventory]);

  return (
    <Layout>
      <div data-testid="inventory-page">
        {/* Inventory Notifications Banner - Shipment Complete, Ready for Inventory */}
        {pendingInventory.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-lg p-4" data-testid="inventory-notifications">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-cyan-600 animate-pulse" />
              <h3 className="font-semibold text-cyan-800">Shipment Complete - Ready for Inventory Scan</h3>
              <span className="bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingInventory.length}</span>
            </div>
            <div className="space-y-2">
              {pendingInventory.map((notif, index) => (
                <div 
                  key={`inv-${notif.po_number}-${notif.shipment_id}-${index}`}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-cyan-100 hover:border-cyan-300 transition-colors cursor-pointer"
                  onClick={() => handleNotificationClick(notif)}
                  data-testid="inventory-notification-item"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-cyan-100 p-2 rounded-lg">
                      <Package className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">
                        <span className="font-mono text-neutral-900">{notif.po_number}</span>
                        <span className="mx-2 text-neutral-400">|</span>
                        <span>{notif.brand} {notif.model}</span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        From: {notif.from_location} → To: {notif.to_location} • Qty: {notif.pickup_quantity} • {notif.transporter}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={(e) => { e.stopPropagation(); handleNotificationClick(notif); }}
                    >
                      <Scan className="w-4 h-4 mr-1" />
                      Scan IMEI
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-neutral-400 hover:text-neutral-600"
                      onClick={(e) => { e.stopPropagation(); clearInventoryNotification(notif.po_number, notif.shipment_id); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">IMEI Inventory</h1>
            <p className="text-neutral-600 mt-1">Track device inventory with IMEI-level visibility</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
              onClick={() => setShowDashboard((prev) => !prev)}
              data-testid="toggle-dashboard-button"
            >
              <FileText className="w-4 h-4 mr-2" />
              {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
            </Button>
            <Button
              variant="outline"
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
              onClick={() => setShowCharts((prev) => !prev)}
              data-testid="toggle-charts-button"
            >
              <FileText className="w-4 h-4 mr-2" />
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="scan-imei-button" className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Scan className="w-4 h-4 mr-2" />
                  Scan IMEI
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-teal-600">Scan IMEI</DialogTitle>
                <DialogDescription className="text-neutral-600">Enter IMEI to auto-populate details and update status</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleScan} className="space-y-4" data-testid="scan-form">
                {/* IMEI Input with Lookup */}
                <div>
                  <Label className="text-neutral-700">IMEI Number *</Label>
                  <div className="relative">
                    <Input
                      value={scanData.imei}
                      onChange={(e) => handleImeiChange(e.target.value)}
                      required
                      className="font-mono bg-white text-neutral-900 pr-10"
                      data-testid="scan-imei-input"
                      placeholder="Enter IMEI number"
                    />
                    {lookupLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-neutral-900 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                    {!lookupLoading && imeiLookup && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {imeiLookup.found ? (
                          <CheckCircle className="h-4 w-4 text-teal-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-neutral-1000" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Lookup Result Info */}
                  {imeiLookup && (
                    <div className={`mt-2 p-3 rounded-lg text-sm ${
                      imeiLookup.found 
                        ? 'bg-teal-50 border border-teal-200' 
                        : 'bg-neutral-100 border border-neutral-300'
                    }`}>
                      {imeiLookup.found ? (
                        <div className="space-y-1">
                          {imeiLookup.in_inventory && (
                            <p className="text-teal-700">
                              <span className="font-medium">In Inventory:</span> Status - {imeiLookup.status}
                            </p>
                          )}
                          {imeiLookup.in_procurement && (
                            <>
                              <p className="text-teal-700">
                                <span className="font-medium">From Procurement:</span> {imeiLookup.brand} {imeiLookup.model}
                              </p>
                              <p className="text-teal-600">
                                <span className="font-medium">Vendor:</span> {imeiLookup.vendor} | 
                                <span className="font-medium ml-2">PO:</span> {imeiLookup.po_number}
                              </p>
                              {imeiLookup.colour && (
                                <p className="text-teal-600">
                                  <span className="font-medium">Colour:</span> {imeiLookup.colour}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-neutral-800">
                          <AlertCircle className="inline w-4 h-4 mr-1" />
                          IMEI not found. Please add this IMEI through Procurement first.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Auto-populated fields - Brand, Model, Colour */}
                {imeiLookup?.found && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div>
                      <Label className="text-neutral-500 text-xs">Brand</Label>
                      <Input
                        value={scanData.brand || '-'}
                        readOnly
                        className="font-medium bg-white text-neutral-900 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-neutral-500 text-xs">Model</Label>
                      <Input
                        value={scanData.model || '-'}
                        readOnly
                        className="font-medium bg-white text-neutral-900 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-neutral-500 text-xs">Colour</Label>
                      <Input
                        value={scanData.colour || '-'}
                        readOnly
                        className="font-medium bg-white text-neutral-900 h-9"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-neutral-700">Action *</Label>
                  <Select value={scanData.action} onValueChange={(value) => setScanData({ ...scanData, action: value })} required>
                    <SelectTrigger data-testid="scan-action-select" className="bg-white text-neutral-900">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="inward_nova">Inward Nova</SelectItem>
                      <SelectItem value="inward_magnova">Inward Magnova</SelectItem>
                      <SelectItem value="outward_nova">Outward Nova</SelectItem>
                      <SelectItem value="outward_magnova">Outward Magnova</SelectItem>
                      <SelectItem value="dispatch">Dispatch</SelectItem>
                      <SelectItem value="available">Mark Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-neutral-700">Brand</Label>
                    <Input
                      value={scanData.brand}
                      onChange={(e) => setScanData({ ...scanData, brand: e.target.value })}
                      className="bg-white text-neutral-900"
                      placeholder="Enter brand"
                    />
                  </div>
                  <div>
                    <Label className="text-neutral-700">Model</Label>
                    <Input
                      value={scanData.model}
                      onChange={(e) => setScanData({ ...scanData, model: e.target.value })}
                      className="bg-white text-neutral-900"
                      placeholder="Enter model"
                    />
                  </div>
                  <div>
                    <Label className="text-neutral-700">Colour</Label>
                    <Input
                      value={scanData.colour}
                      onChange={(e) => setScanData({ ...scanData, colour: e.target.value })}
                      className="bg-white text-neutral-900"
                      placeholder="Enter colour"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-neutral-700">Vendor {imeiLookup?.found ? '(Auto-populated)' : '*'}</Label>
                    <Select 
                      value={scanData.vendor} 
                      onValueChange={(value) => setScanData({ ...scanData, vendor: value })} 
                      required={!imeiLookup?.found}
                    >
                      <SelectTrigger className={`text-neutral-900 ${imeiLookup?.found && scanData.vendor ? 'bg-neutral-100' : 'bg-white'}`}>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {vendors.length > 0 ? (
                          vendors.map((vendor) => (
                            <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Croma">Croma</SelectItem>
                            <SelectItem value="Reliance Digital">Reliance Digital</SelectItem>
                            <SelectItem value="Vijay Sales">Vijay Sales</SelectItem>
                            <SelectItem value="Amazon">Amazon</SelectItem>
                            <SelectItem value="Flipkart">Flipkart</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-neutral-700">Location {imeiLookup?.found ? '(Auto-populated)' : '*'}</Label>
                    <Select 
                      value={scanData.location} 
                      onValueChange={(value) => setScanData({ ...scanData, location: value })} 
                      required={!imeiLookup?.found}
                    >
                      <SelectTrigger className={`text-neutral-900 ${imeiLookup?.found && scanData.location ? 'bg-neutral-100' : 'bg-white'}`} data-testid="scan-location-select">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {locations.length > 0 ? (
                          locations.map((loc) => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Mumbai">Mumbai</SelectItem>
                            <SelectItem value="Delhi">Delhi</SelectItem>
                            <SelectItem value="Bangalore">Bangalore</SelectItem>
                            <SelectItem value="Chennai">Chennai</SelectItem>
                            <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                            <SelectItem value="Pune">Pune</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white" 
                  data-testid="submit-scan"
                  disabled={
                    !scanData.imei ||
                    !scanData.action ||
                    !scanData.location ||
                    !scanData.vendor ||
                    (!imeiLookup?.found && scanData.imei.length >= 10)
                  }
                >
                  {imeiLookup?.found ? 'Scan & Update' : 'Add to Inventory & Update'}
                </Button>
                
                {(!scanData.imei || !scanData.action || !scanData.location || !scanData.vendor) && (
                  <p className="text-center text-sm text-neutral-500">
                    Fill all required fields to continue
                  </p>
                )}
                
                {!imeiLookup?.found && scanData.imei.length >= 10 && (
                  <p className="text-center text-sm text-neutral-700">
                    IMEI must be added through Procurement first
                  </p>
                )}
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {showDashboard && (
          <div className="mb-8 space-y-4" data-testid="inventory-dashboard">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Inventory Dashboard</h2>
                <p className="text-sm text-neutral-600">Grouped by location, model, storage, and colour</p>
              </div>
              <div className="text-sm text-neutral-600">
                Total IMEIs: <span className="font-semibold text-neutral-900">{filteredInventory.length}</span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {[...dashboardData.locations, ...(dashboardData.total ? [dashboardData.total] : [])].map((locationEntry) => {
                return (
                  <div
                    key={locationEntry.location}
                    className="border border-teal-100 rounded-lg overflow-hidden shadow-sm bg-white"
                    data-testid={`dashboard-card-${locationEntry.location}`}
                  >
                    <div className="bg-teal-600 text-white px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide">
                      {locationEntry.location}
                    </div>
                    <div className="bg-neutral-50 grid grid-cols-4 gap-px text-xs font-semibold text-neutral-700">
                      <div className="bg-neutral-50 px-3 py-2">Model</div>
                      <div className="bg-neutral-50 px-3 py-2">Storage</div>
                      <div className="bg-neutral-50 px-3 py-2">Colour</div>
                      <div className="bg-neutral-50 px-3 py-2 text-right">Qty</div>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      <table className="w-full text-xs table-fixed" data-testid="dashboard-table">
                        <colgroup>
                          <col className="w-[34%]" />
                          <col className="w-[22%]" />
                          <col className="w-[28%]" />
                          <col className="w-[16%]" />
                        </colgroup>
                        <tbody>
                          {Array.from(locationEntry.models.values()).map((modelEntry) => {
                            const rows = buildRows(modelEntry);
                            return rows.map((row, rowIndex) => (
                              <tr
                                key={`${modelEntry.model}-${row.storage}-${row.colour}-${rowIndex}`}
                                className="border-t border-neutral-100"
                              >
                                {row.showModel && (
                                  <td
                                    className="bg-neutral-50 text-neutral-900 px-3 py-2 align-middle font-medium"
                                    rowSpan={row.modelRowSpan}
                                  >
                                    <span className="block truncate" title={row.model}>{row.model}</span>
                                  </td>
                                )}
                                {row.showStorage && (
                                  <td
                                    className="bg-neutral-50 text-neutral-900 px-3 py-2 align-middle font-medium"
                                    rowSpan={row.storageRowSpan}
                                  >
                                    <span className="block truncate" title={row.storage}>{row.storage}</span>
                                  </td>
                                )}
                                {!row.showStorage && <td className="px-3 py-2 bg-white"></td>}
                                <td className={`px-3 py-2 ${row.isTotalRow ? 'font-semibold text-neutral-900' : 'text-neutral-800'}`}>
                                  <span className="block truncate" title={row.colour}>{row.colour}</span>
                                </td>
                                <td className={`px-3 py-2 text-right ${row.isTotalRow ? 'font-semibold text-neutral-900' : 'text-neutral-800'}`}>
                                  {row.qty}
                                </td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-50 text-right">
                      Location Total: {locationEntry.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showCharts && (
          <div className="mb-8 space-y-4" data-testid="inventory-charts">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Inventory Charts</h2>
                <p className="text-sm text-neutral-600">Quick visual summary of locations, models, and colours</p>
              </div>
              <div className="text-sm text-neutral-600">
                Total IMEIs: <span className="font-semibold text-neutral-900">{filteredInventory.length}</span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="border border-teal-100 rounded-lg bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-neutral-800 mb-3">Bar Graph (Top Locations)</div>
                <div className="space-y-2">
                  {chartData.locations.length === 0 && (
                    <div className="text-xs text-neutral-500">No data</div>
                  )}
                  {chartData.locations.map((item, idx) => {
                    const maxValue = chartData.locations[0]?.value || 1;
                    const width = Math.round((item.value / maxValue) * 100);
                    return (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className="w-24 text-xs text-neutral-700 truncate" title={item.label}>{item.label}</div>
                        <div className="flex-1 h-2 bg-neutral-100 rounded">
                          <div
                            className="h-2 rounded"
                            style={{ width: `${width}%`, backgroundColor: chartPalette[idx % chartPalette.length] }}
                          ></div>
                        </div>
                        <div className="w-8 text-xs text-neutral-700 text-right">{item.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border border-teal-100 rounded-lg bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-neutral-800 mb-3">Pie Chart (Top Models)</div>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full border border-teal-100"
                    style={{
                      background: chartData.models.length
                        ? `conic-gradient(${chartData.models
                            .map((item, idx) => {
                              const total = chartData.models.reduce((sum, entry) => sum + entry.value, 0) || 1;
                              const start = chartData.models.slice(0, idx).reduce((sum, entry) => sum + entry.value, 0);
                              const startAngle = (start / total) * 360;
                              const endAngle = ((start + item.value) / total) * 360;
                              return `${chartPalette[idx % chartPalette.length]} ${startAngle}deg ${endAngle}deg`;
                            })
                            .join(',')}`
                        : '#f8fafc',
                    }}
                  ></div>
                  <div className="space-y-1 text-xs text-neutral-700">
                    {chartData.models.length === 0 && <div className="text-neutral-500">No data</div>}
                    {chartData.models.map((item, idx) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chartPalette[idx % chartPalette.length] }}></span>
                        <span className="truncate" title={item.label}>{item.label}</span>
                        <span className="ml-auto text-neutral-800 font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-teal-100 rounded-lg bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-neutral-800 mb-3">Sunburst (Top Colours)</div>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border border-teal-100"
                      style={{
                        background: chartData.colours.length
                          ? `conic-gradient(${chartData.colours
                              .map((item, idx) => {
                                const total = chartData.colours.reduce((sum, entry) => sum + entry.value, 0) || 1;
                                const start = chartData.colours.slice(0, idx).reduce((sum, entry) => sum + entry.value, 0);
                                const startAngle = (start / total) * 360;
                                const endAngle = ((start + item.value) / total) * 360;
                                return `${chartPalette[idx % chartPalette.length]} ${startAngle}deg ${endAngle}deg`;
                              })
                              .join(',')}`
                          : '#f8fafc',
                      }}
                    ></div>
                    <div className="absolute inset-3 rounded-full bg-white border border-teal-100"></div>
                  </div>
                  <div className="space-y-1 text-xs text-neutral-700">
                    {chartData.colours.length === 0 && <div className="text-neutral-500">No data</div>}
                    {chartData.colours.map((item, idx) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chartPalette[idx % chartPalette.length] }}></span>
                        <span className="truncate" title={item.label}>{item.label}</span>
                        <span className="ml-auto text-neutral-800 font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search by IMEI, model or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
              data-testid="inventory-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-white" data-testid="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Procured">Procured</SelectItem>
              <SelectItem value="Inward Nova">Inward Nova</SelectItem>
              <SelectItem value="Inward Magnova">Inward Magnova</SelectItem>
              <SelectItem value="Outward Nova">Outward Nova</SelectItem>
              <SelectItem value="Outward Magnova">Outward Magnova</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Reserved">Reserved</SelectItem>
              <SelectItem value="Dispatched">Dispatched</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="inventory-table">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">IMEI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Colour</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Updated</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-neutral-500">
                      No inventory items found
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.imei} className="table-row border-b border-neutral-100 hover:bg-neutral-50" data-testid="inventory-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-neutral-900">{item.imei}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900">{item.brand || '-'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900">{item.model || item.device_model || '-'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{item.colour || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`status-badge ${getStatusColor(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{item.current_location}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{new Date(item.updated_at).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.imei)}
                            className="text-neutral-800 hover:text-neutral-900 hover:bg-neutral-100 h-8 w-8 p-0"
                            data-testid="delete-inventory-button"
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
