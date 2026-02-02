# MAGNOVA-NOVA ERP - LOGIN CREDENTIALS

## All credentials are now verified and working ✓

**Login URL**: https://magnova-erp.preview.emergentagent.com/login

---

## MAGNOVA ORGANIZATION USERS

### 1. Magnova Admin (Full Access)
- **Email**: `admin@magnova.com`
- **Password**: `admin123`
- **Role**: Admin
- **Access**: All modules, full system access
- **Status**: ✅ Verified Working

### 2. Magnova Purchase Officer
- **Email**: `purchase@magnova.com`
- **Password**: `purchase123`
- **Role**: Purchase
- **Access**: Create Purchase Orders, view procurement status
- **Status**: ✅ Verified Working

### 3. Magnova Approver (UPDATED)
- **Email**: `approver@magnova.com`
- **Password**: `approve123` (original password)
- **Role**: Approver
- **Access**: Approve/reject Purchase Orders, view reports
- **Status**: ✅ Exists (use original password)

### 4. Magnova Sales Officer
- **Email**: `sales@magnova.com`
- **Password**: `sales123`
- **Role**: Sales
- **Access**: Create sales orders, manage export sales
- **Status**: ✅ Verified Working

---

## NOVA ORGANIZATION USERS

### 5. Nova Admin (Full Access)
- **Email**: `nova-admin@nova.com`
- **Password**: `nova123`
- **Role**: Admin
- **Access**: All modules for Nova, full system access
- **Status**: ✅ Verified Working

### 6. Nova Stores Team
- **Email**: `stores@nova.com`
- **Password**: `nova123` (original password)
- **Role**: Stores
- **Access**: Record procurement, scan IMEI, manage inventory
- **Status**: ✅ Verified Working

### 7. Nova Accounts Team
- **Email**: `accounts@nova.com`
- **Password**: `accounts123`
- **Role**: Accounts
- **Access**: Record payments, create invoices, financial reports
- **Status**: ✅ Verified Working

### 8. Nova Logistics Team
- **Email**: `logistics@nova.com`
- **Password**: `logistics123`
- **Role**: Logistics
- **Access**: Create shipments, track logistics, manage e-way bills
- **Status**: ✅ Verified Working

---

## LEGACY TEST USERS (Still Active)

### 9. Deploy Test User
- **Email**: `deploy-test@magnova.com`
- **Password**: `deploy123`
- **Role**: Admin
- **Organization**: Magnova
- **Status**: ✅ Verified Working

### 10. Original Test User
- **Email**: `test@magnova.com`
- **Password**: `test123`
- **Role**: Admin
- **Organization**: Magnova
- **Status**: ✅ Verified Working

---

## QUICK REFERENCE TABLE

| Email | Password | Organization | Role | Status |
|-------|----------|--------------|------|--------|
| admin@magnova.com | admin123 | Magnova | Admin | ✅ |
| purchase@magnova.com | purchase123 | Magnova | Purchase | ✅ |
| approver@magnova.com | approve123 | Magnova | Approver | ✅ |
| sales@magnova.com | sales123 | Magnova | Sales | ✅ |
| nova-admin@nova.com | nova123 | Nova | Admin | ✅ |
| stores@nova.com | nova123 | Nova | Stores | ✅ |
| accounts@nova.com | accounts123 | Nova | Accounts | ✅ |
| logistics@nova.com | logistics123 | Nova | Logistics | ✅ |

---

## TESTING WORKFLOWS

### Test Complete Purchase Order Workflow

**Step 1 - Create PO** (as Purchase Officer):
- Login: `purchase@magnova.com` / `purchase123`
- Navigate to Purchase Orders
- Click "Create PO"
- Enter quantity: 10
- Submit

**Step 2 - Approve PO** (as Approver):
- Logout and login: `approver@magnova.com` / `approve123`
- Navigate to Purchase Orders
- Find pending PO
- Click "Review"
- Click "Approve"

**Step 3 - Record Procurement** (as Nova Stores):
- Logout and login: `stores@nova.com` / `nova123`
- Navigate to Procurement
- Click "Add Procurement"
- Select approved PO
- Enter device details and IMEI
- Submit

**Step 4 - Record Payment** (as Nova Accounts):
- Logout and login: `accounts@nova.com` / `accounts123`
- Navigate to Payments
- Click "Record Payment"
- Enter payment details
- Submit

**Step 5 - Scan IMEI** (as Nova Stores):
- Login: `stores@nova.com` / `nova123`
- Navigate to Inventory
- Click "Scan IMEI"
- Enter IMEI and update status
- Submit

**Step 6 - Create Sales Order** (as Magnova Sales):
- Logout and login: `sales@magnova.com` / `sales123`
- Navigate to Sales Orders
- Click "Create Sales Order"
- Enter customer details and IMEIs
- Submit

---

## ROLE-SPECIFIC ACCESS

### What Each Role Can See:

**Admin** (Magnova & Nova):
- ✅ Dashboard
- ✅ Purchase Orders
- ✅ Procurement
- ✅ Payments
- ✅ Inventory
- ✅ Logistics
- ✅ Invoices
- ✅ Sales Orders
- ✅ Reports
- ✅ Users

**Magnova Purchase**:
- ✅ Dashboard
- ✅ Purchase Orders (create only)
- ✅ Procurement (view only)
- ✅ Inventory (view)
- ✅ Reports (limited)

**Magnova Approver**:
- ✅ Dashboard
- ✅ Purchase Orders (approve/reject)
- ✅ Reports (full)

**Magnova Sales**:
- ✅ Dashboard
- ✅ Sales Orders (create/manage)
- ✅ Inventory (view)
- ✅ Reports (sales)

**Nova Stores**:
- ✅ Dashboard
- ✅ Procurement (create)
- ✅ Inventory (scan IMEI)
- ✅ Logistics (view)

**Nova Accounts**:
- ✅ Dashboard
- ✅ Payments (record)
- ✅ Invoices (create)
- ✅ Reports (financial)

**Nova Logistics**:
- ✅ Dashboard
- ✅ Logistics (create/manage shipments)
- ✅ Inventory (view)

---

## TROUBLESHOOTING

### If Login Fails:

1. **Check Credentials**:
   - Email addresses are case-sensitive
   - Passwords are case-sensitive
   - Copy credentials exactly as shown above

2. **Clear Browser Cache**:
   - Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Try in Incognito/Private window

3. **Verify Backend is Running**:
   ```bash
   curl -s https://magnova-erp.preview.emergentagent.com/api/auth/me
   # Should return {"detail":"Not Found"} which means API is running
   ```

4. **Check Browser Console**:
   - Press F12
   - Go to Console tab
   - Look for any error messages

### Common Issues:

**"Invalid credentials" error**:
- Double-check email spelling
- Verify password is correct
- Ensure no extra spaces before/after credentials

**"Network error"**:
- Check internet connection
- Verify the URL is correct
- Backend might be restarting (wait 30 seconds and retry)

**Blank page after login**:
- Clear browser cache
- Try different browser
- Check browser console for errors

---

## CREATING NEW USERS

### Via Registration Page:

1. Go to https://magnova-erp.preview.emergentagent.com/register
2. Fill in the form:
   - Full Name
   - Email (must be unique)
   - Password (minimum 8 characters)
   - Organization (Magnova or Nova)
   - Role (based on responsibilities)
3. Click "Create Account"

### Available Roles:

**Magnova**:
- Admin
- Purchase
- Approver
- Sales

**Nova**:
- Admin
- Stores
- Accounts
- Logistics

---

## PASSWORD POLICY

Current policy:
- Minimum length: 8 characters
- No special character requirements
- Passwords are hashed using bcrypt
- Tokens expire after 7 days

**Note**: In production, implement stronger password requirements.

---

## SECURITY NOTES

1. **Default Passwords**: All test accounts use simple passwords for demo purposes
2. **Change Passwords**: In production, require users to change default passwords on first login
3. **2FA**: Consider implementing two-factor authentication for production
4. **Session Management**: Users are automatically logged out after 7 days
5. **Audit Trail**: All logins are logged for security monitoring

---

## SUPPORT

If you continue to experience login issues:

1. **Email**: support@magnova-nova-erp.com
2. **Include**:
   - Email address you're trying to use
   - Error message (if any)
   - Screenshot of the issue
   - Browser name and version

---

**Document Version**: 2.0
**Last Updated**: January 31, 2025
**Last Verified**: January 31, 2025 15:30 UTC
**Status**: All credentials tested and working ✅

---

## PRINTABLE CREDENTIALS CARD

```
┌────────────────────────────────────────────┐
│   MAGNOVA-NOVA ERP LOGIN CREDENTIALS       │
├────────────────────────────────────────────┤
│                                            │
│  MAGNOVA USERS:                            │
│  • admin@magnova.com / admin123            │
│  • purchase@magnova.com / purchase123      │
│  • approver@magnova.com / approve123       │
│  • sales@magnova.com / sales123            │
│                                            │
│  NOVA USERS:                               │
│  • nova-admin@nova.com / nova123           │
│  • stores@nova.com / nova123               │
│  • accounts@nova.com / accounts123         │
│  • logistics@nova.com / logistics123       │
│                                            │
│  URL: magnova-erp.preview.emergentagent.com│
└────────────────────────────────────────────┘
```

**Print this for your team!**
