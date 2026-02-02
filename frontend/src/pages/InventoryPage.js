import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Scan, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [locations, setLocations] = useState([]);
  const [vendors, setVendors] = useState([]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [scanData, setScanData] = useState({
    imei: '',
    action: '',
    location: '',
    organization: 'Nova',
    vendor: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchPOData();
  }, []);

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
          item.device_model.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }
    setFilteredInventory(filtered);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/scan', {
        imei: scanData.imei,
        action: scanData.action,
        location: scanData.location,
        organization: scanData.organization,
        vendor: scanData.vendor,
      });
      toast.success('IMEI scanned successfully');
      setDialogOpen(false);
      setScanData({ imei: '', action: '', location: '', organization: 'Nova', vendor: '' });
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to scan IMEI');
    }
  };

  const handleDelete = async (imei) => {
    if (!window.confirm(`Are you sure you want to delete IMEI ${imei}?`)) return;
    try {
      await api.delete(`/inventory/${imei}`);
      toast.success('Inventory item deleted successfully');
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete item');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Procured: 'bg-blue-50 text-blue-700 border-blue-200',
      'Inward Nova': 'bg-purple-50 text-purple-700 border-purple-200',
      'Inward Magnova': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Outward Nova': 'bg-orange-50 text-orange-700 border-orange-200',
      'Outward Magnova': 'bg-amber-50 text-amber-700 border-amber-200',
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="scan-imei-button" className="bg-magnova-blue hover:bg-magnova-dark-blue">
                <Scan className="w-4 h-4 mr-2" />
                Scan IMEI
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-magnova-orange">Scan IMEI</DialogTitle>
                <DialogDescription className="text-slate-600">Update IMEI status and location</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleScan} className="space-y-4" data-testid="scan-form">
                <div>
                  <Label className="text-slate-700">IMEI Number *</Label>
                  <Input
                    value={scanData.imei}
                    onChange={(e) => setScanData({ ...scanData, imei: e.target.value })}
                    required
                    className="font-mono bg-white text-slate-900"
                    data-testid="scan-imei-input"
                    placeholder="Enter IMEI number"
                  />
                </div>
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
                <div>
                  <Label className="text-slate-700">Vendor *</Label>
                  <Select value={scanData.vendor} onValueChange={(value) => setScanData({ ...scanData, vendor: value })} required>
                    <SelectTrigger className="bg-white text-slate-900">
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
                  <Label className="text-slate-700">Location *</Label>
                  <Select value={scanData.location} onValueChange={(value) => setScanData({ ...scanData, location: value })} required>
                    <SelectTrigger className="bg-white text-slate-900" data-testid="scan-location-select">
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
                <div>
                  <Label className="text-slate-700">Organization *</Label>
                  <Select value={scanData.organization} onValueChange={(value) => setScanData({ ...scanData, organization: value })} required>
                    <SelectTrigger data-testid="scan-org-select" className="bg-white text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Nova">Nova</SelectItem>
                      <SelectItem value="Magnova">Magnova</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-magnova-blue hover:bg-magnova-dark-blue" data-testid="submit-scan">
                  Scan & Update
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by IMEI or model..."
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Device Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Updated</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                      No inventory items found
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.imei} className="table-row border-b border-slate-100 hover:bg-slate-50" data-testid="inventory-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">{item.imei}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{item.device_model}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`status-badge ${getStatusColor(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{item.organization}</td>
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
