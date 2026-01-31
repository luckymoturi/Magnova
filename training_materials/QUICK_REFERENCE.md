# MAGNOVA-NOVA ERP - QUICK REFERENCE CARD

## 🔐 Login Credentials (Training)

| Role | Email | Password | Organization |
|------|-------|----------|--------------|
| Magnova Admin | deploy-test@magnova.com | deploy123 | Magnova |
| Nova Stores | stores@nova.com | nova123 | Nova |
| Nova Accounts | accounts@nova.com | accounts123 | Nova |

---

## 📋 Common Tasks Quick Guide

### Create Purchase Order (Magnova Only)
1. Click **Purchase Orders** → **Create PO**
2. Enter quantity and notes
3. Submit → Wait for approval

### Record Procurement (Nova Only)
1. Click **Procurement** → **Add Procurement**
2. Select approved PO
3. Enter vendor details, IMEI, price
4. Submit

### Scan IMEI
1. Click **Inventory** → **Scan IMEI**
2. Enter IMEI, select action, location
3. Submit

### Record Payment (Nova Accounts)
1. Click **Payments** → **Record Payment**
2. Fill PO number, payee details, amount, UTR
3. Submit

### Create Sales Order (Magnova Sales)
1. Click **Sales Orders** → **Create Sales Order**
2. Enter customer details, IMEIs
3. Submit

---

## 🔄 Status Flow Reference

### Purchase Order Status
```
Created → Pending → Approved → Fulfilled → Closed
                 ↓
              Rejected
```

### IMEI Lifecycle
```
Procured → Inward Nova → In Transit → Inward Magnova → 
Available → Reserved → Dispatched → Sold
```

### Sales Order Status
```
Created → Reserved → Dispatched → Fulfilled
```

---

## 🎯 Role-Based Access

### Magnova Roles
- **Admin**: Full access
- **Purchase**: Create POs
- **Approver**: Approve/Reject POs
- **Sales**: Create sales orders

### Nova Roles
- **Admin**: Full access
- **Stores**: Record procurement, scan IMEI
- **Accounts**: Record payments, invoices
- **Logistics**: Create shipments

---

## ⚠️ Important Validations

| Field | Rule |
|-------|------|
| IMEI | Must be unique (15 digits) |
| PO for Procurement | Must be approved |
| Email | Must be unique per user |
| Payment Date | Cannot be future date |

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't create PO | Check role (must be Magnova Purchase/Admin) |
| IMEI duplicate error | Check inventory - already exists |
| PO not in dropdown | Only approved POs shown |
| Menu items missing | Check role permissions |
| Page not loading | Refresh browser, clear cache |

---

## 📞 Support
- **Email**: support@magnova-nova-erp.com
- **Hours**: Mon-Fri, 9 AM - 6 PM IST

---

## 🔢 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open search | Ctrl + K |
| Logout | Ctrl + L |
| Dashboard | Alt + D |
| Help | F1 |

---

**Print this card and keep at your workstation for quick reference!**
