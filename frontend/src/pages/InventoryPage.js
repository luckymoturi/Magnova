import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Scan, Search } from 'lucide-react';

export const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanData, setScanData] = useState({ imei: '', action: '', location: '', organization: 'Nova' });

  useEffect(() => {
    fetchInventory();
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
      await api.post('/inventory/scan', scanData);
      toast.success('IMEI scanned successfully');
      setDialogOpen(false);
      setScanData({ imei: '', action: '', location: '', organization: 'Nova' });
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to scan IMEI');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Procured: 'bg-blue-50 text-blue-700 border-blue-200',
      'Inward Nova': 'bg-purple-50 text-purple-700 border-purple-200',
      'Inward Magnova': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      Available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Reserved: 'bg-orange-50 text-orange-700 border-orange-300',
      Dispatched: 'bg-orange-50 text-orange-700 border-orange-200',
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
              <Button data-testid="scan-imei-button">
                <Scan className="w-4 h-4 mr-2" />
                Scan IMEI
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Scan IMEI</DialogTitle>
                <DialogDescription>Update IMEI status and location</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleScan} className="space-y-4" data-testid="scan-form">
                <div>
                  <Label>IMEI Number</Label>
                  <Input
                    value={scanData.imei}
                    onChange={(e) => setScanData({ ...scanData, imei: e.target.value })}
                    required
                    className="font-mono"
                    data-testid="scan-imei-input"
                  />
                </div>
                <div>
                  <Label>Action</Label>
                  <Select value={scanData.action} onValueChange={(value) => setScanData({ ...scanData, action: value })} required>
                    <SelectTrigger data-testid="scan-action-select">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inward_nova">Inward Nova</SelectItem>
                      <SelectItem value="inward_magnova">Inward Magnova</SelectItem>
                      <SelectItem value="dispatch">Dispatch</SelectItem>
                      <SelectItem value="available">Mark Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={scanData.location}
                    onChange={(e) => setScanData({ ...scanData, location: e.target.value })}
                    required
                    data-testid="scan-location-input"
                  />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Select value={scanData.organization} onValueChange={(value) => setScanData({ ...scanData, organization: value })} required>
                    <SelectTrigger data-testid="scan-org-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nova">Nova</SelectItem>
                      <SelectItem value="Magnova">Magnova</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" data-testid="submit-scan">
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
              className="pl-10"
              data-testid="inventory-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Procured">Procured</SelectItem>
              <SelectItem value="Inward Nova">Inward Nova</SelectItem>
              <SelectItem value="Inward Magnova">Inward Magnova</SelectItem>
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
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IMEI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Device Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No inventory items found
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.imei} className="table-row border-b border-slate-100" data-testid="inventory-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">{item.imei}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{item.device_model}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`status-badge ${getStatusColor(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{item.organization}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.current_location}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(item.updated_at).toLocaleDateString()}</td>
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
