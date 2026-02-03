import React, { useEffect, useState } from 'react';
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
          // Auto-populate fields from lookup data
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
          }
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Lookup error:', error);
        }
        setImeiLookup({ found: false });
      } finally {
        setLookupLoading(false);
      }
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/scan', {
        imei: scanData.imei,
        action: scanData.action,
        location: scanData.location,
        organization: 'Nova',
        vendor: scanData.vendor,
      });
      toast.success('IMEI scanned successfully');
      setDialogOpen(false);
      setScanData({ imei: '', action: '', location: '', vendor: '', brand: '', model: '', colour: '' });
      setImeiLookup(null);
      refreshAfterInventoryChange(); // Trigger refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to scan IMEI');
    }
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
      Procured: 'bg-blue-50 text-blue-700 border-blue-200',
      'Inward Nova': 'bg-purple-50 text-purple-700 border-purple-200',
      'Inward Magnova': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Outward Nova': 'bg-orange-50 text-orange-700 border-orange-200',
      'Outward Magnova': 'bg-orange-50 text-orange-700 border-orange-200',
      Available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Reserved: 'bg-orange-50 text-orange-700 border-orange-300',
      Dispatched: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <Layout>
      <div data-testid="inventory-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">IMEI Inventory</h1>
            <p className="text-slate-600 mt-1">Track device inventory with IMEI-level visibility</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="scan-imei-button" className="bg-magnova-blue hover:bg-magnova-dark-blue">
                <Scan className="w-4 h-4 mr-2" />
                Scan IMEI
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-magnova-orange">Scan IMEI</DialogTitle>
                <DialogDescription className="text-slate-600">Enter IMEI to auto-populate details and update status</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleScan} className="space-y-4" data-testid="scan-form">
                {/* IMEI Input with Lookup */}
                <div>
                  <Label className="text-slate-700">IMEI Number *</Label>
                  <div className="relative">
                    <Input
                      value={scanData.imei}
                      onChange={(e) => handleImeiChange(e.target.value)}
                      required
                      className="font-mono bg-white text-slate-900 pr-10"
                      data-testid="scan-imei-input"
                      placeholder="Enter IMEI number"
                    />
                    {lookupLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-magnova-blue border-t-transparent rounded-full"></div>
                      </div>
                    )}
                    {!lookupLoading && imeiLookup && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {imeiLookup.found ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Lookup Result Info */}
                  {imeiLookup && (
                    <div className={`mt-2 p-3 rounded-lg text-sm ${
                      imeiLookup.found 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : 'bg-orange-50 border border-orange-200'
                    }`}>
                      {imeiLookup.found ? (
                        <div className="space-y-1">
                          {imeiLookup.in_inventory && (
                            <p className="text-emerald-700">
                              <span className="font-medium">In Inventory:</span> Status - {imeiLookup.status}
                            </p>
                          )}
                          {imeiLookup.in_procurement && (
                            <>
                              <p className="text-emerald-700">
                                <span className="font-medium">From Procurement:</span> {imeiLookup.brand} {imeiLookup.model}
                              </p>
                              <p className="text-emerald-600">
                                <span className="font-medium">Vendor:</span> {imeiLookup.vendor} | 
                                <span className="font-medium ml-2">PO:</span> {imeiLookup.po_number}
                              </p>
                              {imeiLookup.colour && (
                                <p className="text-emerald-600">
                                  <span className="font-medium">Colour:</span> {imeiLookup.colour}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-orange-700">
                          <AlertCircle className="inline w-4 h-4 mr-1" />
                          IMEI not found. Please add this IMEI through Procurement first.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Auto-populated fields - Brand, Model, Colour */}
                {imeiLookup?.found && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <Label className="text-slate-500 text-xs">Brand</Label>
                      <Input
                        value={scanData.brand || '-'}
                        readOnly
                        className="font-medium bg-white text-slate-900 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs">Model</Label>
                      <Input
                        value={scanData.model || '-'}
                        readOnly
                        className="font-medium bg-white text-slate-900 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs">Colour</Label>
                      <Input
                        value={scanData.colour || '-'}
                        readOnly
                        className="font-medium bg-white text-slate-900 h-9"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-slate-700">Action *</Label>
                  <Select value={scanData.action} onValueChange={(value) => setScanData({ ...scanData, action: value })} required>
                    <SelectTrigger data-testid="scan-action-select" className="bg-white text-slate-900">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700">Vendor {imeiLookup?.found ? '(Auto-populated)' : '*'}</Label>
                    <Select 
                      value={scanData.vendor} 
                      onValueChange={(value) => setScanData({ ...scanData, vendor: value })} 
                      required={!imeiLookup?.found}
                    >
                      <SelectTrigger className={`text-slate-900 ${imeiLookup?.found && scanData.vendor ? 'bg-slate-100' : 'bg-white'}`}>
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
                    <Label className="text-slate-700">Location {imeiLookup?.found ? '(Auto-populated)' : '*'}</Label>
                    <Select 
                      value={scanData.location} 
                      onValueChange={(value) => setScanData({ ...scanData, location: value })} 
                      required={!imeiLookup?.found}
                    >
                      <SelectTrigger className={`text-slate-900 ${imeiLookup?.found && scanData.location ? 'bg-slate-100' : 'bg-white'}`} data-testid="scan-location-select">
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
                  className="w-full bg-magnova-blue hover:bg-magnova-dark-blue" 
                  data-testid="submit-scan"
                  disabled={!imeiLookup?.found && scanData.imei.length >= 10}
                >
                  {imeiLookup?.found ? 'Scan & Update' : 'Add to Inventory & Update'}
                </Button>
                
                {!imeiLookup?.found && scanData.imei.length >= 10 && (
                  <p className="text-center text-sm text-orange-600">
                    IMEI must be added through Procurement first
                  </p>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
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

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="inventory-table">
              <thead>
                <tr className="bg-magnova-blue text-white">
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
                    <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                      No inventory items found
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.imei} className="table-row border-b border-slate-100 hover:bg-slate-50" data-testid="inventory-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">{item.imei}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{item.brand || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{item.model || item.device_model || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.colour || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`status-badge ${getStatusColor(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.current_location}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(item.updated_at).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.imei)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
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
