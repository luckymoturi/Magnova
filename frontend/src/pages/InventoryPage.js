import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Scan, Search, Trash2, CheckCircle, AlertCircle, Bell, X, Package, FileText, MapPin, Smartphone, CheckCircle2, BarChart3, TrendingUp, Layers, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import { Navigate } from 'react-router-dom';

export const InventoryPage = ({
  organization = 'Nova',
  inventoryLabel,
  showInward = true,
  showOutward = true,
  inwardScope = 'status',
  outwardScope = 'status',
  preferredLocations = [],
  warehouseLabel,
}) => {
  const pageLabel = inventoryLabel || `Inventory - ${organization}`;
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
  
  const [pos, setPos] = useState([]);
  const [poItems, setPOItems] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedPOItemIndex, setSelectedPOItemIndex] = useState('');
  const [inwardRows, setInwardRows] = useState([{ imei1: '', imei2: '' }]);
  const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('1');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const isAdmin = user?.role === 'Admin';
  const hasAccess = user?.role === 'Admin' || user?.role === 'Inventory';
  const [scanData, setScanData] = useState({
    imei: '',
    action: '',
    location: '',
    vendor: '',
    brand: '',
    model: '',
    colour: '',
    storage: '',
    po_number: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchPOData();
  }, [refreshTimestamps.inventory, refreshTimestamps.purchaseOrders, organization]);

  useEffect(() => {
    let filtered = inventory;
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.imei2 && item.imei2.toLowerCase().includes(searchTerm.toLowerCase())) ||
          item.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }
    setFilteredInventory(filtered);
  }, [inventory, searchTerm, statusFilter]);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory', { params: { organization } });
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
      setPos(response.data);
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
          (item.imei2 && item.imei2.toLowerCase().includes(searchTerm.toLowerCase())) ||
          item.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }
    setFilteredInventory(filtered);
  };

  const handlePOSelect = (poNumber) => {
    const po = pos.find(p => p.po_number === poNumber);
    setSelectedPO(po);
    setScanData(prev => ({ ...prev, po_number: poNumber }));
    if (po && po.items && po.items.length > 0) {
      setPOItems(po.items);
      if (po.items.length === 1) {
        handleItemSelect('0', po.items);
      } else {
        setSelectedPOItemIndex('');
      }
    } else {
      setPOItems([]);
      setSelectedPOItemIndex('');
    }
  };

  const handleItemSelect = (index, items = poItems) => {
    setSelectedPOItemIndex(index);
    const item = items[parseInt(index)];
    if (item) {
      setScanData(prev => ({
        ...prev,
        vendor: item.vendor || '',
        location: item.location || '',
        brand: item.brand || '',
        model: item.model || '',
        storage: item.storage || '',
        colour: item.colour || '',
      }));
      setQuantity(item.qty ? item.qty.toString() : '1');
    }
  };

  const handleAddRow = () => {
    setInwardRows([...inwardRows, { imei1: '', imei2: '' }]);
  };

  const handleRemoveRow = (index) => {
    if (inwardRows.length > 1) {
      setInwardRows(inwardRows.filter((_, i) => i !== index));
    }
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...inwardRows];
    updated[index][field] = value;
    setInwardRows(updated);
  };

  const downloadTemplate = () => {
    const headers = ['imei1', 'imei2', 'inward_date'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_bulk_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split('\n').filter(r => r.trim() !== '');
        
        // Skip header if it exists
        const startIdx = rows[0].toLowerCase().includes('imei') ? 1 : 0;
        const dataRows = rows.slice(startIdx);

        const newRows = dataRows
          .map(row => {
            const cols = row.split(',');
            if (cols.length >= 1 && cols[0].trim() !== '') {
              return { imei1: cols[0].trim(), imei2: cols[1]?.trim() || '' };
            }
            return null;
          })
          .filter(row => row !== null);
          
        if (newRows.length > 0) {
          setInwardRows(newRows);
          toast.success(`Imported ${newRows.length} IMEIs from file`);
        } else {
          toast.error('No valid IMEIs found in file');
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleBulkSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (organization === 'Nova') {
      if (!scanData.po_number || !scanData.action || !scanData.location) {
        toast.error('Please fill required fields (PO, Action, Location)');
        return;
      }

      setBulkSubmitting(true);
      const payload = inwardRows
        .filter(row => row.imei1.trim() !== '')
        .map(row => ({
          imei: row.imei1,
          imei2: row.imei2 || null,
          action: scanData.action,
          location: scanData.location,
          organization: 'Nova',
          po_number: scanData.po_number,
          vendor: scanData.vendor,
          brand: scanData.brand,
          model: scanData.model,
          storage: scanData.storage,
          colour: scanData.colour,
          inward_date: inwardDate ? new Date(inwardDate).toISOString() : null
        }));

      if (payload.length === 0) {
        toast.error('At least one IMEI is required');
        setBulkSubmitting(false);
        return;
      }

      try {
        const response = await api.post('/inventory/bulk-scan', payload);
        const successes = response.data.filter(r => r.success);
        const failures = response.data.filter(r => !r.success);

        if (successes.length > 0) {
          toast.success(`Successfully processed ${successes.length} IMEIs`);
        }
        if (failures.length > 0) {
          toast.error(`Failed to process ${failures.length} IMEIs. Check console for details.`);
          console.error('Bulk upload failures:', failures);
        }

        if (failures.length === 0) {
          setDialogOpen(false);
          resetForm();
          refreshAfterInventoryChange();
        }
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Bulk upload failed');
      } finally {
        setBulkSubmitting(false);
      }
    } else {
      handleScan(e);
    }
  };

  const handleTransferToMagnova = async () => {
    if (!scanData.po_number || !scanData.location) {
      toast.error('Please fill required fields (PO, Location)');
      return;
    }

    const payload = inwardRows
      .filter(row => row.imei1.trim() !== '')
      .map(row => ({
        imei: row.imei1,
        imei2: row.imei2 || null,
        action: 'inward_magnova',
        location: scanData.location,
        organization: 'Magnova',
        po_number: scanData.po_number,
        vendor: scanData.vendor,
        brand: scanData.brand,
        model: scanData.model,
        storage: scanData.storage,
        colour: scanData.colour,
        inward_date: inwardDate ? new Date(inwardDate).toISOString() : null
      }));

    if (payload.length === 0) {
      toast.error('At least one IMEI is required');
      return;
    }

    try {
      setTransferSubmitting(true);
      const response = await api.post('/inventory/bulk-scan', payload);
      const successes = response.data.filter(r => r.success);
      const failures = response.data.filter(r => !r.success);

      if (successes.length > 0) {
        toast.success(`Transferred ${successes.length} IMEIs to Magnova`);
      }
      if (failures.length > 0) {
        toast.error(`Failed to transfer ${failures.length} IMEIs. Check console for details.`);
        console.error('Transfer failures:', failures);
      }

      if (failures.length === 0) {
        setDialogOpen(false);
        resetForm();
        refreshAfterInventoryChange();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Transfer failed');
    } finally {
      setTransferSubmitting(false);
    }
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
        organization,
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
    setScanData({ imei: '', action: '', location: '', vendor: '', brand: '', model: '', colour: '', storage: '', po_number: '' });
    setImeiLookup(null);
    setInwardRows([{ imei1: '', imei2: '' }]);
    setSelectedPO(null);
    setPOItems([]);
    setSelectedPOItemIndex('');
  };

  const getStatusColor = (status) => {
    const colors = {
      Procured: 'bg-neutral-100 text-neutral-800 border-neutral-400',
      'Inward Nova': 'bg-neutral-100 text-neutral-700 border-neutral-300',
      'Inward Magnova': 'bg-neutral-100 text-neutral-700 border-neutral-300',
      'Outward Nova': 'bg-neutral-100 text-neutral-800 border-neutral-300',
      'Outward Magnova': 'bg-neutral-100 text-neutral-800 border-neutral-300',
      Available: 'bg-neutral-100 text-neutral-800 border-neutral-400',
      Reserved: 'bg-neutral-100 text-neutral-800 border-neutral-400',
      Dispatched: 'bg-neutral-100 text-neutral-700 border-neutral-300',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const chartPalette = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#818cf8'];

  // Stats for dashboard cards
  const inventoryStats = useMemo(() => {
    const total = filteredInventory.length;
    const byStatus = {};
    const byLocation = {};
    const byModel = {};

    filteredInventory.forEach((item) => {
      const status = item.status || 'Unknown';
      const location = item.current_location || item.location || 'Unknown';
      const model = item.model || item.device_model || 'Unknown';

      byStatus[status] = (byStatus[status] || 0) + 1;
      byLocation[location] = (byLocation[location] || 0) + 1;
      byModel[model] = (byModel[model] || 0) + 1;
    });

    // Get top locations
    const topLocations = Object.entries(byLocation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Get top models
    const topModels = Object.entries(byModel)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total,
      byStatus,
      byLocation,
      byModel,
      topLocations,
      topModels,
      statusCount: Object.keys(byStatus).length,
      locationCount: Object.keys(byLocation).length,
    };
  }, [filteredInventory]);

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

  const getOrgStatusLabels = () => {
    if (organization === 'Magnova') {
      return { inward: 'Inward Magnova', outward: 'Outward Magnova' };
    }
    return { inward: 'Inward Nova', outward: 'Outward Nova' };
  };

  const groupByLocation = (items) => {
    const groups = new Map();
    items.forEach((item) => {
      const location = item.current_location || item.location || 'Unknown';
      if (!groups.has(location)) {
        groups.set(location, []);
      }
      groups.get(location).push(item);
    });
    if (preferredLocations.length > 0) {
      preferredLocations.forEach((loc) => {
        if (!groups.has(loc)) {
          groups.set(loc, []);
        }
      });
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const orgStatuses = getOrgStatusLabels();
  const inwardItems =
    inwardScope === 'all'
      ? filteredInventory
      : filteredInventory.filter((item) => item.status === orgStatuses.inward);
  const outwardItems = showOutward
    ? (outwardScope === 'all'
      ? filteredInventory
      : filteredInventory.filter((item) => item.status === orgStatuses.outward))
    : [];
  const groupedInward = groupByLocation(inwardItems);
  const groupedOutward = showOutward ? groupByLocation(outwardItems) : [];

  return (
    <Layout pageTitle="IMEI Inventory" pageDescription="Track device inventory with IMEI-level visibility">
      <div data-testid="inventory-page">
        {/* Inventory Notifications Banner - Shipment Complete, Ready for Inventory */}
        {pendingInventory.length > 0 && (
          <div className="mb-6 bg-neutral-50 border border-neutral-300 rounded-lg p-4" data-testid="inventory-notifications">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-neutral-600 animate-pulse" />
              <h3 className="font-semibold text-neutral-800">Shipment Complete - Ready for Inventory Scan</h3>
              <span className="bg-neutral-800 text-white text-xs px-2 py-0.5 rounded-full">{pendingInventory.length}</span>
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
                    <div className="bg-neutral-100 p-2 rounded-lg border border-neutral-200">
                      <Package className="w-5 h-5 text-neutral-600" />
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
                      className="bg-neutral-800 hover:bg-neutral-900"
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

        <div className="mb-5">
          <h2 className="text-2xl font-bold text-neutral-900">{pageLabel}</h2>
          <p className="text-sm text-neutral-500 mt-1">Organization-specific inventory overview</p>
        </div>

        <div className="flex items-center justify-end gap-3 mb-6">
          <Button
            variant="outline"
            className="border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            onClick={() => setShowDashboard((prev) => !prev)}
            data-testid="toggle-dashboard-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
          </Button>
          <Button
            variant="outline"
            className="border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            onClick={() => setShowCharts((prev) => !prev)}
            data-testid="toggle-charts-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            {showCharts ? 'Hide Charts' : 'Show Charts'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="scan-imei-button" className="bg-gray-900 hover:bg-gray-800 text-white">
                <Scan className="w-4 h-4 mr-2" />
                {organization === 'Nova' ? 'Add Inventory' : 'Scan IMEI'}
              </Button>
            </DialogTrigger>
            <DialogContent className={`bg-white ${organization === 'Nova' ? 'max-w-3xl' : 'max-w-lg'}`}>
              <DialogHeader>
                <DialogTitle className="text-neutral-900">
                  {organization === 'Nova' ? 'Record Inventory Entry' : 'Scan IMEI'}
                </DialogTitle>
                <DialogDescription className="text-neutral-600">
                  {organization === 'Nova' ? 'Select PO and record device details with multiple IMEIs' : 'Enter IMEI to auto-populate details and update status'}
                </DialogDescription>
              </DialogHeader>

              {organization === 'Nova' ? (
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div>
                      <Label className="text-neutral-700 font-medium">PO Number *</Label>
                      <Select value={scanData.po_number} onValueChange={handlePOSelect}>
                        <SelectTrigger className="bg-white border-neutral-400 text-neutral-900">
                          <SelectValue placeholder="Select PO" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-neutral-300">
                           {pos.map(po => (
                             <SelectItem key={po.po_number} value={po.po_number} className="text-neutral-900">
                               {po.po_number} - {po.purchase_office}
                             </SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-neutral-700 font-medium">Action *</Label>
                      <Select value={scanData.action} onValueChange={(v) => setScanData({...scanData, action: v})}>
                        <SelectTrigger className="bg-white border-neutral-400 text-neutral-900">
                          <SelectValue placeholder="Select Action" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-neutral-300">
                          <SelectItem value="inward_nova" className="text-neutral-900">Inward Nova</SelectItem>
                          {showOutward && <SelectItem value="outward_nova" className="text-neutral-900">Outward Nova</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    {poItems.length > 1 && (
                      <div className="col-span-2">
                        <Label className="text-neutral-700 font-medium">Select Line Item *</Label>
                        <Select value={selectedPOItemIndex} onValueChange={handleItemSelect}>
                          <SelectTrigger className="bg-white border-neutral-400 text-neutral-900">
                            <SelectValue placeholder="Select item from PO" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-neutral-300">
                            {poItems.map((item, idx) => (
                              <SelectItem key={idx} value={idx.toString()} className="text-neutral-900">
                                {item.vendor} - {item.brand} {item.model} ({item.storage || 'No Storage'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <Label className="text-[10px] text-neutral-500 uppercase font-bold">Vendor</Label>
                      <Input value={scanData.vendor} readOnly className="bg-neutral-100 h-8 text-xs border-neutral-200" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-neutral-500 uppercase font-bold">Brand</Label>
                      <Input value={scanData.brand} readOnly className="bg-neutral-100 h-8 text-xs border-neutral-200" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-neutral-500 uppercase font-bold">Model</Label>
                      <Input value={scanData.model} readOnly className="bg-neutral-100 h-8 text-xs border-neutral-200" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-neutral-500 uppercase font-bold">Storage</Label>
                      <Input value={scanData.storage} readOnly className="bg-neutral-100 h-8 text-xs border-neutral-200" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-neutral-500 uppercase font-bold">Location</Label>
                      <Input value={scanData.location} readOnly className="bg-neutral-100 h-8 text-xs border-neutral-200" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-neutral-700 font-medium">Inward Date *</Label>
                      <Input 
                        type="date" 
                        value={inwardDate} 
                        onChange={e => setInwardDate(e.target.value)} 
                        className="bg-white border-neutral-400 h-9 text-neutral-900" 
                      />
                    </div>
                    <div>
                      <Label className="text-neutral-700 font-medium">Quantity</Label>
                      <Input value={quantity} readOnly className="bg-neutral-100 h-9 text-neutral-500" />
                    </div>
                  </div>

                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-neutral-900 font-bold flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        IMEI Numbers
                      </Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={downloadTemplate}
                          className="border-neutral-300 text-neutral-600 hover:bg-neutral-50 h-8"
                        >
                          <FileText className="w-4 h-4 mr-1" /> Template
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => document.getElementById('csv-upload').click()}
                          className="border-neutral-300 text-neutral-600 hover:bg-neutral-50 h-8"
                        >
                          <TrendingUp className="w-4 h-4 mr-1" /> Upload CSV
                        </Button>
                        <input 
                          id="csv-upload" 
                          type="file" 
                          accept=".csv" 
                          className="hidden" 
                          onChange={handleFileUpload} 
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={handleAddRow}
                          className="bg-neutral-800 text-white h-8"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add Row
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {inwardRows.map((row, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-neutral-50 p-2 rounded border border-neutral-100">
                          <div className="w-40">
                            <Input
                              placeholder="Colour"
                              value={scanData.colour}
                              onChange={e => setScanData({ ...scanData, colour: e.target.value })}
                              className="text-sm bg-white border-neutral-400 h-8 text-neutral-900"
                            />
                          </div>
                          <div className="flex-1">
                            <Input 
                              placeholder={`IMEI 1`} 
                              value={row.imei1} 
                              onChange={e => handleRowChange(idx, 'imei1', e.target.value)} 
                              className="font-mono text-sm bg-white border-neutral-400 h-8 text-neutral-900" 
                            />
                          </div>
                          <div className="flex-1">
                            <Input 
                              placeholder="IMEI 2 (Optional)" 
                              value={row.imei2} 
                              onChange={e => handleRowChange(idx, 'imei2', e.target.value)} 
                              className="font-mono text-sm bg-white border-neutral-400 h-8 text-neutral-900" 
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveRow(idx)}
                            disabled={inwardRows.length === 1}
                            className="h-8 w-8 p-0 text-neutral-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleTransferToMagnova}
                            disabled={transferSubmitting}
                            className="h-8 px-2 border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                          >
                            Transfer to Magnova
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white mt-4 h-11" 
                    disabled={bulkSubmitting}
                  >
                    {bulkSubmitting ? 'Processing Inventory...' : 'Record Inward Entry'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleScan} className="space-y-4" data-testid="scan-form">
                  {/* IMEI Input with Lookup */}
                  <div>
                    <Label className="text-neutral-700 font-medium">IMEI Number *</Label>
                    <div className="relative">
                      <Input
                        value={scanData.imei}
                        onChange={(e) => handleImeiChange(e.target.value)}
                        required
                        className="font-mono bg-white text-neutral-900 pr-10 border-neutral-400 h-9"
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
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Lookup Result Info */}
                    {imeiLookup && (
                      <div className={`mt-2 p-3 rounded-lg text-sm ${
                        imeiLookup.found 
                          ? 'bg-emerald-50 border border-emerald-100' 
                          : 'bg-amber-50 border border-amber-100'
                      }`}>
                        {imeiLookup.found ? (
                          <div className="space-y-1">
                            {imeiLookup.in_inventory && (
                              <p className="text-emerald-800 font-medium">
                                <CheckCircle2 className="inline w-3 h-3 mr-1" />
                                In Inventory: Status - {imeiLookup.status}
                              </p>
                            )}
                            {imeiLookup.in_procurement && (
                              <>
                                <p className="text-neutral-800 font-medium">
                                  {imeiLookup.brand} {imeiLookup.model}
                                </p>
                                <p className="text-neutral-600 text-xs text-secondary-foreground/70">
                                  Vendor: {imeiLookup.vendor} • PO: {imeiLookup.po_number}
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="text-amber-800 font-medium">
                            <AlertCircle className="inline w-4 h-4 mr-1" />
                            New IMEI detected. Details will be saved on scan.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Auto-populated fields Group */}
                  {(scanData.brand || scanData.vendor) && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div>
                        <Label className="text-[10px] text-neutral-500 uppercase font-bold">Brand / Model</Label>
                        <div className="font-medium text-neutral-900 text-sm">
                          {scanData.brand} {scanData.model}
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] text-neutral-500 uppercase font-bold">Vendor / Loc</Label>
                        <div className="font-medium text-neutral-900 text-sm">
                          {scanData.vendor} • {scanData.location}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-neutral-700 font-medium">Action *</Label>
                    <Select value={scanData.action} onValueChange={(value) => setScanData({ ...scanData, action: value })} required>
                      <SelectTrigger data-testid="scan-action-select" className="bg-white text-neutral-900 border-neutral-400 h-9">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-neutral-300 z-[100]">
                        <SelectItem value="inward_nova" className="text-neutral-900">Inward Nova</SelectItem>
                        <SelectItem value="inward_magnova" className="text-neutral-900">Inward Magnova</SelectItem>
                        {showOutward && <SelectItem value="outward_nova" className="text-neutral-900">Outward Nova</SelectItem>}
                        {showOutward && <SelectItem value="outward_magnova" className="text-neutral-900">Outward Magnova</SelectItem>}
                        <SelectItem value="dispatch" className="text-neutral-900">Dispatch</SelectItem>
                        <SelectItem value="available" className="text-neutral-900">Mark Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!imeiLookup?.found && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-neutral-700 font-medium">Brand</Label>
                          <Input
                            value={scanData.brand}
                            onChange={(e) => setScanData({ ...scanData, brand: e.target.value })}
                            className="bg-white text-neutral-900 border-neutral-400 h-9"
                            placeholder="e.g. Apple"
                          />
                        </div>
                        <div>
                          <Label className="text-neutral-700 font-medium">Model</Label>
                          <Input
                            value={scanData.model}
                            onChange={(e) => setScanData({ ...scanData, model: e.target.value })}
                            className="bg-white text-neutral-900 border-neutral-400 h-9"
                            placeholder="e.g. iPhone 15"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-neutral-700 font-medium">Vendor</Label>
                          <Select 
                            value={scanData.vendor} 
                            onValueChange={(value) => setScanData({ ...scanData, vendor: value })} 
                          >
                            <SelectTrigger className="bg-white text-neutral-900 border-neutral-400 h-9">
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-neutral-300">
                              {vendors.map((v) => <SelectItem key={v} value={v} className="text-neutral-900">{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-neutral-700 font-medium">Location</Label>
                          <Select 
                            value={scanData.location} 
                            onValueChange={(value) => setScanData({ ...scanData, location: value })} 
                          >
                            <SelectTrigger className="bg-white text-neutral-900 border-neutral-400 h-9">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-neutral-300">
                              {locations.map((l) => <SelectItem key={l} value={l} className="text-neutral-900">{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11" 
                    disabled={!scanData.imei || !scanData.action || !scanData.location}
                  >
                    Update Inventory Status
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {showDashboard && (
          <div className="mb-6 space-y-5" data-testid="inventory-dashboard">
            {/* Simple Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-neutral-900">Inventory Dashboard</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-neutral-700">Total: <span className="text-neutral-600">{filteredInventory.length}</span></span>
                <span className="text-neutral-300">|</span>
                <span className="font-semibold text-neutral-700">Locations: <span className="text-cyan-600">{inventoryStats.locationCount}</span></span>
              </div>
            </div>

            {/* Compact Location Cards */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[500px] overflow-y-auto pr-2">
              {dashboardData.locations.map((locationEntry) => {
                const models = Array.from(locationEntry.models.values());
                return (
                  <div
                    key={locationEntry.location}
                    className="bg-white border border-neutral-300 rounded-md overflow-hidden hover:shadow-sm transition-shadow h-[180px] flex flex-col"
                    data-testid={`dashboard-card-${locationEntry.location}`}
                  >
                    {/* Simple Header */}
                    <div className="text-neutral-700 px-2 py-1 flex items-center justify-between" style={{ backgroundColor: '#D9E2E8' }}>
                      <span className="font-medium text-xs">{locationEntry.location}</span>
                      <span className="bg-neutral-700 text-white px-1.5 py-0.5 rounded text-xs font-semibold">{locationEntry.total}</span>
                    </div>

                    {/* Compact Table */}
                    <div className="overflow-x-auto overflow-y-auto flex-1">
                      <table className="w-full text-xs h-full">
                        <thead className="sticky top-0 bg-neutral-100 border-b border-neutral-300">
                          <tr>
                            <th className="px-1.5 py-1 text-left font-medium text-neutral-600 text-xs">Model</th>
                            <th className="px-1.5 py-1 text-center font-medium text-neutral-600 text-xs">Stor</th>
                            <th className="px-1.5 py-1 text-left font-medium text-neutral-600 text-xs">Color</th>
                            <th className="px-1.5 py-1 text-right font-medium text-neutral-600 text-xs">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {models.map((modelEntry) => {
                            const rows = buildRows(modelEntry);
                            return rows.map((row, rowIdx) => (
                              <tr 
                                key={`${modelEntry.model}-${rowIdx}`}
                                className={row.isTotalRow ? 'bg-neutral-50 font-semibold' : ''}
                              >
                                {row.showModel && (
                                  <td 
                                    rowSpan={row.modelRowSpan} 
                                    className="px-1.5 py-1 text-neutral-700 font-medium align-top border-r border-neutral-200 text-xs"
                                  >
                                    {row.model}
                                  </td>
                                )}
                                {row.showStorage && !row.isModelTotal && (
                                  <td 
                                    rowSpan={row.storageRowSpan} 
                                    className="px-1.5 py-1 text-center text-neutral-600 align-top border-r border-neutral-200 text-xs"
                                  >
                                    {row.storage}
                                  </td>
                                )}
                                {row.isModelTotal && (
                                  <td colSpan="2" className="px-1.5 py-1 text-center text-neutral-600 font-semibold border-r border-neutral-200 text-xs">
                                    Total
                                  </td>
                                )}
                                {!row.isModelTotal && (
                                  <td className="px-1.5 py-1 text-neutral-600 text-xs">
                                    {row.colour}
                                  </td>
                                )}
                                <td className={`px-1.5 py-1 text-right text-xs ${row.isTotalRow ? 'text-neutral-800 font-bold' : 'text-neutral-600'}`}>
                                  {row.qty}
                                </td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Total Card - Simplified */}
              {dashboardData.total && (
                <div
                  className="bg-white border-2 border-neutral-400 rounded-md overflow-hidden hover:shadow-sm transition-shadow h-[180px] flex flex-col"
                  data-testid="dashboard-card-Total"
                >
                  {/* Simple Header */}
                  <div className="bg-neutral-700 text-white px-2 py-1 flex items-center justify-between">
                    <span className="font-medium text-xs">Total</span>
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-semibold">{dashboardData.total.total}</span>
                  </div>

                  {/* Compact Table */}
                  <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-xs h-full">
                      <thead className="sticky top-0 bg-neutral-100 border-b border-neutral-300">
                        <tr>
                          <th className="px-1.5 py-1 text-left font-medium text-neutral-600 text-xs">Model</th>
                          <th className="px-1.5 py-1 text-center font-medium text-neutral-600 text-xs">Stor</th>
                          <th className="px-1.5 py-1 text-left font-medium text-neutral-600 text-xs">Color</th>
                          <th className="px-1.5 py-1 text-right font-medium text-neutral-600 text-xs">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {Array.from(dashboardData.total.models.values()).map((modelEntry) => {
                          const rows = buildRows(modelEntry);
                          return rows.map((row, rowIdx) => (
                            <tr 
                              key={`total-${modelEntry.model}-${rowIdx}`}
                              className={row.isTotalRow ? 'bg-neutral-50 font-semibold' : ''}
                            >
                              {row.showModel && (
                                <td 
                                  rowSpan={row.modelRowSpan} 
                                  className="px-1.5 py-1 text-neutral-700 font-medium align-top border-r border-neutral-200 text-xs"
                                >
                                  {row.model}
                                </td>
                              )}
                              {row.showStorage && !row.isModelTotal && (
                                <td 
                                  rowSpan={row.storageRowSpan} 
                                  className="px-1.5 py-1 text-center text-neutral-600 align-top border-r border-neutral-200 text-xs"
                                >
                                  {row.storage}
                                </td>
                              )}
                              {row.isModelTotal && (
                                <td colSpan="2" className="px-1.5 py-1 text-center text-neutral-600 font-semibold border-r border-neutral-200 text-xs">
                                  Total
                                </td>
                              )}
                              {!row.isModelTotal && (
                                <td className="px-1.5 py-1 text-neutral-600 text-xs">
                                  {row.colour}
                                </td>
                              )}
                              <td className={`px-1.5 py-1 text-right text-xs ${row.isTotalRow ? 'text-neutral-800 font-bold' : 'text-neutral-600'}`}>
                                {row.qty}
                              </td>
                            </tr>
                          ));
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Old sections hidden */}
            <div className="space-y-4 hidden">
              <div>
                <h3 className="font-semibold text-neutral-900 text-lg">Detailed Inventory by Location</h3>
                <p className="text-sm text-neutral-600 mt-1">Breakdown by model, storage capacity, and color</p>
              </div>
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {[...dashboardData.locations, ...(dashboardData.total ? [dashboardData.total] : [])].map((locationEntry) => {
                  return (
                    <div
                      key={locationEntry.location}
                      className="border border-neutral-200/60 rounded-lg overflow-hidden shadow-sm bg-white hover:shadow-md transition-all"
                      data-testid={`dashboard-card-${locationEntry.location}`}
                    >
                      <div className="bg-gradient-to-r from-neutral-800 to-neutral-700 text-white px-5 py-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-base">{locationEntry.location}</span>
                          <span className="bg-white/20 px-3 py-1 rounded-md text-sm font-semibold">{locationEntry.total}</span>
                        </div>
                      </div>
                      <div className="bg-neutral-50/80 grid grid-cols-4 gap-px text-xs font-semibold text-neutral-700 border-b border-neutral-200/60">
                        <div className="bg-neutral-50 px-4 py-3">Model</div>
                        <div className="bg-neutral-50 px-4 py-3">Storage</div>
                        <div className="bg-neutral-50 px-4 py-3">Colour</div>
                        <div className="bg-neutral-50 px-4 py-3 text-right">Qty</div>
                      </div>
                      <div className="max-h-72 overflow-auto divide-y divide-neutral-100">
                        <table className="w-full text-xs table-fixed">
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
                                  className={`${row.isTotalRow ? 'bg-neutral-50 font-semibold' : 'hover:bg-neutral-50/50'} transition-colors`}
                                >
                                  {row.showModel && (
                                    <td
                                      className="bg-neutral-50 text-neutral-900 px-4 py-3 align-middle font-semibold text-sm"
                                      rowSpan={row.modelRowSpan}
                                    >
                                      <span className="block truncate" title={row.model}>{row.model}</span>
                                    </td>
                                  )}
                                  {row.showStorage && (
                                    <td
                                      className="bg-neutral-50 text-neutral-900 px-4 py-3 align-middle font-medium text-sm"
                                      rowSpan={row.storageRowSpan}
                                    >
                                      <span className="block truncate" title={row.storage}>{row.storage}</span>
                                    </td>
                                  )}
                                  {!row.showStorage && <td className="px-4 py-3 bg-white"></td>}
                                  <td className={`px-4 py-3 ${row.isTotalRow ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>
                                    <span className="block truncate" title={row.colour}>{row.colour}</span>
                                  </td>
                                  <td className={`px-4 py-3 text-right font-medium ${row.isTotalRow ? 'text-neutral-900' : 'text-neutral-700'}`}>
                                    {row.qty}
                                  </td>
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-5 py-3 text-sm font-semibold text-neutral-800 bg-neutral-50 border-t border-neutral-200/60 flex items-center justify-between">
                        <span>Location Total</span>
                        <span className="bg-teal-600 text-white px-3 py-1 rounded-md font-semibold">{locationEntry.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {showCharts && (
          <div className="mb-8 space-y-6" data-testid="inventory-charts">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Inventory Analytics</h2>
                <p className="text-sm text-neutral-500 mt-1">Visual breakdown by location, model, and colour</p>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-200">
                <Package className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-700">Total: {filteredInventory.length} IMEIs</span>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Bar Chart - Locations */}
              <div className="bg-white rounded-lg shadow-md border border-neutral-300 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="px-5 py-4 text-neutral-700" style={{ backgroundColor: '#D9E2E8' }}>
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Top Locations
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  {chartData.locations.length === 0 && (
                    <div className="text-sm text-neutral-500 text-center py-8">No data available</div>
                  )}
                  {chartData.locations.map((item, idx) => {
                    const maxValue = chartData.locations[0]?.value || 1;
                    const width = Math.round((item.value / maxValue) * 100);
                    return (
                      <div key={item.label} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                              idx === 0 ? 'bg-amber-100 text-amber-700' :
                              idx === 1 ? 'bg-neutral-100 text-neutral-700' :
                              idx === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-neutral-50 text-neutral-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-neutral-800 truncate" title={item.label}>{item.label}</span>
                          </div>
                          <span className="text-sm font-bold text-neutral-900">{item.value}</span>
                        </div>
                        <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-80"
                            style={{
                              width: `${width}%`,
                              backgroundColor: chartPalette[idx % chartPalette.length],
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pie Chart - Models */}
              <div className="bg-white rounded-lg shadow-md border border-neutral-300 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="px-5 py-4 text-neutral-700" style={{ backgroundColor: '#D9E2E8' }}>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Top Models
                  </h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-center gap-6">
                    {/* Donut Chart */}
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-neutral-100"
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
                            : '#f1f5f9',
                        }}
                      ></div>
                      <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-neutral-900">{filteredInventory.length}</div>
                          <div className="text-xs text-neutral-500">Total</div>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2">
                      {chartData.models.length === 0 && <div className="text-sm text-neutral-500">No data</div>}
                      {chartData.models.map((item, idx) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: chartPalette[idx % chartPalette.length] }}></span>
                          <span className="text-xs font-medium text-neutral-700 truncate max-w-24" title={item.label}>{item.label}</span>
                          <span className="text-xs font-bold text-neutral-900 ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Doughnut Chart - Colours */}
              <div className="bg-white rounded-lg shadow-md border border-neutral-300 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="px-5 py-4 text-neutral-700" style={{ backgroundColor: '#D9E2E8' }}>
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Top Colours
                  </h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-center gap-6">
                    {/* Ring Chart */}
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-neutral-100"
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
                            : '#f1f5f9',
                        }}
                      ></div>
                      <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-neutral-900">{chartData.colours.length}</div>
                          <div className="text-xs text-neutral-500">Colours</div>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2">
                      {chartData.colours.length === 0 && <div className="text-sm text-neutral-500">No data</div>}
                      {chartData.colours.map((item, idx) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: chartPalette[idx % chartPalette.length] }}></span>
                          <span className="text-xs font-medium text-neutral-700 truncate max-w-24" title={item.label}>{item.label}</span>
                          <span className="text-xs font-bold text-neutral-900 ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative max-w-xl">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 pointer-events-none z-10" />
            <Input
              placeholder="Search by IMEI, model or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
              data-testid="inventory-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56 bg-white" data-testid="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Procured">Procured</SelectItem>
            <SelectItem value="Inward Nova">Inward Nova</SelectItem>
            <SelectItem value="Inward Magnova">Inward Magnova</SelectItem>
            {showOutward && <SelectItem value="Outward Nova">Outward Nova</SelectItem>}
            {showOutward && <SelectItem value="Outward Magnova">Outward Magnova</SelectItem>}
            <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Reserved">Reserved</SelectItem>
              <SelectItem value="Dispatched">Dispatched</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-6">
          {[
            ...(showInward ? [{ label: 'Inward', groups: groupedInward }] : []),
            ...(showOutward ? [{ label: 'Outward', groups: groupedOutward }] : []),
          ].map((section) => (
            <div key={section.label} className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900">{section.label}</h3>
                <span className="text-xs text-neutral-500">Total: {section.groups.reduce((sum, [, items]) => sum + items.length, 0)}</span>
              </div>

              {section.groups.length === 0 ? (
                <div className="px-4 py-6 text-center text-neutral-500 text-xs">No {section.label.toLowerCase()} items found</div>
              ) : (
                <div className="space-y-3 p-3">
                  {section.groups.map(([location, items]) => (
                    <div key={`${section.label}-${location}`} className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {warehouseLabel && section.label === 'Outward' && (
                            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{warehouseLabel}</span>
                          )}
                          <span className="text-sm font-semibold text-neutral-800">{location}</span>
                        </div>
                        <span className="text-xs text-neutral-500">Total: {items.length} items</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-900" style={{ backgroundColor: '#EEF2F2' }}>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Brand</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Model</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Storage</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Colour</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">QTY</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">IMEI 1</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">IMEI 2</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Inward Date</th>
                              {isAdmin && <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 ? (
                              <tr>
                                <td colSpan={isAdmin ? 7 : 6} className="px-3 py-4 text-center text-neutral-400 text-xs">
                                  No items in this location
                                </td>
                              </tr>
                            ) : (
                              items.map((item) => (
                                <tr key={item.imei} className="table-row border-b border-neutral-100 hover:bg-neutral-50">
                                  <td className="px-3 py-2 text-xs text-neutral-900">{item.brand || '-'}</td>
                                  <td className="px-3 py-2 text-xs text-neutral-900">{item.model || item.device_model || '-'}</td>
                                  <td className="px-3 py-2 text-xs text-neutral-600">{extractStorage(item.storage || item.capacity || item.device_model)}</td>
                                  <td className="px-3 py-2 text-xs text-neutral-600">{item.colour || '-'}</td>
                                  <td className="px-3 py-2 text-xs text-neutral-900">1</td>
                                  <td className="px-3 py-2 text-xs font-mono font-medium text-neutral-900">{item.imei}</td>
                                  <td className="px-3 py-2 text-xs font-mono text-neutral-600">{item.imei2 || '-'}</td>
                                  <td className="px-3 py-2 text-xs text-neutral-600">
                                    {item.inward_nova_date ? new Date(item.inward_nova_date).toLocaleDateString() : 
                                     item.inward_magnova_date ? new Date(item.inward_magnova_date).toLocaleDateString() : '-'}
                                  </td>
                                  {isAdmin && (
                                    <td className="px-3 py-2 text-xs">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(item.imei)}
                                        className="text-neutral-800 hover:text-neutral-900 hover:bg-neutral-100 h-6 w-6 p-0"
                                        data-testid="delete-inventory-button"
                                      >
                                        <Trash2 className="w-3 h-3" />
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
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};
