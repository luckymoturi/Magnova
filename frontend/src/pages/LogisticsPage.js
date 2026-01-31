import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Package } from 'lucide-react';

export const LogisticsPage = () => {
  const [shipments, setShipments] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    po_number: '',
    transporter_name: '',
    vehicle_number: '',
    from_location: '',
    to_location: '',
    pickup_date: new Date().toISOString().split('T')[0],
    expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    imei_list: '',
  });

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const response = await api.get('/logistics/shipments');
      setShipments(response.data);
    } catch (error) {
      toast.error('Failed to fetch shipments');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const imeiArray = formData.imei_list.split(',').map(i => i.trim()).filter(i => i);
      await api.post('/logistics/shipments', {
        ...formData,
        imei_list: imeiArray,
        pickup_date: new Date(formData.pickup_date).toISOString(),
        expected_delivery: new Date(formData.expected_delivery).toISOString(),
      });
      toast.success('Shipment created successfully');
      setDialogOpen(false);
      setFormData({
        po_number: '',
        transporter_name: '',
        vehicle_number: '',
        from_location: '',
        to_location: '',
        pickup_date: new Date().toISOString().split('T')[0],
        expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        imei_list: '',
      });
      fetchShipments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create shipment');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'In Transit': 'bg-blue-50 text-blue-700 border-blue-200',
      'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Pending': 'bg-orange-50 text-orange-700 border-orange-300',
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <Layout>
      <div data-testid="logistics-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Logistics & Shipments</h1>
            <p className="text-slate-600 mt-1">Track shipments and e-way bills</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-shipment-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Shipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Shipment</DialogTitle>
                <DialogDescription>Record new shipment details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4" data-testid="shipment-form">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>PO Number</Label>
                    <Input
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      required
                      className="font-mono"
                      data-testid="po-input"
                    />
                  </div>
                  <div>
                    <Label>Transporter Name</Label>
                    <Input
                      value={formData.transporter_name}
                      onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                      required
                      data-testid="transporter-input"
                    />
                  </div>
                  <div>
                    <Label>Vehicle Number</Label>
                    <Input
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                      required
                      data-testid="vehicle-input"
                    />
                  </div>
                  <div>
                    <Label>From Location</Label>
                    <Input
                      value={formData.from_location}
                      onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                      required
                      data-testid="from-location-input"
                    />
                  </div>
                  <div>
                    <Label>To Location</Label>
                    <Input
                      value={formData.to_location}
                      onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                      required
                      data-testid="to-location-input"
                    />
                  </div>
                  <div>
                    <Label>Pickup Date</Label>
                    <Input
                      type="date"
                      value={formData.pickup_date}
                      onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                      required
                      data-testid="pickup-date-input"
                    />
                  </div>
                  <div>
                    <Label>Expected Delivery</Label>
                    <Input
                      type="date"
                      value={formData.expected_delivery}
                      onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                      required
                      data-testid="delivery-date-input"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>IMEI List (comma-separated)</Label>
                    <Input
                      value={formData.imei_list}
                      onChange={(e) => setFormData({ ...formData, imei_list: e.target.value })}
                      placeholder="356789012345678, 356789012345679"
                      required
                      className="font-mono"
                      data-testid="imei-list-input"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" data-testid="submit-shipment">
                  Create Shipment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="shipments-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transporter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pickup Date</th>
                </tr>
              </thead>
              <tbody>
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      No shipments found
                    </td>
                  </tr>
                ) : (
                  shipments.map((shipment) => (
                    <tr key={shipment.shipment_id} className="table-row border-b border-slate-100" data-testid="shipment-row">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">{shipment.po_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{shipment.transporter_name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{shipment.vehicle_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{shipment.from_location} → {shipment.to_location}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`status-badge ${getStatusColor(shipment.status)}`}>{shipment.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{shipment.imei_list.length} items</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(shipment.pickup_date).toLocaleDateString()}</td>
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