"""
Seed script to populate MongoDB with fake data for Magnova Mobile Purchase System
Run this script to insert bulk fake data into your MongoDB database
"""

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import os
import asyncio
import random
from uuid import uuid4

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Sample data arrays
BRANDS = ["Apple", "Samsung", "Xiaomi", "OnePlus", "Vivo", "Oppo", "Realme", "Motorola"]
MODELS = {
    "Apple": ["iPhone 15", "iPhone 15 Pro", "iPhone 14", "iPhone 13"],
    "Samsung": ["Galaxy S23", "Galaxy S23 Ultra", "Galaxy A54", "Galaxy M34"],
    "Xiaomi": ["Redmi Note 13", "Redmi 13C", "Mi 11X", "Poco X6"],
    "OnePlus": ["OnePlus 11", "OnePlus Nord 3", "OnePlus 12", "OnePlus Nord CE3"],
    "Vivo": ["V29", "V27", "Y100", "T2"],
    "Oppo": ["Reno 10", "A78", "F23", "Find N3"],
    "Realme": ["Realme 11", "Realme Narzo 60", "Realme GT 3", "Realme C55"],
    "Motorola": ["Edge 40", "Moto G84", "Moto G54", "Edge 30"]
}
STORAGE_OPTIONS = ["64GB", "128GB", "256GB", "512GB", "1TB"]
COLORS = ["Black", "White", "Blue", "Green", "Purple", "Red", "Gold", "Silver"]
VENDORS = ["Mobile Distributors Ltd", "Tech Supplies Inc", "Phone Wholesale Co", "Gadget Traders", "Digital Devices Ltd"]
LOCATIONS = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"]
ROLES = ["admin", "manager", "procurement_officer", "sales_officer", "logistics_officer"]
ORGANIZATIONS = ["Magnova", "Nova"]
TRANSPORTERS = ["BlueDart", "DTDC", "Delhivery", "FedEx", "Ekart", "Ecom Express"]

def generate_imei():
    """Generate a fake IMEI number (15 digits)"""
    return ''.join([str(random.randint(0, 9)) for _ in range(15)])

def generate_po_number():
    """Generate a Purchase Order number"""
    return f"PO-{random.randint(1000, 9999)}-{random.randint(100, 999)}"

def generate_invoice_number():
    """Generate an Invoice number"""
    return f"INV-{random.randint(10000, 99999)}"

def generate_so_number():
    """Generate a Sales Order number"""
    return f"SO-{random.randint(1000, 9999)}"

def random_date(start_days_ago=180, end_days_ago=0):
    """Generate a random date within the specified range"""
    start = datetime.now(timezone.utc) - timedelta(days=start_days_ago)
    end = datetime.now(timezone.utc) - timedelta(days=end_days_ago)
    return start + (end - start) * random.random()

async def seed_users():
    """Create sample users"""
    print("Seeding users...")
    users = []
    
    # Create admin users
    admin_users = [
        {"name": "Admin User", "email": "admin@magnova.com", "role": "admin", "organization": "Magnova"},
        {"name": "Manager User", "email": "manager@magnova.com", "role": "manager", "organization": "Magnova"},
        {"name": "Nova Admin", "email": "admin@nova.com", "role": "admin", "organization": "Nova"},
    ]
    
    for user_data in admin_users:
        user = {
            "user_id": str(uuid4()),
            "email": user_data["email"],
            "password": pwd_context.hash("password123"),
            "name": user_data["name"],
            "organization": user_data["organization"],
            "role": user_data["role"],
            "created_at": random_date(365, 180).isoformat()
        }
        users.append(user)
    
    # Create additional random users
    for i in range(17):
        user = {
            "user_id": str(uuid4()),
            "email": f"user{i+1}@{random.choice(['magnova.com', 'nova.com'])}",
            "password": pwd_context.hash("password123"),
            "name": f"User {i+1}",
            "organization": random.choice(ORGANIZATIONS),
            "role": random.choice(ROLES),
            "created_at": random_date(365, 30).isoformat()
        }
        users.append(user)
    
    await db.users.delete_many({})
    await db.users.insert_many(users)
    print(f"✓ Inserted {len(users)} users")
    return users

async def seed_purchase_orders(users):
    """Create sample purchase orders"""
    print("Seeding purchase orders...")
    pos = []
    
    for i in range(50):
        created_by = random.choice([u for u in users if u['organization'] == 'Magnova'])
        po_date = random_date(120, 10)
        
        # Generate 3-10 line items per PO
        num_items = random.randint(3, 10)
        items = []
        total_quantity = 0
        total_value = 0
        
        for j in range(num_items):
            brand = random.choice(BRANDS)
            model = random.choice(MODELS[brand])
            rate = random.uniform(15000, 85000)
            qty = random.randint(1, 5)
            po_value = rate * qty
            
            item = {
                "sl_no": j + 1,
                "vendor": random.choice(VENDORS),
                "location": random.choice(LOCATIONS),
                "brand": brand,
                "model": model,
                "storage": random.choice(STORAGE_OPTIONS),
                "colour": random.choice(COLORS),
                "imei": None,
                "qty": qty,
                "rate": round(rate, 2),
                "po_value": round(po_value, 2)
            }
            items.append(item)
            total_quantity += qty
            total_value += po_value
        
        statuses = ["draft", "pending_approval", "approved", "completed"]
        status = random.choice(statuses)
        approval_status = "approved" if status in ["approved", "completed"] else random.choice(["pending", "approved", "rejected"])
        
        po = {
            "po_id": str(uuid4()),
            "po_number": generate_po_number(),
            "po_date": po_date.isoformat(),
            "purchase_office": random.choice(LOCATIONS),
            "created_by": created_by["user_id"],
            "created_by_name": created_by["name"],
            "organization": created_by["organization"],
            "status": status,
            "total_quantity": total_quantity,
            "total_value": round(total_value, 2),
            "items": items,
            "notes": f"Purchase order for {num_items} different items",
            "approval_status": approval_status,
            "approved_by": random.choice(users)["user_id"] if approval_status == "approved" else None,
            "approved_at": (po_date + timedelta(hours=random.randint(1, 48))).isoformat() if approval_status == "approved" else None,
            "rejection_reason": None,
            "created_at": po_date.isoformat(),
            "updated_at": (po_date + timedelta(days=random.randint(1, 5))).isoformat()
        }
        pos.append(po)
    
    await db.purchase_orders.delete_many({})
    await db.purchase_orders.insert_many(pos)
    print(f"✓ Inserted {len(pos)} purchase orders")
    return pos

async def seed_imei_inventory(pos, users):
    """Create IMEI inventory entries"""
    print("Seeding IMEI inventory...")
    inventory = []
    
    approved_pos = [po for po in pos if po['approval_status'] == 'approved']
    
    for po in approved_pos[:30]:  # Process first 30 approved POs
        for item in po['items']:
            for _ in range(item['qty']):
                inward_date = datetime.fromisoformat(po['po_date']) + timedelta(days=random.randint(5, 15))
                status_options = ["at_nova", "in_transit_to_magnova", "at_magnova", "dispatched", "sold"]
                status = random.choice(status_options)
                
                imei_entry = {
                    "imei": generate_imei(),
                    "procurement_id": str(uuid4()),
                    "device_model": item['model'],
                    "brand": item['brand'],
                    "model": item['model'],
                    "colour": item['colour'],
                    "storage": item['storage'],
                    "vendor": item['vendor'],
                    "status": status,
                    "current_location": item['location'] if status == "at_nova" else random.choice(LOCATIONS),
                    "organization": po['organization'],
                    "po_number": po['po_number'],
                    "purchase_price": item['rate'],
                    "inward_nova_date": inward_date.isoformat(),
                    "inward_magnova_date": (inward_date + timedelta(days=random.randint(2, 7))).isoformat() if status in ["at_magnova", "dispatched", "sold"] else None,
                    "dispatched_date": (inward_date + timedelta(days=random.randint(10, 20))).isoformat() if status in ["dispatched", "sold"] else None,
                    "sold_date": (inward_date + timedelta(days=random.randint(25, 45))).isoformat() if status == "sold" else None,
                    "created_at": inward_date.isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                inventory.append(imei_entry)
    
    await db.imei_inventory.delete_many({})
    await db.imei_inventory.insert_many(inventory)
    print(f"✓ Inserted {len(inventory)} IMEI inventory entries")
    return inventory

async def seed_payments(pos, users):
    """Create payment records"""
    print("Seeding payments...")
    payments = []
    
    approved_pos = [po for po in pos if po['approval_status'] == 'approved']
    
    for po in approved_pos[:40]:
        # Create 1-3 payments per PO
        num_payments = random.randint(1, 3)
        payment_date = datetime.fromisoformat(po['po_date']) + timedelta(days=random.randint(1, 20))
        
        for _ in range(num_payments):
            payment_type = random.choice(["internal", "external"])
            created_by = random.choice([u for u in users if u['organization'] == po['organization']])
            
            if payment_type == "internal":
                payment = {
                    "payment_id": str(uuid4()),
                    "po_number": po['po_number'],
                    "payment_type": "internal",
                    "procurement_id": None,
                    "payee_type": None,
                    "payee_name": "Nova",
                    "payee_phone": None,
                    "payee_account": f"NOVA{random.randint(100000, 999999)}",
                    "payee_bank": random.choice(["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank"]),
                    "account_number": None,
                    "ifsc_code": None,
                    "location": None,
                    "payment_mode": random.choice(["NEFT", "RTGS", "IMPS", "UPI"]),
                    "amount": round(random.uniform(50000, 500000), 2),
                    "transaction_ref": f"TXN{random.randint(100000000, 999999999)}",
                    "utr_number": None,
                    "payment_date": payment_date.isoformat(),
                    "status": random.choice(["pending", "completed", "failed"]),
                    "created_by": created_by["user_id"],
                    "created_at": payment_date.isoformat()
                }
            else:
                payee_type = random.choice(["vendor", "cc"])
                payment = {
                    "payment_id": str(uuid4()),
                    "po_number": po['po_number'],
                    "payment_type": "external",
                    "procurement_id": str(uuid4()),
                    "payee_type": payee_type,
                    "payee_name": random.choice(VENDORS) if payee_type == "vendor" else f"CC Person {random.randint(1, 20)}",
                    "payee_phone": f"+91{random.randint(7000000000, 9999999999)}" if payee_type == "cc" else None,
                    "payee_account": None,
                    "payee_bank": None,
                    "account_number": f"{random.randint(100000000000, 999999999999)}",
                    "ifsc_code": f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=4))}0{random.randint(100000, 999999)}",
                    "location": random.choice(LOCATIONS),
                    "payment_mode": random.choice(["NEFT", "RTGS", "IMPS", "Cheque"]),
                    "amount": round(random.uniform(25000, 300000), 2),
                    "transaction_ref": None,
                    "utr_number": f"UTR{random.randint(100000000000, 999999999999)}",
                    "payment_date": payment_date.isoformat(),
                    "status": random.choice(["pending", "completed"]),
                    "created_by": created_by["user_id"],
                    "created_at": payment_date.isoformat()
                }
            
            payments.append(payment)
    
    await db.payments.delete_many({})
    await db.payments.insert_many(payments)
    print(f"✓ Inserted {len(payments)} payments")
    return payments

async def seed_logistics(pos, inventory, users):
    """Create logistics shipments"""
    print("Seeding logistics shipments...")
    shipments = []
    
    approved_pos = [po for po in pos if po['approval_status'] == 'approved']
    
    for po in approved_pos[:25]:
        # Get some IMEIs for this PO
        po_imeis = [item['imei'] for item in inventory if item['po_number'] == po['po_number']][:random.randint(5, 15)]
        
        if not po_imeis:
            continue
        
        pickup_date = datetime.fromisoformat(po['po_date']) + timedelta(days=random.randint(5, 10))
        expected_delivery = pickup_date + timedelta(days=random.randint(2, 7))
        status = random.choice(["pending", "in_transit", "delivered", "delayed"])
        
        created_by = random.choice([u for u in users if u['organization'] == po['organization']])
        
        shipment = {
            "shipment_id": str(uuid4()),
            "po_number": po['po_number'],
            "transporter_name": random.choice(TRANSPORTERS),
            "vehicle_number": f"{random.choice(['MH', 'DL', 'KA', 'TN'])}{random.randint(1, 20)}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.randint(1000, 9999)}",
            "eway_bill_number": f"E{random.randint(100000000000, 999999999999)}" if random.random() > 0.3 else None,
            "from_location": random.choice(LOCATIONS),
            "to_location": random.choice(LOCATIONS),
            "pickup_date": pickup_date.isoformat(),
            "expected_delivery": expected_delivery.isoformat(),
            "actual_delivery": expected_delivery.isoformat() if status == "delivered" else None,
            "status": status,
            "imei_list": po_imeis,
            "pickup_quantity": len(po_imeis),
            "brand": random.choice(BRANDS),
            "model": random.choice(MODELS[random.choice(BRANDS)]),
            "vendor": random.choice(VENDORS),
            "created_by": created_by["user_id"],
            "created_at": pickup_date.isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        shipments.append(shipment)
    
    await db.logistics_shipments.delete_many({})
    await db.logistics_shipments.insert_many(shipments)
    print(f"✓ Inserted {len(shipments)} logistics shipments")
    return shipments

async def seed_invoices(pos, inventory, users):
    """Create invoices"""
    print("Seeding invoices...")
    invoices = []
    
    approved_pos = [po for po in pos if po['approval_status'] == 'approved']
    
    for po in approved_pos[:35]:
        # Get some IMEIs for this PO
        po_imeis = [item['imei'] for item in inventory if item['po_number'] == po['po_number']][:random.randint(3, 10)]
        
        if not po_imeis:
            continue
        
        invoice_date = datetime.fromisoformat(po['po_date']) + timedelta(days=random.randint(10, 30))
        invoice_type = random.choice(["purchase", "sale", "transfer"])
        amount = round(random.uniform(50000, 800000), 2)
        gst_percentage = 18
        gst_amount = round(amount * gst_percentage / 100, 2)
        total_amount = amount + gst_amount
        
        created_by = random.choice([u for u in users if u['organization'] == po['organization']])
        
        invoice = {
            "invoice_id": str(uuid4()),
            "invoice_number": generate_invoice_number(),
            "invoice_type": invoice_type,
            "po_number": po['po_number'],
            "from_organization": random.choice(ORGANIZATIONS),
            "to_organization": random.choice(ORGANIZATIONS),
            "amount": amount,
            "gst_amount": gst_amount,
            "gst_percentage": gst_percentage,
            "total_amount": total_amount,
            "imei_list": po_imeis,
            "invoice_date": invoice_date.isoformat(),
            "payment_status": random.choice(["pending", "paid", "partial", "overdue"]),
            "description": f"{invoice_type.title()} invoice for {len(po_imeis)} devices",
            "billing_address": f"{random.randint(1, 999)}, {random.choice(['MG Road', 'Park Street', 'Main Road', 'Commercial Street'])}, {random.choice(LOCATIONS)}",
            "shipping_address": f"{random.randint(1, 999)}, {random.choice(['Industrial Area', 'Tech Park', 'Business District', 'Warehouse Area'])}, {random.choice(LOCATIONS)}",
            "created_by": created_by["user_id"],
            "created_at": invoice_date.isoformat()
        }
        invoices.append(invoice)
    
    await db.invoices.delete_many({})
    await db.invoices.insert_many(invoices)
    print(f"✓ Inserted {len(invoices)} invoices")
    return invoices

async def seed_sales_orders(inventory, users):
    """Create sales orders"""
    print("Seeding sales orders...")
    sales_orders = []
    
    sold_items = [item for item in inventory if item['status'] == 'sold']
    
    # Group sold items into sales orders
    for i in range(30):
        if not sold_items:
            break
        
        num_items = min(random.randint(1, 5), len(sold_items))
        selected_items = sold_items[:num_items]
        sold_items = sold_items[num_items:]
        
        imei_list = [item['imei'] for item in selected_items]
        total_amount = sum([item['purchase_price'] * 1.15 for item in selected_items])  # 15% markup
        
        created_by = random.choice([u for u in users if u['organization'] == 'Magnova'])
        created_at = random_date(60, 0)
        
        so = {
            "sales_order_id": str(uuid4()),
            "so_number": generate_so_number(),
            "customer_name": f"Customer {random.randint(1, 100)}",
            "customer_type": random.choice(["retail", "wholesale", "distributor", "corporate"]),
            "total_quantity": len(imei_list),
            "total_amount": round(total_amount, 2),
            "status": random.choice(["pending", "confirmed", "completed", "cancelled"]),
            "imei_list": imei_list,
            "created_by": created_by["user_id"],
            "created_at": created_at.isoformat(),
            "updated_at": (created_at + timedelta(days=random.randint(1, 5))).isoformat()
        }
        sales_orders.append(so)
    
    await db.sales_orders.delete_many({})
    if sales_orders:
        await db.sales_orders.insert_many(sales_orders)
    print(f"✓ Inserted {len(sales_orders)} sales orders")
    return sales_orders

async def seed_audit_logs(users):
    """Create audit log entries"""
    print("Seeding audit logs...")
    logs = []
    
    actions = ["create", "update", "delete", "approve", "reject", "scan", "dispatch"]
    entity_types = ["purchase_order", "payment", "shipment", "invoice", "sales_order", "imei"]
    
    for i in range(200):
        user = random.choice(users)
        timestamp = random_date(120, 0)
        
        log = {
            "log_id": str(uuid4()),
            "action": random.choice(actions),
            "entity_type": random.choice(entity_types),
            "entity_id": str(uuid4()),
            "user_id": user["user_id"],
            "user_name": user["name"],
            "details": {
                "note": f"Sample audit log entry {i+1}",
                "previous_status": random.choice(["pending", "approved", "completed"]),
                "new_status": random.choice(["approved", "completed", "rejected"])
            },
            "timestamp": timestamp.isoformat()
        }
        logs.append(log)
    
    await db.audit_logs.delete_many({})
    await db.audit_logs.insert_many(logs)
    print(f"✓ Inserted {len(logs)} audit logs")
    return logs

async def main():
    """Main seeding function"""
    print("=" * 60)
    print("Starting database seeding...")
    print("=" * 60)
    
    try:
        # Create indexes
        await db.users.create_index("email", unique=True)
        await db.imei_inventory.create_index("imei", unique=True)
        await db.purchase_orders.create_index("po_number", unique=True)
        
        # Seed data in order
        users = await seed_users()
        pos = await seed_purchase_orders(users)
        inventory = await seed_imei_inventory(pos, users)
        payments = await seed_payments(pos, users)
        shipments = await seed_logistics(pos, inventory, users)
        invoices = await seed_invoices(pos, inventory, users)
        sales_orders = await seed_sales_orders(inventory, users)
        audit_logs = await seed_audit_logs(users)
        
        print("=" * 60)
        print("✓ Database seeding completed successfully!")
        print("=" * 60)
        print("\nSummary:")
        print(f"  Users: {len(users)}")
        print(f"  Purchase Orders: {len(pos)}")
        print(f"  IMEI Inventory: {len(inventory)}")
        print(f"  Payments: {len(payments)}")
        print(f"  Logistics Shipments: {len(shipments)}")
        print(f"  Invoices: {len(invoices)}")
        print(f"  Sales Orders: {len(sales_orders)}")
        print(f"  Audit Logs: {len(audit_logs)}")
        print("\n" + "=" * 60)
        print("Login credentials for testing:")
        print("  admin@magnova.com / password123")
        print("  manager@magnova.com / password123")
        print("  admin@nova.com / password123")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
