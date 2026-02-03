import React, { createContext, useState, useContext, useCallback } from 'react';

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

  // ========== WORKFLOW NOTIFICATIONS ==========
  // Stage 1: PO → Internal Payment
  const [pendingInternalPayments, setPendingInternalPayments] = useState([]);
  
  // Stage 2: Internal Payment Complete → External Payment
  const [pendingExternalPayments, setPendingExternalPayments] = useState([]);
  
  // Stage 3: External Payment Complete → Procurement
  const [pendingProcurements, setPendingProcurements] = useState([]);
  
  // Stage 4: Procurement → Logistics (already implemented)
  const [pendingLogistics, setPendingLogistics] = useState([]);
  
  // Stage 5: Logistics → Inventory
  const [pendingInventory, setPendingInventory] = useState([]);
  
  // Stage 6: Inventory → Invoice
  const [pendingInvoices, setPendingInvoices] = useState([]);

  // ========== STAGE 1: PO → Internal Payment ==========
  const addInternalPaymentNotification = useCallback((po) => {
    setPendingInternalPayments(prev => {
      if (prev.some(p => p.po_number === po.po_number)) return prev;
      return [...prev, { ...po, timestamp: Date.now(), stage: 'internal_payment' }];
    });
  }, []);

  const clearInternalPaymentNotification = useCallback((poNumber) => {
    setPendingInternalPayments(prev => prev.filter(p => p.po_number !== poNumber));
  }, []);

  // ========== STAGE 2: Internal Payment → External Payment ==========
  const addExternalPaymentNotification = useCallback((payment) => {
    setPendingExternalPayments(prev => {
      if (prev.some(p => p.po_number === payment.po_number)) return prev;
      return [...prev, { ...payment, timestamp: Date.now(), stage: 'external_payment' }];
    });
  }, []);

  const clearExternalPaymentNotification = useCallback((poNumber) => {
    setPendingExternalPayments(prev => prev.filter(p => p.po_number !== poNumber));
  }, []);

  // ========== STAGE 3: External Payment → Procurement ==========
  const addProcurementNotification = useCallback((data) => {
    setPendingProcurements(prev => {
      if (prev.some(p => p.po_number === data.po_number)) return prev;
      return [...prev, { ...data, timestamp: Date.now(), stage: 'procurement' }];
    });
  }, []);

  const clearProcurementNotification = useCallback((poNumber) => {
    setPendingProcurements(prev => prev.filter(p => p.po_number !== poNumber));
  }, []);

  // ========== STAGE 4: Procurement → Logistics ==========
  const addLogisticsNotification = useCallback((procurement) => {
    setPendingLogistics(prev => {
      if (prev.some(p => p.po_number === procurement.po_number && p.imei === procurement.imei)) return prev;
      return [...prev, { ...procurement, timestamp: Date.now(), stage: 'logistics' }];
    });
  }, []);

  const clearLogisticsNotification = useCallback((poNumber, imei) => {
    setPendingLogistics(prev => prev.filter(p => !(p.po_number === poNumber && (imei ? p.imei === imei : true))));
  }, []);

  // ========== STAGE 5: Logistics → Inventory ==========
  const addInventoryNotification = useCallback((shipment) => {
    setPendingInventory(prev => {
      if (prev.some(p => p.po_number === shipment.po_number && p.shipment_id === shipment.shipment_id)) return prev;
      return [...prev, { ...shipment, timestamp: Date.now(), stage: 'inventory' }];
    });
  }, []);

  const clearInventoryNotification = useCallback((poNumber, shipmentId) => {
    setPendingInventory(prev => prev.filter(p => !(p.po_number === poNumber && (shipmentId ? p.shipment_id === shipmentId : true))));
  }, []);

  // ========== STAGE 6: Inventory → Invoice ==========
  const addInvoiceNotification = useCallback((inventory) => {
    setPendingInvoices(prev => {
      if (prev.some(p => p.po_number === inventory.po_number && p.imei === inventory.imei)) return prev;
      return [...prev, { ...inventory, timestamp: Date.now(), stage: 'invoice' }];
    });
  }, []);

  const clearInvoiceNotification = useCallback((poNumber, imei) => {
    setPendingInvoices(prev => prev.filter(p => !(p.po_number === poNumber && (imei ? p.imei === imei : true))));
  }, []);

  // ========== Clear all notifications for a PO ==========
  const clearAllNotificationsForPO = useCallback((poNumber) => {
    setPendingInternalPayments(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingExternalPayments(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingProcurements(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingLogistics(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingInventory(prev => prev.filter(p => p.po_number !== poNumber));
    setPendingInvoices(prev => prev.filter(p => p.po_number !== poNumber));
  }, []);

  // Trigger refresh for specific data types
  const triggerRefresh = useCallback((dataTypes = []) => {
    const now = Date.now();
    setRefreshTimestamps(prev => {
      const updated = { ...prev };
      dataTypes.forEach(type => {
        if (type in updated) {
          updated[type] = now;
        }
      });
      return updated;
    });
  }, []);

  // Trigger refresh for ALL data types (used after cascade delete)
  const triggerGlobalRefresh = useCallback(() => {
    const now = Date.now();
    setRefreshTimestamps({
      purchaseOrders: now,
      procurement: now,
      payments: now,
      logistics: now,
      inventory: now,
      invoices: now,
      dashboard: now,
      reports: now,
    });
  }, []);

  // Specific refresh triggers for common operations
  const refreshAfterPOChange = useCallback(() => {
    triggerRefresh(['purchaseOrders', 'procurement', 'payments', 'logistics', 'inventory', 'invoices', 'dashboard', 'reports']);
  }, [triggerRefresh]);

  const refreshAfterProcurementChange = useCallback(() => {
    triggerRefresh(['procurement', 'inventory', 'dashboard', 'reports', 'logistics']);
  }, [triggerRefresh]);

  const refreshAfterPaymentChange = useCallback(() => {
    triggerRefresh(['payments', 'dashboard', 'reports']);
  }, [triggerRefresh]);

  const refreshAfterLogisticsChange = useCallback(() => {
    triggerRefresh(['logistics', 'dashboard', 'reports', 'inventory']);
  }, [triggerRefresh]);

  const refreshAfterInventoryChange = useCallback(() => {
    triggerRefresh(['inventory', 'dashboard', 'reports', 'invoices']);
  }, [triggerRefresh]);

  const refreshAfterInvoiceChange = useCallback(() => {
    triggerRefresh(['invoices', 'dashboard', 'reports']);
  }, [triggerRefresh]);

  return (
    <DataRefreshContext.Provider value={{ 
      refreshTimestamps,
      triggerRefresh,
      triggerGlobalRefresh,
      refreshAfterPOChange,
      refreshAfterProcurementChange,
      refreshAfterPaymentChange,
      refreshAfterLogisticsChange,
      refreshAfterInventoryChange,
      refreshAfterInvoiceChange,
      
      // Stage 1: PO → Internal Payment
      pendingInternalPayments,
      addInternalPaymentNotification,
      clearInternalPaymentNotification,
      
      // Stage 2: Internal Payment → External Payment
      pendingExternalPayments,
      addExternalPaymentNotification,
      clearExternalPaymentNotification,
      
      // Stage 3: External Payment → Procurement
      pendingProcurements,
      addProcurementNotification,
      clearProcurementNotification,
      
      // Stage 4: Procurement → Logistics
      pendingLogistics,
      addLogisticsNotification,
      clearLogisticsNotification,
      
      // Stage 5: Logistics → Inventory
      pendingInventory,
      addInventoryNotification,
      clearInventoryNotification,
      
      // Stage 6: Inventory → Invoice
      pendingInvoices,
      addInvoiceNotification,
      clearInvoiceNotification,
      
      // Utility
      clearAllNotificationsForPO,
    }}>
      {children}
    </DataRefreshContext.Provider>
  );
};
