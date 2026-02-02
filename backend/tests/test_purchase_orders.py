"""
Backend API Tests for Purchase Orders
Tests: Authentication, PO Creation with Line Items, PO Retrieval, PO Approval
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADMIN = {
    "email": "admin@magnova.com",
    "password": "admin123"
}

class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == TEST_ADMIN["email"]
        assert data["user"]["organization"] == "Magnova"
        assert data["user"]["role"] == "Admin"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_get_me_authenticated(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN)
        token = login_response.json()["access_token"]
        
        # Get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_ADMIN["email"]
    
    def test_get_me_unauthenticated(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]


class TestPurchaseOrdersAPI:
    """Purchase Order CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token before each test"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN)
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_get_purchase_orders_list(self):
        """Test GET /purchase-orders returns list"""
        response = requests.get(
            f"{BASE_URL}/api/purchase-orders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get POs: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_create_purchase_order_with_line_items(self):
        """Test POST /purchase-orders creates PO with line items"""
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Head Office",
            "items": [
                {
                    "sl_no": 1,
                    "vendor": "TEST_Vendor_A",
                    "location": "Mumbai",
                    "brand": "Samsung",
                    "model": "Galaxy S24",
                    "storage": "256GB",
                    "colour": "Black",
                    "imei": "TEST_123456789012345",
                    "qty": 5,
                    "rate": 50000.00,
                    "po_value": 250000.00
                },
                {
                    "sl_no": 2,
                    "vendor": "TEST_Vendor_B",
                    "location": "Delhi",
                    "brand": "Apple",
                    "model": "iPhone 15",
                    "storage": "128GB",
                    "colour": "Blue",
                    "imei": "TEST_987654321098765",
                    "qty": 3,
                    "rate": 80000.00,
                    "po_value": 240000.00
                }
            ],
            "notes": "TEST_PO_Creation"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purchase-orders",
            headers=self.headers,
            json=po_data
        )
        assert response.status_code == 200, f"Failed to create PO: {response.text}"
        
        data = response.json()
        # Verify PO structure
        assert "po_number" in data, "Missing po_number"
        assert "po_date" in data, "Missing po_date"
        assert "purchase_office" in data, "Missing purchase_office"
        assert data["purchase_office"] == "Magnova Head Office"
        assert "items" in data, "Missing items"
        assert len(data["items"]) == 2, f"Expected 2 items, got {len(data['items'])}"
        
        # Verify totals calculated correctly
        assert data["total_quantity"] == 8, f"Expected total_quantity=8, got {data['total_quantity']}"
        assert data["total_value"] == 490000.00, f"Expected total_value=490000, got {data['total_value']}"
        
        # Verify line item fields
        item1 = data["items"][0]
        assert item1["vendor"] == "TEST_Vendor_A"
        assert item1["brand"] == "Samsung"
        assert item1["model"] == "Galaxy S24"
        assert item1["storage"] == "256GB"
        assert item1["colour"] == "Black"
        assert item1["qty"] == 5
        assert item1["rate"] == 50000.00
        assert item1["po_value"] == 250000.00
        
        # Store PO number for later tests
        self.created_po_number = data["po_number"]
        return data["po_number"]
    
    def test_create_po_with_different_purchase_offices(self):
        """Test creating POs with different purchase office options"""
        offices = ["Magnova Head Office", "Magnova Branch Office", "Nova Enterprises"]
        
        for office in offices:
            po_data = {
                "po_date": datetime.now().isoformat(),
                "purchase_office": office,
                "items": [
                    {
                        "sl_no": 1,
                        "vendor": f"TEST_Vendor_{office[:3]}",
                        "location": "Test Location",
                        "brand": "Test Brand",
                        "model": "Test Model",
                        "storage": None,
                        "colour": None,
                        "imei": None,
                        "qty": 1,
                        "rate": 1000.00,
                        "po_value": 1000.00
                    }
                ],
                "notes": f"TEST_Office_{office}"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/purchase-orders",
                headers=self.headers,
                json=po_data
            )
            assert response.status_code == 200, f"Failed to create PO for {office}: {response.text}"
            data = response.json()
            assert data["purchase_office"] == office, f"Purchase office mismatch for {office}"
    
    def test_get_purchase_order_by_number(self):
        """Test GET /purchase-orders/{po_number} returns PO details"""
        # First create a PO
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Head Office",
            "items": [
                {
                    "sl_no": 1,
                    "vendor": "TEST_GetByNumber_Vendor",
                    "location": "Chennai",
                    "brand": "OnePlus",
                    "model": "12",
                    "storage": "512GB",
                    "colour": "Green",
                    "imei": "TEST_111222333444555",
                    "qty": 2,
                    "rate": 60000.00,
                    "po_value": 120000.00
                }
            ],
            "notes": "TEST_GetByNumber"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/purchase-orders",
            headers=self.headers,
            json=po_data
        )
        assert create_response.status_code == 200
        po_number = create_response.json()["po_number"]
        
        # Now get the PO by number
        get_response = requests.get(
            f"{BASE_URL}/api/purchase-orders/{po_number}",
            headers=self.headers
        )
        assert get_response.status_code == 200, f"Failed to get PO: {get_response.text}"
        
        data = get_response.json()
        assert data["po_number"] == po_number
        assert data["purchase_office"] == "Magnova Head Office"
        assert len(data["items"]) == 1
        assert data["items"][0]["vendor"] == "TEST_GetByNumber_Vendor"
    
    def test_get_nonexistent_po(self):
        """Test GET /purchase-orders/{po_number} with invalid PO number"""
        response = requests.get(
            f"{BASE_URL}/api/purchase-orders/PO-INVALID-99999",
            headers=self.headers
        )
        assert response.status_code == 404
    
    def test_po_list_contains_new_columns(self):
        """Test that PO list returns all required columns"""
        response = requests.get(
            f"{BASE_URL}/api/purchase-orders",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            po = data[0]
            # Verify all required columns are present
            required_fields = [
                "po_number", "po_date", "purchase_office", "created_by_name",
                "total_quantity", "total_value", "approval_status", "items"
            ]
            for field in required_fields:
                assert field in po, f"Missing field: {field}"
    
    def test_po_approval_workflow(self):
        """Test PO approval and rejection workflow"""
        # Create a PO first
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Head Office",
            "items": [
                {
                    "sl_no": 1,
                    "vendor": "TEST_Approval_Vendor",
                    "location": "Bangalore",
                    "brand": "Xiaomi",
                    "model": "14",
                    "storage": "256GB",
                    "colour": "White",
                    "imei": None,
                    "qty": 10,
                    "rate": 45000.00,
                    "po_value": 450000.00
                }
            ],
            "notes": "TEST_Approval"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/purchase-orders",
            headers=self.headers,
            json=po_data
        )
        assert create_response.status_code == 200
        po_number = create_response.json()["po_number"]
        
        # Verify initial status is Pending
        get_response = requests.get(
            f"{BASE_URL}/api/purchase-orders/{po_number}",
            headers=self.headers
        )
        assert get_response.json()["approval_status"] == "Pending"
        
        # Approve the PO
        approve_response = requests.post(
            f"{BASE_URL}/api/purchase-orders/{po_number}/approve",
            headers=self.headers,
            json={"action": "approve"}
        )
        assert approve_response.status_code == 200, f"Failed to approve: {approve_response.text}"
        
        # Verify status changed to Approved
        get_response = requests.get(
            f"{BASE_URL}/api/purchase-orders/{po_number}",
            headers=self.headers
        )
        assert get_response.json()["approval_status"] == "Approved"
    
    def test_po_rejection_with_reason(self):
        """Test PO rejection with reason"""
        # Create a PO
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Nova Enterprises",
            "items": [
                {
                    "sl_no": 1,
                    "vendor": "TEST_Rejection_Vendor",
                    "location": "Hyderabad",
                    "brand": "Vivo",
                    "model": "X100",
                    "storage": "128GB",
                    "colour": "Red",
                    "imei": None,
                    "qty": 5,
                    "rate": 35000.00,
                    "po_value": 175000.00
                }
            ],
            "notes": "TEST_Rejection"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/purchase-orders",
            headers=self.headers,
            json=po_data
        )
        assert create_response.status_code == 200
        po_number = create_response.json()["po_number"]
        
        # Reject the PO
        reject_response = requests.post(
            f"{BASE_URL}/api/purchase-orders/{po_number}/approve",
            headers=self.headers,
            json={
                "action": "reject",
                "rejection_reason": "TEST_Budget exceeded"
            }
        )
        assert reject_response.status_code == 200
        
        # Verify status and rejection reason
        get_response = requests.get(
            f"{BASE_URL}/api/purchase-orders/{po_number}",
            headers=self.headers
        )
        data = get_response.json()
        assert data["approval_status"] == "Rejected"
        assert data["rejection_reason"] == "TEST_Budget exceeded"


class TestPOLineItemValidation:
    """Tests for PO line item validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN)
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Authentication failed")
    
    def test_create_po_with_optional_fields_null(self):
        """Test creating PO with optional fields as null"""
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Head Office",
            "items": [
                {
                    "sl_no": 1,
                    "vendor": "TEST_Optional_Vendor",
                    "location": "Pune",
                    "brand": "Realme",
                    "model": "GT5",
                    "storage": None,  # Optional
                    "colour": None,   # Optional
                    "imei": None,     # Optional
                    "qty": 1,
                    "rate": 25000.00,
                    "po_value": 25000.00
                }
            ],
            "notes": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purchase-orders",
            headers=self.headers,
            json=po_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["items"][0]["storage"] is None
        assert data["items"][0]["colour"] is None
        assert data["items"][0]["imei"] is None
    
    def test_create_po_with_multiple_line_items(self):
        """Test creating PO with multiple line items and verify totals"""
        items = []
        expected_qty = 0
        expected_value = 0
        
        for i in range(5):
            qty = (i + 1) * 2
            rate = 10000.00 * (i + 1)
            po_value = qty * rate
            expected_qty += qty
            expected_value += po_value
            
            items.append({
                "sl_no": i + 1,
                "vendor": f"TEST_Multi_Vendor_{i}",
                "location": f"Location_{i}",
                "brand": f"Brand_{i}",
                "model": f"Model_{i}",
                "storage": f"{64 * (i + 1)}GB",
                "colour": ["Black", "White", "Blue", "Red", "Green"][i],
                "imei": f"TEST_{i}00000000000000",
                "qty": qty,
                "rate": rate,
                "po_value": po_value
            })
        
        po_data = {
            "po_date": datetime.now().isoformat(),
            "purchase_office": "Magnova Branch Office",
            "items": items,
            "notes": "TEST_MultipleItems"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purchase-orders",
            headers=self.headers,
            json=po_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["items"]) == 5
        assert data["total_quantity"] == expected_qty
        assert data["total_value"] == expected_value


class TestDashboardAndReports:
    """Tests for dashboard and reports endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN)
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Authentication failed")
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/reports/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "total_pos", "pending_pos", "total_procurement",
            "total_inventory", "available_inventory", "total_sales"
        ]
        for field in required_fields:
            assert field in data, f"Missing dashboard field: {field}"
    
    def test_audit_logs(self):
        """Test audit logs endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/audit-logs",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
