# MAGNOVA-NOVA ERP SYSTEM - COMPREHENSIVE TRAINING GUIDE

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Getting Started](#getting-started)
4. [Module 1: Purchase Order Management](#module-1-purchase-order-management)
5. [Module 2: Procurement Management](#module-2-procurement-management)
6. [Module 3: Payment Tracking](#module-3-payment-tracking)
7. [Module 4: IMEI Inventory Management](#module-4-imei-inventory-management)
8. [Module 5: Logistics & Shipments](#module-5-logistics--shipments)
9. [Module 6: Invoice Management](#module-6-invoice-management)
10. [Module 7: Sales Orders](#module-7-sales-orders)
11. [Module 8: Reports & Analytics](#module-8-reports--analytics)
12. [Common Workflows](#common-workflows)
13. [Troubleshooting](#troubleshooting)

---

## System Overview

### What is Magnova-Nova ERP?

The Magnova-Nova ERP is a comprehensive procurement and sales management system designed for mobile phone trading between two organizations:

- **Magnova Exim Pvt. Ltd.**: Export sales entity
- **Nova Enterprises**: Domestic procurement and trading entity

### Business Flow

```
Purchase Order (Magnova) → Procurement (Nova) → Payments → IMEI Tracking → 
Logistics → Invoicing → Sales Orders (Export)
```

### Key Features

✅ **End-to-End Traceability**: Track every device from procurement to sale using IMEI numbers
✅ **Approval Workflows**: Multi-level approval for purchase orders
✅ **Payment Tracking**: Support for multiple payment flows (Vendor, Card Holders, Inter-company)
✅ **Audit Trails**: Complete history of all transactions
✅ **Role-Based Access**: Different permissions for different user types
✅ **Real-Time Dashboard**: Live statistics and KPIs

---

## User Roles & Permissions

### Magnova Organization Roles

#### 1. **Admin**
- Full system access
- Can perform all operations
- User management capabilities

#### 2. **Purchase Officer**
- Create purchase orders
- View procurement status
- Cannot approve POs

#### 3. **Approver**
- Review and approve/reject purchase orders
- View all PO details
- Cannot create POs

#### 4. **Sales**
- Create sales orders
- Manage export agency orders
- Reserve inventory for sales

### Nova Organization Roles

#### 1. **Stores**
- Record procurement from vendors
- Scan IMEI numbers
- Manage inventory movements

#### 2. **Accounts**
- Record all payment transactions
- Track payment status
- Generate financial reports

#### 3. **Logistics**
- Create shipments
- Track transportation
- Manage e-way bills

---

## Getting Started

### Accessing the System

**URL**: https://novatrade.preview.emergentagent.com

### Registration Process

1. Navigate to the login page
2. Click "Register here" link
3. Fill in the registration form:
   - Full Name
   - Email Address
   - Password (minimum 8 characters)
   - Organization (Magnova or Nova)
   - Role (based on your responsibilities)
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the dashboard

### Test Credentials

For training purposes, use these accounts:

**Magnova Admin**
- Email: `deploy-test@magnova.com`
- Password: `deploy123`

**Nova Stores**
- Email: `stores@nova.com`
- Password: `nova123`

**Nova Accounts**
- Email: `accounts@nova.com`
- Password: `accounts123`

---

## Module 1: Purchase Order Management

### Purpose
Purchase Orders (POs) are created by Magnova when they need Nova to procure mobile phones. This initiates the entire procurement cycle.

### Who Can Access
- **Create PO**: Magnova Purchase Officers, Admins
- **Approve PO**: Magnova Approvers, Admins
- **View PO**: All users (read-only for Nova)

### Creating a Purchase Order

#### Step 1: Navigate to Purchase Orders
- Click "Purchase Orders" in the left sidebar
- You'll see a list of all existing POs

#### Step 2: Click "Create PO" Button
- Located in the top-right corner
- A dialog form will appear

#### Step 3: Fill in PO Details
- **Total Quantity**: Number of devices to procure (e.g., 50)
- **Notes**: Additional instructions (e.g., "Focus on iPhone 14 and Samsung S23")

#### Step 4: Submit
- Click "Create Purchase Order"
- System generates unique PO number (e.g., PO-MAG-00001)
- Status is set to "Pending" approval

### Approving a Purchase Order

#### Step 1: Navigate to Purchase Orders
- Login as Approver or Admin
- Go to Purchase Orders page

#### Step 2: Locate Pending PO
- Look for POs with "Pending" status badge (yellow)
- Click "Review" button

#### Step 3: Review PO Details
- Check quantity requested
- Read any notes from the Purchase Officer
- Verify business need

#### Step 4: Make Decision
**To Approve:**
- Click "Approve" button (green)
- PO status changes to "Approved"
- Nova can now start procurement

**To Reject:**
- Enter rejection reason in the text field
- Click "Reject" button (red)
- PO status changes to "Rejected"
- Purchase Officer is notified

### PO Status Flow

```
Created → Pending → Approved → Fulfilled → Closed
                 ↓
              Rejected
```

---

## Module 2: Procurement Management

### Purpose
Nova stores team records each device procurement from retail vendors, capturing IMEI numbers and vendor details.

### Who Can Access
- Nova Stores personnel
- Nova Admins

### Prerequisites
- An approved Purchase Order must exist
- Vendor invoice and device IMEI available

### Recording a Procurement

#### Step 1: Navigate to Procurement
- Click "Procurement" in the sidebar
- View list of existing procurement records

#### Step 2: Click "Add Procurement"
- Dialog form opens

#### Step 3: Fill Procurement Details

**Required Fields:**
- **PO Number**: Select from dropdown (only approved POs shown)
- **Vendor Name**: Retail store name (e.g., "Reliance Digital")
- **Store Location**: Full address or city (e.g., "Mumbai - Phoenix Mall")
- **Device Model**: Exact model name (e.g., "iPhone 14 Pro 256GB")
- **IMEI Number**: 15-digit unique identifier
- **Serial Number**: Device serial (optional)
- **Purchase Price**: Amount paid to vendor (e.g., 45000)

#### Step 4: Submit
- Click "Add Procurement Record"
- System validates:
  - IMEI uniqueness (duplicate check)
  - PO must be approved
  - Price reasonability
- Record is created
- IMEI automatically added to inventory

### Important Notes

⚠️ **IMEI Uniqueness**: Each IMEI can only be recorded once in the system
⚠️ **PO Linkage**: Every procurement must be linked to an approved PO
⚠️ **Accurate Data**: Double-check IMEI as it cannot be changed later

### Viewing Procurement History

- All procurements displayed in table format
- Filter by PO number
- Sort by date, vendor, or location
- Export to Excel for reporting

---

## Module 3: Payment Tracking

### Purpose
Track all payment transactions across multiple payment flows:
- Magnova → Nova (advance/settlement)
- Nova → Retail Vendors
- Nova → Credit Card Holders (if purchases made on cards)

### Who Can Access
- Nova Accounts team
- Admins

### Recording a Payment

#### Step 1: Navigate to Payments
- Click "Payments" in the sidebar

#### Step 2: Click "Record Payment"

#### Step 3: Fill Payment Details

**Required Fields:**
- **PO Number**: Related purchase order
- **Payee Type**: 
  - Vendor (retail store)
  - Card Holder (credit card owner)
  - Nova (for inter-company)
  - Magnova (for settlements)
- **Payee Name**: Full name of recipient
- **Payment Mode**:
  - Bank Transfer
  - UPI
  - Cheque
  - Cash
  - Credit Card
- **Amount**: Payment amount
- **Transaction Reference (UTR)**: Bank reference number
- **Payment Date**: Date of transaction

#### Step 4: Submit
- Click "Record Payment"
- Payment logged with timestamp
- Audit trail created

### Payment Reconciliation

**Viewing Payment Summary:**
- Filter payments by PO number
- View total paid vs. procurement cost
- Identify pending payments
- Generate payment reports

### Split Payment Scenario

**Example**: Device costs ₹45,000
- ₹25,000 paid to vendor via bank transfer
- ₹20,000 paid to credit card holder

**Record as two separate transactions:**

**Transaction 1:**
- Payee Type: Vendor
- Payee Name: Reliance Digital
- Amount: 25,000
- UTR: HDFC123456

**Transaction 2:**
- Payee Type: Card Holder
- Payee Name: John Doe
- Amount: 20,000
- UTR: ICICI789012

---

## Module 4: IMEI Inventory Management

### Purpose
Track the lifecycle and location of every device using its IMEI number from procurement to sale.

### IMEI Status Lifecycle

```
Procured → Inward Nova → In Transit → Inward Magnova → 
Available → Reserved → Dispatched → Sold
```

### Who Can Access
- Stores personnel (both organizations)
- Logistics team
- Admins

### Viewing Inventory

#### Step 1: Navigate to Inventory
- Click "Inventory" in the sidebar
- View all devices in system

#### Step 2: Use Filters
- **Search**: By IMEI or device model
- **Status Filter**: Filter by current status
- **Organization**: Magnova or Nova

### Scanning IMEI (Status Update)

#### Step 1: Click "Scan IMEI"

#### Step 2: Enter Details
- **IMEI Number**: Device to update
- **Action**: Select operation
  - **Inward Nova**: Device received at Nova warehouse
  - **Inward Magnova**: Device received at Magnova warehouse
  - **Dispatch**: Device being shipped
  - **Mark Available**: Ready for sale
- **Location**: Current physical location
- **Organization**: Current owner (Nova/Magnova)

#### Step 3: Submit
- Click "Scan & Update"
- Status updated in real-time
- Timestamp recorded
- Location history maintained

### Inventory Reports

**Available Reports:**
- Current stock by location
- Devices in transit
- Aging analysis (how long in stock)
- Movement history per IMEI

---

## Module 5: Logistics & Shipments

### Purpose
Track physical movement of devices between locations with transporter details and e-way bills.

### Who Can Access
- Logistics team
- Admins

### Creating a Shipment

#### Step 1: Navigate to Logistics
- Click "Logistics" in the sidebar

#### Step 2: Click "Create Shipment"

#### Step 3: Fill Shipment Details

**Required Fields:**
- **PO Number**: Related purchase order
- **Transporter Name**: Logistics company (e.g., "Blue Dart")
- **Vehicle Number**: Truck/vehicle registration (e.g., "MH-02-AB-1234")
- **From Location**: Origin warehouse
- **To Location**: Destination warehouse
- **Pickup Date**: Date of dispatch
- **Expected Delivery**: Estimated arrival date
- **IMEI List**: Comma-separated IMEIs being shipped
  - Example: `356789012345678, 356789012345679, 356789012345680`

#### Step 4: Submit
- Click "Create Shipment"
- Shipment ID generated
- Status set to "In Transit"
- IMEIs marked as "Dispatched"

### E-Way Bill Management

**Future Enhancement**: Upload e-way bill PDFs
- Link to shipment
- Track expiry dates
- Generate reports for GST compliance

### Tracking Shipments

- View all active shipments
- Monitor expected vs. actual delivery
- Update status on delivery
- View items in each shipment

---

## Module 6: Invoice Management

### Purpose
Generate invoices for three types of transactions:
1. Retail vendor invoices (received by Nova)
2. Nova → Magnova invoices (inter-company)
3. Magnova → Export agency invoices (sales)

### Who Can Access
- Accounts team
- Admins

### Creating an Invoice

#### Step 1: Navigate to Invoices
- Click "Invoices" in the sidebar

#### Step 2: Click "Create Invoice"

#### Step 3: Fill Invoice Details

**Required Fields:**
- **Invoice Type**:
  - Vendor Invoice
  - Nova to Magnova
  - Magnova to Export Agency
- **PO Number**: Related purchase order
- **From Organization**: Invoice issuer
- **To Organization**: Invoice recipient
- **Amount**: Base amount (excluding GST)
- **GST Amount**: Tax amount (calculate based on rate)
- **Invoice Date**: Date of invoice generation
- **IMEI List**: Devices covered by this invoice

#### Step 4: Submit
- System generates invoice number (e.g., INV-000001)
- Total amount calculated (Amount + GST)
- Payment status set to "Pending"

### Invoice Calculations

**Example:**
- Base Amount: ₹100,000
- GST @ 18%: ₹18,000
- **Total Amount: ₹118,000**

### GST Compliance

- All invoices include GST details
- Export data to accounting software
- Generate GST reports by period

---

## Module 7: Sales Orders

### Purpose
Record sales to export agencies with IMEI reservation and revenue tracking.

### Who Can Access
- Magnova Sales team
- Magnova Admins

### Creating a Sales Order

#### Step 1: Navigate to Sales Orders
- Click "Sales Orders" in the sidebar

#### Step 2: Click "Create Sales Order"

#### Step 3: Fill Sales Order Details

**Required Fields:**
- **Customer Name**: Export agency name
- **Customer Type**: 
  - Export Agency
  - Distributor
  - Retailer
- **Total Quantity**: Number of devices
- **Total Amount**: Sale value
- **IMEI List**: Specific devices being sold

#### Step 4: Submit
- Sales Order number generated (e.g., SO-MAG-00001)
- IMEIs marked as "Reserved"
- Revenue recorded
- Order status: "Created"

### Sales Order Fulfillment

**Status Flow:**
```
Created → Reserved → Dispatched → Fulfilled
```

**On Fulfillment:**
- IMEIs marked as "Sold"
- Revenue recognized
- Inventory reduced
- Customer invoice generated

---

## Module 8: Reports & Analytics

### Purpose
Generate business insights and export data for analysis.

### Who Can Access
- Approvers
- Admins
- Management

### Dashboard Statistics

**Key Metrics Displayed:**
- Total Purchase Orders
- Pending Approvals
- Total Procurement (devices)
- Total Inventory
- Available Stock
- Total Sales Orders
- Total Payment Amount

### Exporting Reports

#### Inventory Report (Excel)

**Step 1**: Navigate to Reports page
**Step 2**: Click "Export Excel" under Inventory Report
**Step 3**: File downloads automatically

**Report Contains:**
- All IMEI numbers
- Device models
- Current status
- Organization
- Current location
- Creation date

### Custom Reports (Future)

**Planned Reports:**
- PO-wise procurement summary
- Vendor performance analysis
- Payment reconciliation
- Aging analysis
- Profitability by PO

---

## Common Workflows

### Workflow 1: Complete Purchase Cycle

**Step-by-step process from PO to Sale:**

1. **Magnova Purchase Officer** creates PO (Quantity: 10 devices)
2. **Magnova Approver** reviews and approves PO
3. **Nova Stores** procures devices from vendors, records each IMEI
4. **Nova Accounts** records payments to vendors
5. **Nova Stores** scans IMEIs as "Inward Nova"
6. **Nova Logistics** creates shipment to Magnova warehouse
7. **Magnova Stores** scans IMEIs as "Inward Magnova"
8. **Magnova Stores** marks IMEIs as "Available"
9. **Nova Accounts** creates invoice (Nova → Magnova)
10. **Magnova Sales** creates sales order for export agency
11. **Magnova Accounts** creates invoice (Magnova → Export agency)
12. **Magnova Logistics** dispatches to customer
13. **System** marks IMEIs as "Sold"

### Workflow 2: Payment Reconciliation

**Scenario**: Verify all payments for PO-MAG-00001

1. Go to **Purchase Orders**, note total quantity
2. Go to **Procurement**, filter by PO number
3. Sum up total procurement cost
4. Go to **Payments**, filter by PO number
5. Sum up total payments made
6. Compare: Total Procurement Cost vs. Total Payments
7. Identify any pending payments

### Workflow 3: IMEI Traceability

**Tracking a specific device:**

1. Go to **Inventory** page
2. Search by IMEI number
3. View current status and location
4. Go to **Procurement** to see purchase details
5. Go to **Logistics** to see shipment history
6. Go to **Sales Orders** to see sale details
7. Complete lifecycle visible

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: Cannot Create PO
**Problem**: "Create PO" button not visible

**Solutions:**
- Check you're logged in as Magnova user
- Verify role is Purchase Officer or Admin
- Refresh the page

#### Issue 2: IMEI Already Exists Error
**Problem**: "IMEI already exists in system"

**Solutions:**
- Verify IMEI number is correct
- Check if device was previously recorded
- Search inventory to locate existing entry
- Contact admin if IMEI needs correction

#### Issue 3: PO Not Appearing in Dropdown
**Problem**: Cannot select PO when creating procurement

**Solutions:**
- Ensure PO is approved (only approved POs shown)
- Check PO status on Purchase Orders page
- Contact Magnova approver

#### Issue 4: Payment Not Reflecting
**Problem**: Payment recorded but not showing in summary

**Solutions:**
- Check PO number is correct
- Verify transaction was successfully submitted
- Refresh the page
- Check browser console for errors

#### Issue 5: Cannot Access Certain Pages
**Problem**: Menu items missing or pages show error

**Solutions:**
- Verify your role permissions
- Check organization (some features Magnova/Nova specific)
- Logout and login again
- Clear browser cache

---

## Best Practices

### Data Entry

✅ **DO:**
- Double-check IMEI numbers before submitting
- Use complete vendor names and addresses
- Record payments immediately after transaction
- Take photos of vendor invoices for reference
- Update IMEI status as devices move

❌ **DON'T:**
- Enter duplicate IMEI numbers
- Use abbreviations for vendor names
- Delay payment recording
- Skip optional fields if data is available
- Forget to scan IMEIs at each checkpoint

### Security

✅ **DO:**
- Use strong, unique passwords
- Logout when leaving workstation
- Verify data before approval
- Report suspicious activity
- Keep credentials confidential

❌ **DON'T:**
- Share login credentials
- Leave system unattended while logged in
- Approve POs without review
- Bypass approval workflows
- Store passwords in plain text

### Audit Trail

✅ **DO:**
- Provide clear notes on POs
- Enter accurate rejection reasons
- Record complete payment details
- Update shipment status promptly
- Document any discrepancies

❌ **DON'T:**
- Delete or modify historical data
- Create backdated transactions
- Skip required fields
- Use generic descriptions
- Ignore system warnings

---

## Support & Training

### Getting Help

**For System Issues:**
- Email: support@magnova-nova-erp.com
- Phone: +91-XXXX-XXXX
- Hours: Monday-Friday, 9 AM - 6 PM IST

**For Training:**
- Schedule one-on-one sessions
- Request custom training for new features
- Access online training portal

### Additional Resources

- **User Manual**: Detailed documentation
- **Video Tutorials**: Step-by-step guides (coming soon)
- **FAQ**: Common questions answered
- **Release Notes**: New features and updates

---

## System Requirements

### Browser Compatibility
- ✅ Google Chrome (Recommended)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari

### Internet Connection
- Minimum: 2 Mbps
- Recommended: 5 Mbps or higher

### Screen Resolution
- Minimum: 1366x768
- Recommended: 1920x1080

---

## Conclusion

The Magnova-Nova ERP system provides comprehensive tracking from purchase order to final sale, ensuring complete transparency and traceability. By following this guide and adhering to best practices, users can effectively manage the entire procurement and sales cycle.

For additional support or questions, please contact the system administrator or support team.

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2025  
**Prepared By**: Magnova-Nova ERP Team
