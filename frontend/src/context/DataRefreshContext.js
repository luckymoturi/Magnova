import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import api from '../utils/api';

const DataRefreshContext = createContext();

export const useDataRefresh = () => {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error('useDataRefresh must be used within DataRefreshProvider');
  }
  return context;
};

export const DataRefreshProvider = ({ children }) => {
  // Track the last refresh timestamp for each data type
  const [refreshTimestamps, setRefreshTimestamps] = useState({
    purchaseOrders: Date.now(),
    procurement: Date.now(),
    payments: Date.now(),
    logistics: Date.now(),
    inventory: Date.now(),
    invoices: Date.now(),
    dashboard: Date.now(),
    reports: Date.now(),
  });

  // Base Data for derivation
  const [pos, setPOs] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [dbNotifications, setDbNotifications] = useState([]);

  // Fetch data on relevant timestamp changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [poRes, procRes, payRes, shipRes, notifRes] = await Promise.all([
          api.get('/purchase-orders'),
          api.get('/procurement'),
          api.get('/payments'),
          api.get('/logistics/shipments'),
          api.get('/notifications').catch(() => ({ data: [] }))
        ]);
        setPOs(poRes.data);
        setProcurements(procRes.data);
        setPayments(payRes.data);
        setShipments(shipRes.data);
        setDbNotifications(notifRes.data);
      } catch (error) {
        console.error('Error fetching data for notifications:', error);
      }
    };
    fetchData();
  }, [refreshTimestamps.purchaseOrders, refreshTimestamps.procurement, refreshTimestamps.payments, refreshTimestamps.logistics]);

  // ========== WORKFLOW NOTIFICATIONS (Ephemeral) ==========
  const [pendingInternalPayments, setPendingInternalPayments] = useState([]);
  const [pendingExternalPayments, setPendingExternalPayments] = useState([]);
  const [pendingProcurements, setPendingProcurements] = useState([]);
  const [pendingLogistics, setPendingLogistics] = useState([]);
  const [pendingInventory, setPendingInventory] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);

  // ========== STAGE 1: PO Approved → Procurement (Purchase Team) ==========
  const derivedProcurements = useMemo(() => {
    return pos
      .filter(po => po.approval_status === 'Approved' || po.status === 'Approved')
      .filter(po => !procurements.some(p => p.po_number === po.po_number))
      .map(po => ({
        po_number: po.po_number,
        brand: po.items?.[0]?.brand || '',
        model: po.items?.[0]?.model || '',
        vendor: po.items?.[0]?.vendor || '',
        location: po.items?.[0]?.location || '',
        isDerived: true,
        type: 'procurement'
      }));
  }, [pos, procurements]);

  const allProcurements = useMemo(() => {
    const ephemeral = pendingProcurements.filter(p => !derivedProcurements.some(d => d.po_number === p.po_number));
    return [...derivedProcurements, ...ephemeral];
  }, [derivedProcurements, pendingProcurements]);

  // ========== STAGE 2: Procurement Done → Internal Payment (Internal Payments Team) ==========
  const derivedInternalPayments = useMemo(() => {
    return pos
      .filter(po => po.approval_status === 'Approved' || po.status === 'Approved')
      .filter(po => procurements.some(p => p.po_number === po.po_number))
      .filter(po => !payments.some(pay => pay.po_number === po.po_number && pay.payment_type === 'internal'))
      .map(po => ({
        po_number: po.po_number,
        brand: po.items?.[0]?.brand || '',
        model: po.items?.[0]?.model || '',
        vendor: po.items?.[0]?.vendor || '',
        total_value: po.total_value,
        isDerived: true,
        type: 'internal_payment'
      }));
  }, [pos, procurements, payments]);

  const allInternalPayments = useMemo(() => {
    const ephemeral = pendingInternalPayments.filter(p => !derivedInternalPayments.some(d => d.po_number === p.po_number));
    return [...derivedInternalPayments, ...ephemeral];
  }, [derivedInternalPayments, pendingInternalPayments]);

  // ========== STAGE 3: Internal Payment Done → External Payment (External Payments Team) ==========
  const derivedExternalPayments = useMemo(() => {
    return pos
      .filter(po => payments.some(pay => pay.po_number === po.po_number && pay.payment_type === 'internal'))
      .filter(po => !payments.some(pay => pay.po_number === po.po_number && pay.payment_type === 'external'))
      .map(po => ({
        po_number: po.po_number,
        brand: po.items?.[0]?.brand || '',
        model: po.items?.[0]?.model || '',
        vendor: po.items?.[0]?.vendor || '',
        isDerived: true,
        type: 'external_payment'
      }));
  }, [pos, payments]);

  const allExternalPayments = useMemo(() => {
    const ephemeral = pendingExternalPayments.filter(p => !derivedExternalPayments.some(d => d.po_number === p.po_number));
    return [...derivedExternalPayments, ...ephemeral];
  }, [derivedExternalPayments, pendingExternalPayments]);

  // ========== STAGE 4: External Payment Done → Logistics (Logistics Team) ==========
  const derivedLogisticsNotifications = useMemo(() => {
    return pos
      .filter(po => (po.approval_status === 'Approved' || po.status === 'Approved'))
      .filter(po => payments.some(pay => pay.po_number === po.po_number && pay.payment_type === 'external'))
      .filter(po => !shipments.some(ship => ship.po_number === po.po_number))
      .map(po => ({
        po_number: po.po_number,
        brand: po.items?.[0]?.brand || '',
        model: po.items?.[0]?.model || '',
        vendor: po.items?.[0]?.vendor || '',
        location: po.items?.[0]?.location || '',
        isDerived: true,
        type: 'logistics'
      }));
  }, [pos, payments, shipments]);

  const allLogisticsNotifications = useMemo(() => {
    const ephemeral = pendingLogistics.filter(p => !derivedLogisticsNotifications.some(d => d.po_number === p.po_number));
    return [...derivedLogisticsNotifications, ...ephemeral];
  }, [derivedLogisticsNotifications, pendingLogistics]);

  // ========== STAGE 5: Logistics → Inventory ==========
  const addInventoryNotification = useCallback((shipment) => {
    setPendingInventory(prev => {
      if (prev.some(p => p.po_number === shipment.po_number && p.shipment_id === shipment.shipment_id)) return prev;
      return [...prev, { ...shipment, timestamp: Date.now(), stage: 'inventory', type: 'inventory' }];
    });
  }, []);

  const clearInventoryNotification = useCallback((poNumber, shipmentId) => {
    setPendingInventory(prev => prev.filter(p => !(p.po_number === poNumber && (shipmentId ? p.shipment_id === shipmentId : true))));
  }, []);

  // ========== STAGE 6: Inventory → Invoice ==========
  const addInvoiceNotification = useCallback((inventory) => {
    setPendingInvoices(prev => {
      if (prev.some(p => p.po_number === inventory.po_number && p.imei === inventory.imei)) return prev;
      return [...prev, { ...inventory, timestamp: Date.now(), stage: 'invoice', type: 'invoice' }];
    });
  }, []);

  const clearInvoiceNotification = useCallback((poNumber, imei) => {
    setPendingInvoices(prev => prev.filter(p => !(p.po_number === poNumber && (imei ? p.imei === imei : true))));
  }, []);

  // ========== Ephemeral Handlers (kept for legacy support/immediate feedback) ==========
  const addInternalPaymentNotification = useCallback((po) => {
    setPendingInternalPayments(prev => {
      if (prev.some(p => p.po_number === po.po_number)) return prev;
      return [...prev, { ...po, timestamp: Date.now(), stage: 'internal_payment', type: 'internal_payment' }];
    });
  }, []);

  const clearInternalPaymentNotification = useCallback((poNumber) => {
    setPendingInternalPayments(prev => prev.filter(p => p.po_number !== poNumber));
  }, []);

  const addExternalPaymentNotification = useCallback((payment) => {
    setPendingExternalPayments(prev => {
      if (prev.some(p => p.po_number === payment.po_number)) return prev;
      return [...prev, { ...payment, timestamp: Date.now(), stage: 'external_payment', type: 'external_payment' }];
    });
  }, []);

  const clearExternalPaymentNotification = useCallback((poNumber) => {
    setPendingExternalPayments(prev => prev.filter(p => p.po_number !== poNumber));
  }, []);

  const addProcurementNotification = useCallback((data) => {
    setPendingProcurements(prev => {
      if (prev.some(p => p.po_number === data.po_number)) return prev;
      return [...prev, { ...data, timestamp: Date.now(), stage: 'procurement', type: 'procurement' }];
    });
  }, []);

  const clearProcurementNotification = useCallback((poNumber) => {
    setPendingProcurements(prev => prev.filter(p => p.po_number !== poNumber));
  }, []);

  const addLogisticsNotification = useCallback((procurement) => {
    setPendingLogistics(prev => {
      const isDuplicate = procurement.imei 
        ? prev.some(p => p.po_number === procurement.po_number && p.imei === procurement.imei)
        : prev.some(p => p.po_number === procurement.po_number);
      if (isDuplicate) return prev;
      return [...prev, { ...procurement, timestamp: Date.now(), stage: 'logistics', type: 'logistics' }];
    });
  }, []);

  const clearLogisticsNotification = useCallback((poNumber, imei) => {
    setPendingLogistics(prev => prev.filter(p => !(p.po_number === poNumber && (imei ? p.imei === imei : true))));
  }, []);

  const clearAllNotificationsForPO = useCallback((poNumber) => {
    setPendingInternalPayments(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingExternalPayments(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingProcurements(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingLogistics(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingInventory(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingInvoices(prev => prev.filter(p => p.po_number !== poNumber));
  }, []);

  const triggerRefresh = useCallback((dataTypes = []) => {
    const now = Date.now();
    setRefreshTimestamps(prev => {
      const updated = { ...prev };
      dataTypes.forEach(type => { if (type in updated) updated[type] = now; });
      return updated;
    });
  }, []);

  const triggerGlobalRefresh = useCallback(() => {
    const now = Date.now();
    setRefreshTimestamps({
      purchaseOrders: now, procurement: now, payments: now, logistics: now,
      inventory: now, invoices: now, dashboard: now, reports: now,
    });
  }, []);

  const refreshAfterPOChange = useCallback(() => triggerRefresh(['purchaseOrders', 'procurement', 'payments', 'logistics', 'inventory', 'invoices', 'dashboard', 'reports']), [triggerRefresh]);
  const refreshAfterProcurementChange = useCallback(() => triggerRefresh(['procurement', 'inventory', 'dashboard', 'reports', 'logistics']), [triggerRefresh]);
  const refreshAfterPaymentChange = useCallback(() => triggerRefresh(['payments', 'dashboard', 'reports']), [triggerRefresh]);
  const refreshAfterLogisticsChange = useCallback(() => triggerRefresh(['logistics', 'dashboard', 'reports', 'inventory']), [triggerRefresh]);
  const refreshAfterInventoryChange = useCallback(() => triggerRefresh(['inventory', 'dashboard', 'reports', 'invoices']), [triggerRefresh]);
  const refreshAfterInvoiceChange = useCallback(() => triggerRefresh(['invoices', 'dashboard', 'reports']), [triggerRefresh]);

  return (
    <DataRefreshContext.Provider value={{ 
      refreshTimestamps, triggerRefresh, triggerGlobalRefresh,
      refreshAfterPOChange, refreshAfterProcurementChange, refreshAfterPaymentChange,
      refreshAfterLogisticsChange, refreshAfterInventoryChange, refreshAfterInvoiceChange,
      
      // All Notifications (Persistent + Ephemeral)
      allProcurements,
      allInternalPayments,
      allExternalPayments,
      allLogisticsNotifications,
      pendingInventory,
      pendingInvoices,
      dbNotifications,
      
      // Ephemeral Handlers
      addInternalPaymentNotification, clearInternalPaymentNotification,
      addExternalPaymentNotification, clearExternalPaymentNotification,
      addProcurementNotification, clearProcurementNotification,
      addLogisticsNotification, clearLogisticsNotification,
      addInventoryNotification, clearInventoryNotification,
      addInvoiceNotification, clearInvoiceNotification,
      clearAllNotificationsForPO,
    }}>
      {children}
    </DataRefreshContext.Provider>
  );
};
