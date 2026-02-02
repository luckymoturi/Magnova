"""
Backend API Tests for Delete Endpoints (Admin Only) and New Payment Features
Tests: Admin-only DELETE, Internal/External Payments, Payment Summary
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USER = {
    "email": "admin@magnova.com",
    "password": "admin123"
}

NON_ADMIN_USER = {
    "email": "stores@nova.com",
    "password": "nova123"
}


class TestAdminDeleteEndpoints:
    """Test DELETE endpoints - Admin only access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin and non-admin tokens"""
        # Admin login
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["access_token"]
            self.admin_headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Admin authentication failed")
        
        # Non-admin login - create user if doesn't exist
        non_admin_response = requests.post(f"{BASE_URL}/api/auth/login", json=NON_ADMIN_USER)
        if non_admin_response.status_code == 200:
            self.non_admin_token = non_admin_response.json()["access_token"]
            self.non_admin_headers = {
                "Authorization": f"Bearer {self.non_admin_token}",
                "Content-Type": "application/json"
            }
        else:
            # Try to register non-admin user
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": NON_ADMIN_USER["email"],
                "password": NON_ADMIN_USER["password"],
                "name": "Stores User",
                "organization": "Nova",
                "role": "Stores"
            })
            if register_response.status_code == 200:
                self.non_admin_token = register_response.json()["access_token"]
                self.non_admin_headers = {
                    "Authorization": f"Bearer {self.non_admin_token}",
                    "Content-Type": "application/json"
                }
            else:
                pytest.skip("Non-admin user setup failed")
    
    def test_delete_po_admin_success(self):
        """Test admin can delete PO"""
        # First create a PO to delete
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Head Office",
            "items": [{
                "sl_no": 1, "vendor": "TEST_DELETE_Vendor", "location": "Mumbai",
                "brand": "Test", "model": "Delete", "storage": None, "colour": None,
                "imei": None, "qty": 1, "rate": 1000.00, "po_value": 1000.00
            }],
            "notes": "TEST_DELETE_PO"
        }
        create_response = requests.post(f"{BASE_URL}/api/purchase-orders", headers=self.admin_headers, json=po_data)
        assert create_response.status_code == 200, f"Failed to create PO: {create_response.text}"
        po_number = create_response.json()["po_number"]
        
        # Admin deletes PO
        delete_response = requests.delete(f"{BASE_URL}/api/purchase-orders/{po_number}", headers=self.admin_headers)
        assert delete_response.status_code == 200, f"Admin delete failed: {delete_response.text}"
        assert "deleted" in delete_response.json().get("message", "").lower()
        
        # Verify PO is deleted
        get_response = requests.get(f"{BASE_URL}/api/purchase-orders/{po_number}", headers=self.admin_headers)
        assert get_response.status_code == 404
    
    def test_delete_po_non_admin_forbidden(self):
        """Test non-admin cannot delete PO - should return 403"""
        # First create a PO with admin
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Head Office",
            "items": [{
                "sl_no": 1, "vendor": "TEST_NONADMIN_Vendor", "location": "Delhi",
                "brand": "Test", "model": "NonAdmin", "storage": None, "colour": None,
                "imei": None, "qty": 1, "rate": 1000.00, "po_value": 1000.00
            }],
            "notes": "TEST_NONADMIN_DELETE"
        }
        create_response = requests.post(f"{BASE_URL}/api/purchase-orders", headers=self.admin_headers, json=po_data)
        assert create_response.status_code == 200
        po_number = create_response.json()["po_number"]
        
        # Non-admin tries to delete - should fail with 403
        delete_response = requests.delete(f"{BASE_URL}/api/purchase-orders/{po_number}", headers=self.non_admin_headers)
        assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}: {delete_response.text}"
        
        # Cleanup - admin deletes
        requests.delete(f"{BASE_URL}/api/purchase-orders/{po_number}", headers=self.admin_headers)
    
    def test_delete_procurement_non_admin_forbidden(self):
        """Test non-admin cannot delete procurement - should return 403"""
        # Create procurement with admin first
        # First need a PO
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Head Office",
            "items": [{
                "sl_no": 1, "vendor": "TEST_PROC_Vendor", "location": "Chennai",
                "brand": "Samsung", "model": "Galaxy", "storage": "128GB", "colour": "Black",
                "imei": None, "qty": 1, "rate": 50000.00, "po_value": 50000.00
            }],
            "notes": "TEST_PROC_DELETE"
        }
        po_response = requests.post(f"{BASE_URL}/api/purchase-orders", headers=self.admin_headers, json=po_data)
        assert po_response.status_code == 200
        po_number = po_response.json()["po_number"]
        
        # Create procurement
        proc_data = {
            "po_number": po_number,
            "vendor_name": "TEST_PROC_Vendor",
            "store_location": "Chennai",
            "imei": f"TEST_PROC_{datetime.now().timestamp()}",
            "device_model": "Samsung Galaxy",
            "quantity": 1,
            "purchase_price": 50000.00
        }
        proc_response = requests.post(f"{BASE_URL}/api/procurement", headers=self.admin_headers, json=proc_data)
        assert proc_response.status_code == 200
        procurement_id = proc_response.json()["procurement_id"]
        
        # Non-admin tries to delete - should fail with 403
        delete_response = requests.delete(f"{BASE_URL}/api/procurement/{procurement_id}", headers=self.non_admin_headers)
        assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procurement/{procurement_id}", headers=self.admin_headers)
        requests.delete(f"{BASE_URL}/api/purchase-orders/{po_number}", headers=self.admin_headers)
    
    def test_delete_inventory_non_admin_forbidden(self):
        """Test non-admin cannot delete inventory - should return 403"""
        # Get any existing inventory item
        inv_response = requests.get(f"{BASE_URL}/api/inventory", headers=self.admin_headers)
        if inv_response.status_code == 200 and len(inv_response.json()) > 0:
            imei = inv_response.json()[0]["imei"]
            
            # Non-admin tries to delete - should fail with 403
            delete_response = requests.delete(f"{BASE_URL}/api/inventory/{imei}", headers=self.non_admin_headers)
            assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}"
        else:
            pytest.skip("No inventory items to test delete")
    
    def test_delete_shipment_non_admin_forbidden(self):
        """Test non-admin cannot delete shipment - should return 403"""
        # Get any existing shipment
        ship_response = requests.get(f"{BASE_URL}/api/logistics/shipments", headers=self.admin_headers)
        if ship_response.status_code == 200 and len(ship_response.json()) > 0:
            shipment_id = ship_response.json()[0]["shipment_id"]
            
            # Non-admin tries to delete - should fail with 403
            delete_response = requests.delete(f"{BASE_URL}/api/logistics/shipments/{shipment_id}", headers=self.non_admin_headers)
            assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}"
        else:
            pytest.skip("No shipments to test delete")
    
    def test_delete_payment_non_admin_forbidden(self):
        """Test non-admin cannot delete payment - should return 403"""
        # Get any existing payment
        pay_response = requests.get(f"{BASE_URL}/api/payments", headers=self.admin_headers)
        if pay_response.status_code == 200 and len(pay_response.json()) > 0:
            payment_id = pay_response.json()[0]["payment_id"]
            
            # Non-admin tries to delete - should fail with 403
            delete_response = requests.delete(f"{BASE_URL}/api/payments/{payment_id}", headers=self.non_admin_headers)
            assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}"
        else:
            pytest.skip("No payments to test delete")
    
    def test_delete_invoice_non_admin_forbidden(self):
        """Test non-admin cannot delete invoice - should return 403"""
        # Get any existing invoice
        inv_response = requests.get(f"{BASE_URL}/api/invoices", headers=self.admin_headers)
        if inv_response.status_code == 200 and len(inv_response.json()) > 0:
            invoice_id = inv_response.json()[0]["invoice_id"]
            
            # Non-admin tries to delete - should fail with 403
            delete_response = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=self.non_admin_headers)
            assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}"
        else:
            pytest.skip("No invoices to test delete")
    
    def test_delete_sales_order_non_admin_forbidden(self):
        """Test non-admin cannot delete sales order - should return 403"""
        # Get any existing sales order
        so_response = requests.get(f"{BASE_URL}/api/sales-orders", headers=self.admin_headers)
        if so_response.status_code == 200 and len(so_response.json()) > 0:
            so_number = so_response.json()[0]["so_number"]
            
            # Non-admin tries to delete - should fail with 403
            delete_response = requests.delete(f"{BASE_URL}/api/sales-orders/{so_number}", headers=self.non_admin_headers)
            assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}"
        else:
            pytest.skip("No sales orders to test delete")


class TestInternalExternalPayments:
    """Test Internal and External Payment endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token and create test PO"""
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["access_token"]
            self.admin_headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Admin authentication failed")
        
        # Create a test PO for payment tests
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Head Office",
            "items": [{
                "sl_no": 1, "vendor": "TEST_PAYMENT_Vendor", "location": "Mumbai",
                "brand": "Apple", "model": "iPhone 15", "storage": "256GB", "colour": "Black",
                "imei": None, "qty": 10, "rate": 80000.00, "po_value": 800000.00
            }],
            "notes": "TEST_PAYMENT_PO"
        }
        po_response = requests.post(f"{BASE_URL}/api/purchase-orders", headers=self.admin_headers, json=po_data)
        if po_response.status_code == 200:
            self.test_po_number = po_response.json()["po_number"]
            self.test_po_value = po_response.json()["total_value"]
        else:
            pytest.skip("Failed to create test PO")
    
    def test_create_internal_payment(self):
        """Test creating internal payment (Magnova → Nova)"""
        payment_data = {
            "po_number": self.test_po_number,
            "payee_name": "Nova Enterprises",
            "payee_account": "NOVA-ACC-001",
            "payee_bank": "HDFC Bank",
            "payment_mode": "Bank Transfer",
            "amount": 500000.00,
            "transaction_ref": "TEST_UTR_001",
            "payment_date": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/internal", headers=self.admin_headers, json=payment_data)
        assert response.status_code == 200, f"Failed to create internal payment: {response.text}"
        
        data = response.json()
        assert data["payment_type"] == "internal"
        assert data["po_number"] == self.test_po_number
        assert data["payee_name"] == "Nova Enterprises"
        assert data["payee_account"] == "NOVA-ACC-001"
        assert data["payee_bank"] == "HDFC Bank"
        assert data["amount"] == 500000.00
        assert data["status"] == "Completed"
        
        # Store payment_id for cleanup
        self.internal_payment_id = data["payment_id"]
    
    def test_create_external_payment(self):
        """Test creating external payment (Nova → Vendor/CC)"""
        # First create internal payment
        internal_data = {
            "po_number": self.test_po_number,
            "payee_name": "Nova Enterprises",
            "payee_account": "NOVA-ACC-002",
            "payee_bank": "ICICI Bank",
            "payment_mode": "RTGS",
            "amount": 300000.00,
            "transaction_ref": "TEST_UTR_002",
            "payment_date": datetime.now().isoformat()
        }
        requests.post(f"{BASE_URL}/api/payments/internal", headers=self.admin_headers, json=internal_data)
        
        # Now create external payment
        external_data = {
            "po_number": self.test_po_number,
            "payee_type": "vendor",
            "payee_name": "TEST_PAYMENT_Vendor",
            "account_number": "1234567890",
            "ifsc_code": "HDFC0001234",
            "location": "Mumbai",
            "payment_mode": "NEFT",
            "amount": 200000.00,
            "utr_number": "TEST_EXT_UTR_001",
            "payment_date": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/external", headers=self.admin_headers, json=external_data)
        assert response.status_code == 200, f"Failed to create external payment: {response.text}"
        
        data = response.json()
        assert data["payment_type"] == "external"
        assert data["payee_type"] == "vendor"
        assert data["payee_name"] == "TEST_PAYMENT_Vendor"
        assert data["account_number"] == "1234567890"
        assert data["ifsc_code"] == "HDFC0001234"
        assert data["location"] == "Mumbai"
        assert data["amount"] == 200000.00
        assert data["utr_number"] == "TEST_EXT_UTR_001"
    
    def test_external_payment_cannot_exceed_internal(self):
        """Test external payments cannot exceed internal payment amount"""
        # Create internal payment of 100000
        internal_data = {
            "po_number": self.test_po_number,
            "payee_name": "Nova Enterprises",
            "payee_account": "NOVA-ACC-003",
            "payee_bank": "SBI",
            "payment_mode": "UPI",
            "amount": 100000.00,
            "transaction_ref": "TEST_UTR_003",
            "payment_date": datetime.now().isoformat()
        }
        requests.post(f"{BASE_URL}/api/payments/internal", headers=self.admin_headers, json=internal_data)
        
        # Try to create external payment exceeding internal amount
        external_data = {
            "po_number": self.test_po_number,
            "payee_type": "cc",
            "payee_name": "CC Holder",
            "account_number": "9876543210",
            "ifsc_code": "SBIN0001234",
            "location": "Delhi",
            "payment_mode": "Bank Transfer",
            "amount": 1000000.00,  # Exceeds internal payment
            "utr_number": "TEST_EXT_UTR_EXCEED",
            "payment_date": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/external", headers=self.admin_headers, json=external_data)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "exceed" in response.json().get("detail", "").lower() or "cannot" in response.json().get("detail", "").lower()
    
    def test_payment_summary_endpoint(self):
        """Test payment summary endpoint returns correct balances"""
        # Create internal payment
        internal_data = {
            "po_number": self.test_po_number,
            "payee_name": "Nova Enterprises",
            "payee_account": "NOVA-ACC-004",
            "payee_bank": "Axis Bank",
            "payment_mode": "RTGS",
            "amount": 200000.00,
            "transaction_ref": "TEST_UTR_004",
            "payment_date": datetime.now().isoformat()
        }
        requests.post(f"{BASE_URL}/api/payments/internal", headers=self.admin_headers, json=internal_data)
        
        # Create external payment
        external_data = {
            "po_number": self.test_po_number,
            "payee_type": "vendor",
            "payee_name": "Vendor ABC",
            "account_number": "1111222233",
            "ifsc_code": "AXIS0001234",
            "location": "Bangalore",
            "payment_mode": "NEFT",
            "amount": 50000.00,
            "utr_number": "TEST_EXT_UTR_002",
            "payment_date": datetime.now().isoformat()
        }
        requests.post(f"{BASE_URL}/api/payments/external", headers=self.admin_headers, json=external_data)
        
        # Get payment summary
        response = requests.get(f"{BASE_URL}/api/payments/summary/{self.test_po_number}", headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to get payment summary: {response.text}"
        
        data = response.json()
        assert data["po_number"] == self.test_po_number
        assert "internal_paid" in data
        assert "external_paid" in data
        assert "external_remaining" in data
        assert data["internal_paid"] >= 200000.00  # At least our payment
        assert data["external_paid"] >= 50000.00  # At least our payment
        assert data["external_remaining"] == data["internal_paid"] - data["external_paid"]
    
    def test_get_payments_list(self):
        """Test GET /payments returns list with payment_type field"""
        response = requests.get(f"{BASE_URL}/api/payments", headers=self.admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check that payments have payment_type field
        for payment in data:
            assert "payment_type" in payment
            assert payment["payment_type"] in ["internal", "external", None]  # None for legacy payments
    
    def test_get_payments_filter_by_type(self):
        """Test GET /payments with payment_type filter"""
        # Get internal payments
        response = requests.get(f"{BASE_URL}/api/payments?payment_type=internal", headers=self.admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        for payment in data:
            assert payment.get("payment_type") == "internal"
        
        # Get external payments
        response = requests.get(f"{BASE_URL}/api/payments?payment_type=external", headers=self.admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        for payment in data:
            assert payment.get("payment_type") == "external"


class TestDuplicatePOPrevention:
    """Test duplicate PO number prevention"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token"""
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["access_token"]
            self.admin_headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Admin authentication failed")
    
    def test_po_numbers_are_unique(self):
        """Test that PO numbers are unique across multiple creations"""
        po_numbers = []
        
        # Create multiple POs first (without deleting in between)
        for i in range(3):
            po_data = {
                "po_date": datetime.now().isoformat(),
                "purchase_office": "Magnova Head Office",
                "items": [{
                    "sl_no": 1, "vendor": f"TEST_UNIQUE_Vendor_{i}", "location": "Mumbai",
                    "brand": "Test", "model": f"Unique_{i}", "storage": None, "colour": None,
                    "imei": None, "qty": 1, "rate": 1000.00, "po_value": 1000.00
                }],
                "notes": f"TEST_UNIQUE_PO_{i}"
            }
            response = requests.post(f"{BASE_URL}/api/purchase-orders", headers=self.admin_headers, json=po_data)
            assert response.status_code == 200, f"Failed to create PO {i}: {response.text}"
            
            po_number = response.json()["po_number"]
            po_numbers.append(po_number)
        
        # Check all PO numbers are unique
        assert len(po_numbers) == len(set(po_numbers)), f"Duplicate PO numbers found: {po_numbers}"
        
        # Cleanup - delete all created POs
        for po_number in po_numbers:
            requests.delete(f"{BASE_URL}/api/purchase-orders/{po_number}", headers=self.admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
