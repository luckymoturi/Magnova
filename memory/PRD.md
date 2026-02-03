# Magnova-Nova Procurement & Sales Management System - PRD

## Original Problem Statement
Build a secure, audit-ready, IMEI-level inventory, procurement, and sales management system for two related organizations:
- **Magnova Exim Pvt. Ltd.** (Export sales)
- **Nova Enterprises** (Domestic procurement)

The system must provide end-to-end visibility from Purchase Order to Sales, with detailed modules for PO Management, Procurement, complex Payment flows, IMEI Lifecycle Tracking, Logistics, Invoicing, Sales, and Reporting.

## Core Requirements
- **Architecture:** Modular, service-based with centralized IMEI master, RBAC, and full audit trails
- **Security:** Role-based access, data segregation, Maker-Checker controls
- **Tech Stack:** MongoDB, FastAPI (Python), React, Tailwind CSS

---

## What's Been Implemented

### ✅ Authentication & Authorization (Complete)
- JWT-based authentication with secure token management
- User registration and login
- Role-based access control (Admin, Purchase, Approver, Stores, etc.)
- Organization-based data segregation (Magnova vs Nova)

### ✅ Dashboard (Complete - Updated Feb 3, 2025)
- Overview statistics with auto-refresh every 30 seconds
- Manual refresh button with "Last updated" timestamp
- Real-time stats update when data changes across modules
- Quick links to all modules
- User profile display

### ✅ Purchase Order Management (Complete - Updated Feb 2, 2025)
- **PO List Page**: Displays all line item attributes (SL No, PO_ID, P.O Date, Purchase Office, Vendor, Location, Brand, Model, Storage, Colour, IMEI, Qty, Rate, PO Value, Status, Actions)
- **Create PO Dialog**: Full line item support with all device details
- **View PO Details**: Dialog showing header info and line items table
- **PO Approval Workflow**: Review, Approve, Reject with reason
- **Cascade Delete**: Deleting PO removes all related procurement, payments, logistics, inventory records

### ✅ Procurement Page (Complete - Updated Feb 2, 2025)
- **PO Auto-Populate**: Selecting PO auto-populates vendor, location, brand, model, storage, colour, rate
- **Line Item Selection**: Dropdown to select specific line item from PO
- **IMEI Recording**: Record individual IMEI against PO line items

### ✅ IMEI Inventory Page (Complete - Updated Feb 2, 2025)
- **Scan IMEI Dialog** with fields:
  - IMEI Number
  - **Action** (Inward Nova, Inward Magnova, **Outward Nova**, **Outward Magnova**, Dispatch, Mark Available)
  - **Customer Organization** dropdown (Nova/Magnova) - NEW
  - **Location** dropdown (populated from PO locations) - NEW
  - Organization
- **Status Filter**: Includes all action statuses including Outward Nova/Magnova
- **Search**: By IMEI or device model

### ✅ Logistics & Shipments Page (Complete - Updated Feb 2, 2025)
- **Create Shipment** with PO auto-populate:
  - PO Number selection
  - Auto-populated: Brand, Model
  - **Quantity Tracking**: Shows Total, Shipped, Available quantities
  - **Pickup Location** dropdown (from PO locations)
  - To Location dropdown
  - Transporter Name, Vehicle Number
  - Pickup Date, Expected Delivery
- **Status Update**: Edit button to update status (Pending, In Transit, Delivered, Cancelled)
- **Table Columns**: PO Number, Brand/Model, Transporter, Vehicle, Route, Qty, Status, Pickup Date, Actions

### ✅ UI/UX & Branding (Complete)
- Magnova Blue (#1e3a5f) & Orange (#f97316) color scheme
- Professional sidebar navigation
- Consistent styling across all components

---

## Real-Time Data Synchronization (Complete - Feb 3, 2025)

### ✅ DataRefreshContext Implementation
- Global state management for cross-page data synchronization
- All pages respond to refresh triggers when data changes
- Timestamps tracked for: purchaseOrders, procurement, payments, logistics, inventory, invoices, dashboard, reports

### ✅ Cascade Delete with UI Updates
- When PO is deleted, all related records are removed (procurement, payments, logistics, inventory, invoices)
- Confirmation dialog shows counts of records to be deleted
- All pages and dropdowns update automatically after deletion

### ✅ Real-Time Dropdown Updates
- PO dropdowns in Procurement, Payments, Logistics pages auto-refresh
- Deleted POs are immediately removed from all selection lists

---

## Reports Page (Complete - Updated Feb 3, 2025)

### ✅ Master Report with 5 Linked Sections:

1. **PROCUREMENT (Magnova → Nova PO)** - Green header
   - SL No, PO ID, PO Date, Purchase Office, Vendor, Location, Brand, Model, Storage, Colour, IMEI, Qty, Rate, PO Value, GRN No

2. **PAYMENT (Magnova → Nova)** - Orange header (Internal payments)
   - Payment#, Bank Acc#, IFSC, Payment Dt, UTR No, Amount

3. **PAYMENTS (Nova → Vendors)** - Purple header (External payments) - NEW
   - Payment#, Payee Name, Payee Type, Bank Acc#, Payment Dt, UTR No, Amount

4. **LOGISTICS** - Blue header
   - Courier, Dispatch Dt, POD No, Status

5. **STORES** - Pink header
   - Received Dt, Rcvd Qty, Warehouse, Status

### ✅ Report Features
- Search by PO, Vendor, Brand, Model, IMEI, Location
- Filter by specific PO
- Export to CSV
- Real-time refresh
- Admin delete action

---

## CRM-Style Data Linking (Complete)
All pages are now linked via PO Number:
1. **Purchase Orders** → Source of truth for all data
2. **Procurement** → Auto-populates from PO line items
3. **Inventory** → Location dropdown populated from POs
4. **Logistics** → Auto-populates brand/model, tracks shipped vs available quantity
5. **Reports** → Aggregates data from all modules with internal/external payment separation

---

## Admin Delete Functionality (Complete)
- Delete button added to every row on all data pages
- Delete button only visible to Admin role users
- DELETE endpoints protected with admin role check (returns 403 for non-admin)
- Affected pages: Purchase Orders, Procurement, Inventory, Logistics, Payments, Invoices, Reports

---

## Pending / In Progress

### 🟠 P1 - High Priority
1. **Logistics Document Uploads**
   - E-way bill attachment
   - POD (Proof of Delivery) uploads

2. **IMEI Lifecycle Tracking Enhancement**
   - Enhanced UI for scanning and status updates at different stages

### 🟡 P2 - Medium Priority
3. **Configurable Approval Workflows**
4. **Granular Reporting Build-out**
5. **Full Immutable Audit Trail**

### 🔵 P3 - Technical Debt
6. **Backend Refactoring**
   - Break monolithic `server.py` into modular structure
   - Separate routers, models, services directories

---

## Test Credentials

| Role | Email | Password | Organization |
|------|-------|----------|--------------|
| Admin | admin@magnova.com | admin123 | Magnova |
| Stores | stores@nova.com | nova123 | Nova |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/purchase-orders` | GET, POST | List/Create POs |
| `/api/purchase-orders/{po_number}` | GET | Get single PO with items |
| `/api/purchase-orders/{po_number}/approve` | POST | Approve/Reject PO |
| `/api/purchase-orders/{po_number}` | DELETE | Delete PO with cascade (Admin only) |
| `/api/purchase-orders/{po_number}/related-counts` | GET | Get counts of related records |
| `/api/procurement` | GET, POST | Procurement records |
| `/api/procurement/{procurement_id}` | DELETE | Delete procurement (Admin only) |
| `/api/payments` | GET | List all payments |
| `/api/payments/internal` | POST | Create internal payment |
| `/api/payments/external` | POST | Create external payment |
| `/api/payments/summary/{po_number}` | GET | Payment summary for PO |
| `/api/payments/{payment_id}` | DELETE | Delete payment (Admin only) |
| `/api/inventory` | GET | IMEI inventory list |
| `/api/inventory/scan` | POST | Scan IMEI with new actions |
| `/api/inventory/{imei}` | DELETE | Delete inventory item (Admin only) |
| `/api/logistics/shipments` | GET, POST | Shipments list/create |
| `/api/logistics/shipments/{id}/status` | PATCH | Update shipment status |
| `/api/logistics/shipments/{id}` | DELETE | Delete shipment (Admin only) |
| `/api/invoices/{invoice_id}` | DELETE | Delete invoice (Admin only) |
| `/api/reports/dashboard` | GET | Dashboard statistics |

---

## Architecture

```
/app/
├── backend/
│   ├── server.py          # FastAPI app with all endpoints
│   └── tests/
│       ├── test_purchase_orders.py
│       └── test_crm_features.py
├── frontend/
│   └── src/
│       ├── context/
│       │   ├── AuthContext.js
│       │   └── DataRefreshContext.js    # NEW - Global refresh state
│       ├── pages/
│       │   ├── DashboardPage.js         # Auto-refresh, manual refresh
│       │   ├── PurchaseOrdersPage.js    # Cascade delete confirmation
│       │   ├── ProcurementPage.js       # Real-time PO dropdown
│       │   ├── PaymentsPage.js          # Internal/External payments
│       │   ├── InventoryPage.js         # IMEI lookup & auto-populate
│       │   ├── LogisticsPage.js         # Status updates
│       │   ├── InvoicesPage.js          # Manual form, GST calc
│       │   └── ReportsPage.js           # 5 sections with ext payments
│       └── components/
│           └── POLineItemRow.js
└── memory/
    └── PRD.md
```

---

Last Updated: February 3, 2025
