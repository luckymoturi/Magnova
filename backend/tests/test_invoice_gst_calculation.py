"""
Test Invoice GST Calculation Feature
=====================================
Tests the new GST calculation logic where:
- User enters selling price (inclusive of GST)
- System calculates base price = selling_price / (1 + GST%/100)
- GST amount = selling_price - base_price
- Total = selling_price (the entered amount)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@magnova.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        return data["access_token"]


class TestInvoiceGSTCalculation:
    """Test Invoice GST calculation feature"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@magnova.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_invoice_with_18_percent_gst(self, auth_headers):
        """
        Test creating invoice with 18% GST
        Selling price = 11800, expected base = 10000, gst = 1800
        """
        # Frontend calculates: base_price = 11800 / 1.18 = 10000
        # Frontend calculates: gst_amount = 11800 - 10000 = 1800
        # Frontend sends: amount=10000, gst_amount=1800
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json={
            "invoice_type": "Store Invoice",
            "po_number": "N/A",
            "from_organization": "Nova Enterprises",
            "to_organization": "TEST_GST18_Customer",
            "amount": 10000,  # Base price (calculated by frontend)
            "gst_amount": 1800,  # GST amount (calculated by frontend)
            "gst_percentage": 18,
            "imei_list": [],
            "invoice_date": "2026-02-04T00:00:00Z",
            "description": "Test 18% GST calculation"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "invoice_id" in data
        assert "invoice_number" in data
        
        # Verify amounts
        assert data["amount"] == 10000, f"Base price should be 10000, got {data['amount']}"
        assert data["gst_amount"] == 1800, f"GST amount should be 1800, got {data['gst_amount']}"
        assert data["gst_percentage"] == 18, f"GST percentage should be 18, got {data['gst_percentage']}"
        assert data["total_amount"] == 11800, f"Total should be 11800, got {data['total_amount']}"
        
        print(f"✓ Invoice created: {data['invoice_number']}")
        print(f"  Base Price: ₹{data['amount']}")
        print(f"  GST ({data['gst_percentage']}%): ₹{data['gst_amount']}")
        print(f"  Total: ₹{data['total_amount']}")
    
    def test_create_invoice_with_5_percent_gst(self, auth_headers):
        """
        Test creating invoice with 5% GST
        Selling price = 10500, expected base = 10000, gst = 500
        """
        # Frontend calculates: base_price = 10500 / 1.05 = 10000
        # Frontend calculates: gst_amount = 10500 - 10000 = 500
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json={
            "invoice_type": "Store Invoice",
            "po_number": "N/A",
            "from_organization": "Nova Enterprises",
            "to_organization": "TEST_GST5_Customer",
            "amount": 10000,  # Base price
            "gst_amount": 500,  # GST amount
            "gst_percentage": 5,
            "imei_list": [],
            "invoice_date": "2026-02-04T00:00:00Z",
            "description": "Test 5% GST calculation"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify amounts
        assert data["amount"] == 10000
        assert data["gst_amount"] == 500
        assert data["gst_percentage"] == 5
        assert data["total_amount"] == 10500
        
        print(f"✓ Invoice created: {data['invoice_number']}")
        print(f"  Base Price: ₹{data['amount']}")
        print(f"  GST ({data['gst_percentage']}%): ₹{data['gst_amount']}")
        print(f"  Total: ₹{data['total_amount']}")
    
    def test_create_invoice_with_12_percent_gst(self, auth_headers):
        """
        Test creating invoice with 12% GST
        Selling price = 11200, expected base = 10000, gst = 1200
        """
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json={
            "invoice_type": "Store Invoice",
            "po_number": "N/A",
            "from_organization": "Nova Enterprises",
            "to_organization": "TEST_GST12_Customer",
            "amount": 10000,
            "gst_amount": 1200,
            "gst_percentage": 12,
            "imei_list": [],
            "invoice_date": "2026-02-04T00:00:00Z",
            "description": "Test 12% GST calculation"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["amount"] == 10000
        assert data["gst_amount"] == 1200
        assert data["gst_percentage"] == 12
        assert data["total_amount"] == 11200
    
    def test_create_invoice_with_28_percent_gst(self, auth_headers):
        """
        Test creating invoice with 28% GST
        Selling price = 12800, expected base = 10000, gst = 2800
        """
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json={
            "invoice_type": "Store Invoice",
            "po_number": "N/A",
            "from_organization": "Nova Enterprises",
            "to_organization": "TEST_GST28_Customer",
            "amount": 10000,
            "gst_amount": 2800,
            "gst_percentage": 28,
            "imei_list": [],
            "invoice_date": "2026-02-04T00:00:00Z",
            "description": "Test 28% GST calculation"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["amount"] == 10000
        assert data["gst_amount"] == 2800
        assert data["gst_percentage"] == 28
        assert data["total_amount"] == 12800
    
    def test_create_invoice_with_0_percent_gst(self, auth_headers):
        """
        Test creating invoice with 0% GST (exempt)
        Selling price = 10000, expected base = 10000, gst = 0
        """
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json={
            "invoice_type": "Store Invoice",
            "po_number": "N/A",
            "from_organization": "Nova Enterprises",
            "to_organization": "TEST_GST0_Customer",
            "amount": 10000,
            "gst_amount": 0,
            "gst_percentage": 0,
            "imei_list": [],
            "invoice_date": "2026-02-04T00:00:00Z",
            "description": "Test 0% GST (exempt)"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["amount"] == 10000
        assert data["gst_amount"] == 0
        assert data["gst_percentage"] == 0
        assert data["total_amount"] == 10000
    
    def test_get_invoices_list(self, auth_headers):
        """Test fetching invoices list with GST columns"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # Check that invoices have required GST fields
        if len(data) > 0:
            invoice = data[0]
            assert "amount" in invoice, "Invoice should have 'amount' (base price)"
            assert "gst_amount" in invoice, "Invoice should have 'gst_amount'"
            assert "gst_percentage" in invoice, "Invoice should have 'gst_percentage'"
            assert "total_amount" in invoice, "Invoice should have 'total_amount'"
            
            print(f"✓ Found {len(data)} invoices")
            print(f"  Sample invoice: {invoice.get('invoice_number')}")
            print(f"  Base Price: ₹{invoice.get('amount')}")
            print(f"  GST %: {invoice.get('gst_percentage')}%")
            print(f"  GST Amount: ₹{invoice.get('gst_amount')}")
            print(f"  Total: ₹{invoice.get('total_amount')}")


class TestGSTCalculationFormula:
    """Test the GST calculation formula used in frontend"""
    
    def test_18_percent_gst_formula(self):
        """
        Verify formula: base_price = selling_price / (1 + GST%/100)
        For 18% GST with selling_price = 11800
        """
        selling_price = 11800
        gst_percentage = 18
        
        base_price = selling_price / (1 + gst_percentage / 100)
        gst_amount = selling_price - base_price
        
        assert round(base_price, 2) == 10000.00, f"Base price should be 10000, got {base_price}"
        assert round(gst_amount, 2) == 1800.00, f"GST amount should be 1800, got {gst_amount}"
        
        print(f"✓ 18% GST Formula verified")
        print(f"  Selling Price: ₹{selling_price}")
        print(f"  Base Price: ₹{round(base_price, 2)}")
        print(f"  GST Amount: ₹{round(gst_amount, 2)}")
    
    def test_5_percent_gst_formula(self):
        """
        For 5% GST with selling_price = 10500
        """
        selling_price = 10500
        gst_percentage = 5
        
        base_price = selling_price / (1 + gst_percentage / 100)
        gst_amount = selling_price - base_price
        
        assert round(base_price, 2) == 10000.00
        assert round(gst_amount, 2) == 500.00
        
        print(f"✓ 5% GST Formula verified")
    
    def test_12_percent_gst_formula(self):
        """
        For 12% GST with selling_price = 11200
        """
        selling_price = 11200
        gst_percentage = 12
        
        base_price = selling_price / (1 + gst_percentage / 100)
        gst_amount = selling_price - base_price
        
        assert round(base_price, 2) == 10000.00
        assert round(gst_amount, 2) == 1200.00
    
    def test_28_percent_gst_formula(self):
        """
        For 28% GST with selling_price = 12800
        """
        selling_price = 12800
        gst_percentage = 28
        
        base_price = selling_price / (1 + gst_percentage / 100)
        gst_amount = selling_price - base_price
        
        assert round(base_price, 2) == 10000.00
        assert round(gst_amount, 2) == 2800.00


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
