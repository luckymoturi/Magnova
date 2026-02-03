# MAGNOVA-NOVA ERP SYSTEM - PRESENTATION OUTLINE

## For PowerPoint / Google Slides / Keynote

---

## SLIDE 1: Title Slide
**Title**: Magnova-Nova ERP System Training
**Subtitle**: Complete Procurement & Sales Management
**Image**: Company logo + logistics imagery
**Footer**: Training Date | Presenter Name

---

## SLIDE 2: Agenda
**30-Minute Training Overview**
1. System Introduction (5 min)
2. User Roles & Access (3 min)
3. Purchase Order Workflow (5 min)
4. Procurement & Payments (5 min)
5. Inventory & Logistics (5 min)
6. Invoicing & Sales (4 min)
7. Reports & Best Practices (3 min)

---

## SLIDE 3: What is Magnova-Nova ERP?
**Heading**: Comprehensive Supply Chain Management

**Two-Column Layout:**

**Left Column - Magnova Exim Pvt. Ltd.**
- Export sales entity
- Creates Purchase Orders
- Manages sales to export agencies
- Final revenue recognition

**Right Column - Nova Enterprises**
- Domestic procurement
- Purchases from retail vendors
- Manages inventory
- Supplies to Magnova

**Bottom**: Complete end-to-end traceability using IMEI tracking

---

## SLIDE 4: Business Flow Diagram
**Visual Flow Chart:**
```
[Magnova PO] → [PO Approval] → [Nova Procurement] → 
[Payment Tracking] → [IMEI Inventory] → [Logistics] → 
[Invoicing] → [Magnova Sales] → [Export]
```

**Callout Boxes:**
- "Every device tracked by IMEI"
- "Multi-level approval workflows"
- "Complete audit trails"
- "Real-time dashboards"

---

## SLIDE 5: System Access & URL
**Heading**: Getting Started

**Large, Centered Text:**
System URL: https://exim-flow.preview.emergentagent.com

**Three-Step Process:**
1. Register with your work email
2. Select your organization (Magnova/Nova)
3. Choose your role

**Note**: Role determines which features you can access

---

## SLIDE 6: User Roles Matrix
**Table Format:**

| Role | Organization | Key Responsibilities |
|------|--------------|---------------------|
| Admin | Both | Full system access |
| Purchase | Magnova | Create POs |
| Approver | Magnova | Approve/Reject POs |
| Sales | Magnova | Create sales orders |
| Stores | Nova | Record procurement, scan IMEI |
| Accounts | Nova | Track payments, invoices |
| Logistics | Both | Manage shipments |

---

## SLIDE 7: Dashboard Overview
**Screenshot**: Main dashboard with annotations

**Callouts pointing to:**
- Navigation sidebar
- Statistics cards
- Quick actions
- User profile
- System status

**Key Point**: Dashboard is customized based on your role

---

## SLIDE 8: Purchase Order Creation
**Heading**: Starting the Procurement Cycle

**Step-by-Step with Screenshots:**
1. Click "Purchase Orders" menu
2. Click "Create PO" button
3. Enter quantity and notes
4. Submit → PO Number generated
5. Status: Pending Approval

**Example**: PO-MAG-00001 for 50 devices

---

## SLIDE 9: PO Approval Workflow
**Heading**: Multi-Level Approval Process

**Visual Flow:**
```
Created by Purchase Officer
      ↓
Pending Review
      ↓
Approver Reviews
      ↓
  ┌─────┴─────┐
Approved    Rejected
  ↓             ↓
Ready for    Back to
Procurement  Creator
```

**Benefits**: Control & accountability

---

## SLIDE 10: Recording Procurement
**Heading**: Nova Stores - Device Purchase Recording

**Form Fields Explained:**
- ✓ PO Number (dropdown of approved POs)
- ✓ Vendor Name (retail store)
- ✓ Store Location (full address)
- ✓ Device Model (exact model)
- ✓ **IMEI Number** (15 digits - CRITICAL)
- ✓ Purchase Price

**Warning Box**: IMEI must be unique - duplicates rejected

---

## SLIDE 11: IMEI - The Unique Identifier
**Heading**: Why IMEI Tracking Matters

**Large Visual**: Mobile phone with IMEI highlighted

**Key Points:**
- 15-digit unique identifier
- Printed on device and box
- Cannot be duplicated in system
- Tracked from procurement to sale
- Complete lifecycle visibility

**Example**: 356789012345678

---

## SLIDE 12: Payment Tracking
**Heading**: Multi-Party Payment Management

**Three Payment Flow Types:**

**1. Nova → Vendors**
- Direct device purchases
- Record UTR and payment mode

**2. Nova → Card Holders**
- Purchases made on credit cards
- Split payment capability

**3. Inter-Company**
- Magnova ↔ Nova settlements
- Reconciliation support

---

## SLIDE 13: Payment Recording Demo
**Screenshot**: Payment form with annotations

**Fields Highlighted:**
- PO Number linkage
- Payee Type selection
- Transaction Reference (UTR)
- Payment Mode options
- Amount and date

**Tip**: Record immediately after transaction

---

## SLIDE 14: IMEI Inventory Status Lifecycle
**Heading**: Device Journey Through the System

**Visual Timeline:**
```
Procured → Inward Nova → In Transit → 
Inward Magnova → Available → Reserved → 
Dispatched → Sold
```

**Each Status Explained:**
- **Procured**: Just purchased from vendor
- **Inward Nova**: Received at Nova warehouse
- **In Transit**: Being shipped to Magnova
- **Inward Magnova**: Received at Magnova
- **Available**: Ready for sale
- **Reserved**: Allocated to sales order
- **Dispatched**: Shipped to customer
- **Sold**: Transaction complete

---

## SLIDE 15: IMEI Scanning Process
**Heading**: Updating Device Status & Location

**When to Scan:**
- Receiving at warehouse
- Before shipment
- After delivery
- Before sale

**What Gets Recorded:**
- IMEI number
- Action type
- Current location
- Timestamp
- User who scanned

**Result**: Complete audit trail

---

## SLIDE 16: Inventory Management
**Screenshot**: Inventory page with filters

**Features Highlighted:**
- Search by IMEI or model
- Filter by status
- Filter by organization
- View location history
- Export to Excel

**Use Cases:**
- Stock verification
- Aging analysis
- Location tracking

---

## SLIDE 17: Logistics & Shipments
**Heading**: Tracking Physical Movement

**Shipment Creation Inputs:**
- Transporter details
- Vehicle number
- Route (from → to)
- Pickup & delivery dates
- IMEI list

**Benefits:**
- E-way bill management
- Delivery tracking
- Batch movement of devices

---

## SLIDE 18: Invoice Management
**Heading**: Three Types of Invoices

**1. Vendor Invoices**
- Received by Nova from retail stores

**2. Inter-Company Invoices**
- Nova → Magnova for devices supplied

**3. Sales Invoices**
- Magnova → Export agencies

**All Include:**
- GST calculations
- IMEI linkage
- Payment tracking

---

## SLIDE 19: Invoice Creation
**Screenshot**: Invoice form

**Automatic Calculations:**
- Base Amount: ₹100,000
- GST @ 18%: ₹18,000
- **Total: ₹118,000**

**System Features:**
- Auto-generated invoice numbers
- Payment status tracking
- Export for GST filing

---

## SLIDE 20: Sales Orders
**Heading**: Magnova Sales to Export Agencies

**Process:**
1. Create sales order
2. Select IMEIs from available stock
3. System reserves IMEIs
4. Create invoice
5. Arrange logistics
6. Dispatch to customer
7. Mark as fulfilled

**Revenue Tracking**: Real-time sales analytics

---

## SLIDE 21: Reports & Analytics
**Heading**: Business Intelligence Dashboard

**Available Reports:**
- Purchase Orders summary
- Procurement statistics
- Payment reconciliation
- Inventory aging
- Sales performance
- Audit logs

**Export Options:**
- Excel spreadsheets
- PDF reports (future)
- Custom date ranges

---

## SLIDE 22: Dashboard Statistics
**Screenshot**: Stats cards

**Real-Time Metrics:**
- 📦 Total POs: 15
- ⏳ Pending Approvals: 3
- 📱 Total Devices: 450
- ✅ Available Stock: 125
- 💰 Total Payments: ₹1.2 Cr
- 🚚 Active Shipments: 5

**Updated Automatically**

---

## SLIDE 23: Audit Trail & Compliance
**Heading**: Complete Transparency

**Every Action Logged:**
- Who performed action
- When it occurred
- What changed
- Previous values
- IP address
- Reason (for approvals/rejections)

**Benefits:**
- Regulatory compliance
- Dispute resolution
- Performance analysis
- Security monitoring

---

## SLIDE 24: Security Features
**Heading**: Protecting Your Data

**✓ Password Security**
- Bcrypt encryption
- Strong password requirements

**✓ JWT Authentication**
- Secure token-based access
- 7-day expiration

**✓ Role-Based Access**
- See only what you need
- Prevent unauthorized changes

**✓ Audit Logs**
- Track all activities
- Immutable records

---

## SLIDE 25: Best Practices
**Heading**: Tips for Effective System Use

**DO's:**
- ✅ Double-check IMEI before submitting
- ✅ Record payments promptly
- ✅ Scan IMEIs at every checkpoint
- ✅ Use detailed notes in POs
- ✅ Keep vendor invoices as backup
- ✅ Logout when leaving desk

**DON'Ts:**
- ❌ Share login credentials
- ❌ Skip IMEI scanning
- ❌ Delay transaction recording
- ❌ Use abbreviations in names
- ❌ Ignore system warnings

---

## SLIDE 26: Common Workflows - Complete Cycle
**Heading**: From PO to Sale

**Visual Flowchart:**
```
Magnova: Create PO → Approve PO
               ↓
Nova: Procure Devices → Record Payments → 
      Scan IMEI → Create Shipment
               ↓
Magnova: Receive Devices → Scan IMEI → 
         Create Sales Order → Invoice → 
         Dispatch → Mark Sold
```

**Duration**: Typically 5-10 days per cycle

---

## SLIDE 27: Reconciliation Workflow
**Heading**: Financial Verification

**Step-by-Step:**
1. Select PO number
2. View all procurement records
3. Calculate total procurement cost
4. View all payments for that PO
5. Calculate total payments made
6. Compare: Cost vs. Payments
7. Identify any gaps
8. Record pending payments

**Goal**: 100% reconciliation

---

## SLIDE 28: Troubleshooting Guide
**Heading**: Common Issues & Quick Fixes

**Issue #1: Can't Create PO**
→ Check: Are you Magnova Purchase/Admin?

**Issue #2: IMEI Duplicate Error**
→ Check: Search inventory for existing entry

**Issue #3: PO Not in Dropdown**
→ Check: Is PO approved?

**Issue #4: Menu Items Missing**
→ Check: Role permissions

**Issue #5: Page Not Loading**
→ Try: Refresh browser, clear cache

---

## SLIDE 29: Training Resources
**Heading**: What You'll Receive

**📚 Documentation:**
- Complete Training Guide (PDF)
- Quick Reference Card (printable)
- Video Tutorials (30 min)
- Presentation Slides

**🎓 Support:**
- Email: support@magnova-nova-erp.com
- Phone: +91-XXXX-XXXX
- Training Portal
- Monthly webinars

**📧 Follow-Up:**
- Q&A session next week
- Hands-on practice time
- Performance assessment

---

## SLIDE 30: Live Demo
**Heading**: Let's See It In Action!

**Demo Agenda:**
1. Login to system
2. Navigate dashboard
3. Create a PO
4. Record procurement
5. Scan IMEI
6. View reports

**Interactive**: Ask questions anytime!

---

## SLIDE 31: Hands-On Practice Time
**Heading**: Your Turn!

**Practice Tasks:**
- [ ] Login to your account
- [ ] Explore your dashboard
- [ ] Navigate to your primary module
- [ ] Create a test transaction
- [ ] View the transaction in reports
- [ ] Search for specific data

**Trainers Available**: We're here to help!

---

## SLIDE 32: Q&A Session
**Heading**: Your Questions Answered

**Common Topics:**
- Role-specific features
- Workflow clarifications
- Data entry tips
- Error resolution
- Report generation
- Integration questions

**Open Discussion**: No question too small!

---

## SLIDE 33: Assessment & Certification
**Heading**: Verify Your Knowledge

**Quiz Topics:**
- System navigation
- Role responsibilities
- Workflow understanding
- Data entry accuracy
- Security practices

**Passing Score**: 80% or higher

**Certificate**: Digital certificate issued upon completion

---

## SLIDE 34: Next Steps
**Heading**: After This Training

**Week 1:**
- [ ] Start using system for daily tasks
- [ ] Keep Quick Reference at desk
- [ ] Attend Q&A session
- [ ] Practice workflows

**Ongoing:**
- [ ] Attend monthly webinars
- [ ] Read release notes
- [ ] Suggest improvements
- [ ] Help train others

---

## SLIDE 35: Feedback & Improvement
**Heading**: Help Us Improve

**We Value Your Input:**
- What was most helpful?
- What needs more clarity?
- What examples would help?
- What additional training needed?

**Feedback Form**: [QR Code or Link]

**Impact**: Your feedback shapes future training

---

## SLIDE 36: Contact Information
**Heading**: We're Here to Help

**Support Team:**
📧 Email: support@magnova-nova-erp.com
📞 Phone: +91-XXXX-XXXX
🌐 Portal: [training portal URL]
⏰ Hours: Monday-Friday, 9 AM - 6 PM IST

**Training Team:**
📧 training@magnova-nova-erp.com
📅 Schedule: [calendar link]

**Emergency Support:**
🚨 24/7 Hotline: +91-XXXX-XXXX

---

## SLIDE 37: Thank You!
**Heading**: You're Ready to Excel!

**Key Takeaways:**
✅ Complete visibility from PO to sale
✅ IMEI-level traceability
✅ Multi-party payment tracking
✅ Role-based security
✅ Comprehensive reporting

**Remember**: 
"The system is only as good as the data we input. 
Accuracy and timeliness are key!"

**Questions?** Contact us anytime!

---

## SLIDE 38: Appendix - Technical Specs
**For Reference Only**

**System Requirements:**
- Browser: Chrome, Firefox, Edge, Safari
- Internet: 2 Mbps minimum
- Resolution: 1366x768 minimum

**Data Security:**
- SSL/TLS encryption
- Daily backups
- 99.9% uptime SLA
- GDPR compliant

**Mobile Access:**
- Responsive design
- Works on tablets
- Barcode scanner compatible

---

## PRESENTATION NOTES FOR TRAINERS

### Timing Guide:
- Slides 1-10: 10 minutes (Introduction & Roles)
- Slides 11-20: 10 minutes (Core Modules)
- Slides 21-25: 5 minutes (Reports & Best Practices)
- Slides 26-30: 5 minutes (Workflows & Demo)
- Slides 31-38: As needed (Interactive)

### Interactive Elements:
- Use polls during presentation
- Encourage questions throughout
- Share screen for live demos
- Break into small groups for practice

### Materials to Prepare:
- Printed handouts of slides
- Quick Reference cards
- Access credentials list
- Demo account details
- Feedback forms

### Technical Setup:
- Test screen sharing
- Verify audio/video
- Have backup presentation
- Prepare test environment
- Clear browser history

---

**Last Updated**: January 31, 2025
**Version**: 1.0
**Slides**: 38
**Estimated Presentation Time**: 30-40 minutes
