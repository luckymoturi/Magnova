from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import io
import xlsxwriter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create indexes
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.imei_inventory.create_index("imei", unique=True)
    await db.purchase_orders.create_index("po_number", unique=True)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: EmailStr
    name: str
    organization: str
    role: str
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    organization: str
    role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class POLineItem(BaseModel):
    sl_no: int
    vendor: str
    location: str
    brand: str
    model: str
    storage: Optional[str] = None
    colour: Optional[str] = None
    imei: Optional[str] = None
    qty: int = 1
    rate: float
    po_value: float

class PurchaseOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    po_id: str
    po_number: str
    po_date: datetime
    purchase_office: str
    created_by: str
    created_by_name: str
    organization: str
    status: str
    total_quantity: int
    total_value: float
    items: List[POLineItem] = []
    notes: Optional[str] = None
    approval_status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class POCreate(BaseModel):
    po_date: datetime
    purchase_office: str
    items: List[POLineItem]
    notes: Optional[str] = None

class POApproval(BaseModel):
    action: str
    rejection_reason: Optional[str] = None

class ProcurementRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    procurement_id: str
    po_number: str
    vendor_name: str
    store_location: str
    imei: str
    serial_number: Optional[str] = None
    device_model: str
    quantity: Optional[int] = 1
    purchase_price: float
    procurement_date: datetime
    created_by: str
    created_at: datetime

class ProcurementCreate(BaseModel):
    po_number: str
    vendor_name: str
    store_location: str
    imei: str
    serial_number: Optional[str] = None
    device_model: str
    quantity: Optional[int] = 1
    purchase_price: float

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str
    po_number: str
    payment_type: str  # 'internal' or 'external'
    procurement_id: Optional[str] = None
    payee_type: Optional[str] = None  # 'vendor' or 'cc' for external
    payee_name: str
    payee_account: Optional[str] = None
    payee_bank: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    location: Optional[str] = None
    payment_mode: str
    amount: float
    transaction_ref: Optional[str] = None
    utr_number: Optional[str] = None
    payment_date: datetime
    status: str
    created_by: str
    created_at: datetime

class InternalPaymentCreate(BaseModel):
    po_number: str
    payee_name: str  # Nova
    payee_account: str
    payee_bank: str
    payment_mode: str
    amount: float
    transaction_ref: Optional[str] = None
    payment_date: datetime

class ExternalPaymentCreate(BaseModel):
    po_number: str
    payee_type: str  # 'vendor' or 'cc'
    payee_name: str
    account_number: str
    ifsc_code: str
    location: str
    payment_mode: str
    amount: float
    utr_number: str
    payment_date: datetime

class IMEIInventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    imei: str
    procurement_id: str
    device_model: str
    status: str
    current_location: str
    organization: str
    inward_nova_date: Optional[datetime] = None
    inward_magnova_date: Optional[datetime] = None
    dispatched_date: Optional[datetime] = None
    sold_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class IMEIScan(BaseModel):
    imei: str
    action: str
    location: str
    organization: str
    vendor: Optional[str] = None

class LogisticsShipment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    shipment_id: str
    po_number: str
    transporter_name: str
    vehicle_number: str
    eway_bill_number: Optional[str] = None
    from_location: str
    to_location: str
    pickup_date: datetime
    expected_delivery: datetime
    actual_delivery: Optional[datetime] = None
    status: str
    imei_list: List[str]
    pickup_quantity: Optional[int] = 0
    brand: Optional[str] = None
    model: Optional[str] = None
    vendor: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

class ShipmentCreate(BaseModel):
    po_number: str
    transporter_name: str
    vehicle_number: str
    from_location: str
    to_location: str
    pickup_date: datetime
    expected_delivery: datetime
    imei_list: List[str] = []
    pickup_quantity: Optional[int] = 0
    brand: Optional[str] = None
    model: Optional[str] = None
    vendor: Optional[str] = None

class ShipmentStatusUpdate(BaseModel):
    status: str

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_id: str
    invoice_number: str
    invoice_type: str
    po_number: str
    from_organization: str
    to_organization: str
    amount: float
    gst_amount: float
    total_amount: float
    imei_list: List[str]
    invoice_date: datetime
    payment_status: str
    created_by: str
    created_at: datetime

class InvoiceCreate(BaseModel):
    invoice_type: str
    po_number: str
    from_organization: str
    to_organization: str
    amount: float
    gst_amount: float
    imei_list: List[str]
    invoice_date: datetime

class SalesOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    sales_order_id: str
    so_number: str
    customer_name: str
    customer_type: str
    total_quantity: int
    total_amount: float
    status: str
    imei_list: List[str]
    created_by: str
    created_at: datetime
    updated_at: datetime

class SalesOrderCreate(BaseModel):
    customer_name: str
    customer_type: str
    total_quantity: int
    total_amount: float
    imei_list: List[str]

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    action: str
    entity_type: str
    entity_id: str
    user_id: str
    user_name: str
    details: Dict[str, Any]
    timestamp: datetime

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def create_audit_log(action: str, entity_type: str, entity_id: str, user: User, details: dict):
    from uuid import uuid4
    log = {
        "log_id": str(uuid4()),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log)

# Auth Endpoints
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    from uuid import uuid4
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid4())
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "organization": user_data.organization,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    user = User(**{k: v for k, v in user_doc.items() if k != "password"})
    token = create_token(user_id, user_data.email)
    
    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password"]}
    user_obj = User(**user_data)
    token = create_token(user["user_id"], user["email"])
    
    return TokenResponse(access_token=token, user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Purchase Order Endpoints
@api_router.post("/purchase-orders", response_model=PurchaseOrder)
async def create_purchase_order(po_data: POCreate, current_user: User = Depends(get_current_user)):
    from uuid import uuid4
    if current_user.organization != "Magnova":
        raise HTTPException(status_code=403, detail="Only Magnova can create POs")
    
    # Generate unique PO number and check for duplicates
    po_count = await db.purchase_orders.count_documents({}) + 1
    po_number = f"PO-MAG-{po_count:05d}"
    
    # Check if PO number already exists (shouldn't happen but safety check)
    existing_po = await db.purchase_orders.find_one({"po_number": po_number})
    if existing_po:
        # Find next available number
        while existing_po:
            po_count += 1
            po_number = f"PO-MAG-{po_count:05d}"
            existing_po = await db.purchase_orders.find_one({"po_number": po_number})
    
    # Calculate totals from items
    total_quantity = sum(item.qty for item in po_data.items)
    total_value = sum(item.po_value for item in po_data.items)
    
    # Convert items to dict for storage
    items_list = [item.model_dump() for item in po_data.items]
    
    po_doc = {
        "po_id": str(uuid4()),
        "po_number": po_number,
        "po_date": po_data.po_date.isoformat() if isinstance(po_data.po_date, datetime) else po_data.po_date,
        "purchase_office": po_data.purchase_office,
        "created_by": current_user.user_id,
        "created_by_name": current_user.name,
        "organization": current_user.organization,
        "status": "Created",
        "total_quantity": total_quantity,
        "total_value": total_value,
        "items": items_list,
        "notes": po_data.notes,
        "approval_status": "Pending",
        "approved_by": None,
        "approved_at": None,
        "rejection_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.purchase_orders.insert_one(po_doc)
    await create_audit_log("CREATE", "PurchaseOrder", po_number, current_user, {"total_quantity": total_quantity, "total_value": total_value})
    
    return PurchaseOrder(**{k: v for k, v in po_doc.items() if k != "_id"})

@api_router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def get_purchase_orders(current_user: User = Depends(get_current_user)):
    pos = await db.purchase_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for po in pos:
        if isinstance(po.get('created_at'), str):
            po['created_at'] = datetime.fromisoformat(po['created_at'])
        if isinstance(po.get('updated_at'), str):
            po['updated_at'] = datetime.fromisoformat(po['updated_at'])
        if po.get('approved_at') and isinstance(po['approved_at'], str):
            po['approved_at'] = datetime.fromisoformat(po['approved_at'])
        if po.get('po_date') and isinstance(po['po_date'], str):
            po['po_date'] = datetime.fromisoformat(po['po_date'])
        # Ensure backward compatibility for old POs without new fields
        if 'po_date' not in po:
            po['po_date'] = po.get('created_at')
        if 'purchase_office' not in po:
            po['purchase_office'] = 'Magnova Head Office'
        if 'total_value' not in po:
            po['total_value'] = 0.0
        if 'items' not in po:
            po['items'] = []
    return [PurchaseOrder(**po) for po in pos]

@api_router.get("/purchase-orders/{po_number}", response_model=PurchaseOrder)
async def get_purchase_order(po_number: str, current_user: User = Depends(get_current_user)):
    po = await db.purchase_orders.find_one({"po_number": po_number}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if isinstance(po.get('created_at'), str):
        po['created_at'] = datetime.fromisoformat(po['created_at'])
    if isinstance(po.get('updated_at'), str):
        po['updated_at'] = datetime.fromisoformat(po['updated_at'])
    if po.get('approved_at') and isinstance(po['approved_at'], str):
        po['approved_at'] = datetime.fromisoformat(po['approved_at'])
    if po.get('po_date') and isinstance(po['po_date'], str):
        po['po_date'] = datetime.fromisoformat(po['po_date'])
    # Ensure backward compatibility
    if 'po_date' not in po:
        po['po_date'] = po.get('created_at')
    if 'purchase_office' not in po:
        po['purchase_office'] = 'Magnova Head Office'
    if 'total_value' not in po:
        po['total_value'] = 0.0
    if 'items' not in po:
        po['items'] = []
    return PurchaseOrder(**po)

@api_router.post("/purchase-orders/{po_number}/approve")
async def approve_purchase_order(po_number: str, approval: POApproval, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["Approver", "Admin"]:
        raise HTTPException(status_code=403, detail="Only approvers can approve POs")
    
    po = await db.purchase_orders.find_one({"po_number": po_number})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if approval.action == "approve":
        update_data["approval_status"] = "Approved"
        update_data["status"] = "Approved"
        update_data["approved_by"] = current_user.user_id
        update_data["approved_at"] = datetime.now(timezone.utc).isoformat()
        await create_audit_log("APPROVE", "PurchaseOrder", po_number, current_user, {})
    elif approval.action == "reject":
        update_data["approval_status"] = "Rejected"
        update_data["status"] = "Rejected"
        update_data["rejection_reason"] = approval.rejection_reason
        await create_audit_log("REJECT", "PurchaseOrder", po_number, current_user, {"reason": approval.rejection_reason})
    
    await db.purchase_orders.update_one({"po_number": po_number}, {"$set": update_data})
    return {"message": f"PO {approval.action}d successfully"}

# Procurement Endpoints
@api_router.post("/procurement", response_model=ProcurementRecord)
async def create_procurement(proc_data: ProcurementCreate, current_user: User = Depends(get_current_user)):
    from uuid import uuid4
    # Remove organization restriction - everyone can create procurement
    
    po = await db.purchase_orders.find_one({"po_number": proc_data.po_number})
    if not po:
        raise HTTPException(status_code=400, detail="PO not found")
    
    existing_imei = await db.procurement.find_one({"imei": proc_data.imei})
    if existing_imei:
        raise HTTPException(status_code=400, detail="IMEI already exists")
    
    proc_id = str(uuid4())
    proc_doc = {
        "procurement_id": proc_id,
        "po_number": proc_data.po_number,
        "vendor_name": proc_data.vendor_name,
        "store_location": proc_data.store_location,
        "imei": proc_data.imei,
        "serial_number": proc_data.serial_number,
        "device_model": proc_data.device_model,
        "quantity": proc_data.quantity or 1,
        "purchase_price": proc_data.purchase_price,
        "procurement_date": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.procurement.insert_one(proc_doc)
    
    imei_doc = {
        "imei": proc_data.imei,
        "procurement_id": proc_id,
        "device_model": proc_data.device_model,
        "status": "Procured",
        "current_location": proc_data.store_location,
        "organization": current_user.organization,
        "inward_nova_date": None,
        "inward_magnova_date": None,
        "dispatched_date": None,
        "sold_date": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.imei_inventory.insert_one(imei_doc)
    
    await create_audit_log("CREATE", "Procurement", proc_id, current_user, {"imei": proc_data.imei})
    
    return ProcurementRecord(**{k: v for k, v in proc_doc.items() if k != "_id"})

@api_router.get("/procurement", response_model=List[ProcurementRecord])
async def get_procurement_records(po_number: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if po_number:
        query["po_number"] = po_number
    
    records = await db.procurement.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for rec in records:
        if isinstance(rec.get('procurement_date'), str):
            rec['procurement_date'] = datetime.fromisoformat(rec['procurement_date'])
        if isinstance(rec.get('created_at'), str):
            rec['created_at'] = datetime.fromisoformat(rec['created_at'])
        # Ensure backward compatibility for quantity field
        if 'quantity' not in rec:
            rec['quantity'] = 1
    return [ProcurementRecord(**rec) for rec in records]

# Payment Endpoints
@api_router.post("/payments/internal", response_model=Payment)
async def create_internal_payment(payment_data: InternalPaymentCreate, current_user: User = Depends(get_current_user)):
    from uuid import uuid4
    
    # Verify PO exists
    po = await db.purchase_orders.find_one({"po_number": payment_data.po_number})
    if not po:
        raise HTTPException(status_code=400, detail="PO not found")
    
    payment_doc = {
        "payment_id": str(uuid4()),
        "po_number": payment_data.po_number,
        "payment_type": "internal",
        "procurement_id": None,
        "payee_type": None,
        "payee_name": payment_data.payee_name,
        "payee_account": payment_data.payee_account,
        "payee_bank": payment_data.payee_bank,
        "account_number": None,
        "ifsc_code": None,
        "location": None,
        "payment_mode": payment_data.payment_mode,
        "amount": payment_data.amount,
        "transaction_ref": payment_data.transaction_ref,
        "utr_number": None,
        "payment_date": payment_data.payment_date.isoformat(),
        "status": "Completed",
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    await create_audit_log("CREATE", "InternalPayment", payment_doc["payment_id"], current_user, {"amount": payment_data.amount})
    
    return Payment(**{k: v for k, v in payment_doc.items() if k != "_id"})

@api_router.post("/payments/external", response_model=Payment)
async def create_external_payment(payment_data: ExternalPaymentCreate, current_user: User = Depends(get_current_user)):
    from uuid import uuid4
    
    # Verify PO exists
    po = await db.purchase_orders.find_one({"po_number": payment_data.po_number})
    if not po:
        raise HTTPException(status_code=400, detail="PO not found")
    
    # Get total internal payments for this PO (include legacy payments without payment_type)
    internal_payments = await db.payments.find({
        "po_number": payment_data.po_number,
        "$or": [
            {"payment_type": "internal"},
            {"payment_type": {"$exists": False}}  # Legacy payments
        ]
    }).to_list(1000)
    total_internal = sum(p.get("amount", 0) for p in internal_payments)
    
    # Get total existing external payments for this PO
    external_payments = await db.payments.find({"po_number": payment_data.po_number, "payment_type": "external"}).to_list(1000)
    total_external = sum(p.get("amount", 0) for p in external_payments)
    
    # Check if new external payment would exceed internal payment
    if total_external + payment_data.amount > total_internal:
        remaining = total_internal - total_external
        raise HTTPException(
            status_code=400, 
            detail=f"External payments cannot exceed internal payment. Internal: ₹{total_internal}, Already paid externally: ₹{total_external}, Remaining: ₹{remaining}"
        )
    
    payment_doc = {
        "payment_id": str(uuid4()),
        "po_number": payment_data.po_number,
        "payment_type": "external",
        "procurement_id": None,
        "payee_type": payment_data.payee_type,
        "payee_name": payment_data.payee_name,
        "payee_account": None,
        "payee_bank": None,
        "account_number": payment_data.account_number,
        "ifsc_code": payment_data.ifsc_code,
        "location": payment_data.location,
        "payment_mode": payment_data.payment_mode,
        "amount": payment_data.amount,
        "transaction_ref": None,
        "utr_number": payment_data.utr_number,
        "payment_date": payment_data.payment_date.isoformat(),
        "status": "Completed",
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    await create_audit_log("CREATE", "ExternalPayment", payment_doc["payment_id"], current_user, {"amount": payment_data.amount, "payee": payment_data.payee_name})
    
    return Payment(**{k: v for k, v in payment_doc.items() if k != "_id"})

@api_router.get("/payments/summary/{po_number}")
async def get_payment_summary(po_number: str, current_user: User = Depends(get_current_user)):
    # Get PO total value
    po = await db.purchase_orders.find_one({"po_number": po_number}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    po_total = po.get("total_value", 0)
    
    # Get internal payments (include legacy payments without payment_type)
    internal_payments = await db.payments.find({
        "po_number": po_number,
        "$or": [
            {"payment_type": "internal"},
            {"payment_type": {"$exists": False}}  # Legacy payments without payment_type
        ]
    }).to_list(1000)
    total_internal = sum(p.get("amount", 0) for p in internal_payments)
    
    # Get external payments
    external_payments = await db.payments.find({"po_number": po_number, "payment_type": "external"}).to_list(1000)
    total_external = sum(p.get("amount", 0) for p in external_payments)
    
    return {
        "po_number": po_number,
        "po_total_value": po_total,
        "internal_paid": total_internal,
        "external_paid": total_external,
        "external_remaining": total_internal - total_external
    }

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(po_number: Optional[str] = None, payment_type: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if po_number:
        query["po_number"] = po_number
    if payment_type:
        if payment_type == "internal":
            # Include legacy payments without payment_type as internal
            query["$or"] = [{"payment_type": "internal"}, {"payment_type": {"$exists": False}}]
        else:
            query["payment_type"] = payment_type
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for payment in payments:
        if isinstance(payment.get('payment_date'), str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
        if isinstance(payment.get('created_at'), str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
        # Set payment_type to 'internal' for legacy payments
        if 'payment_type' not in payment or payment['payment_type'] is None:
            payment['payment_type'] = 'internal'
        for field in ['payee_account', 'payee_bank', 'account_number', 'ifsc_code', 'location', 'utr_number', 'payee_type']:
            if field not in payment:
                payment[field] = None
    return [Payment(**payment) for payment in payments]

# IMEI Inventory Endpoints
@api_router.get("/inventory/lookup/{imei}")
async def lookup_imei(imei: str, current_user: User = Depends(get_current_user)):
    """Lookup IMEI details from procurement records and existing inventory"""
    # First check if IMEI exists in inventory
    inventory_record = await db.imei_inventory.find_one({"imei": imei}, {"_id": 0})
    
    # Then check procurement records for this IMEI
    procurement_record = await db.procurement.find_one({"imei": imei}, {"_id": 0})
    
    if not inventory_record and not procurement_record:
        return {"found": False, "message": "IMEI not found in procurement or inventory"}
    
    result = {
        "found": True,
        "in_inventory": inventory_record is not None,
        "in_procurement": procurement_record is not None,
    }
    
    # If in procurement, get vendor details
    if procurement_record:
        result["vendor"] = procurement_record.get("vendor_name")
        result["device_model"] = procurement_record.get("device_model")
        result["po_number"] = procurement_record.get("po_number")
        result["store_location"] = procurement_record.get("store_location")
        result["purchase_price"] = procurement_record.get("purchase_price")
        result["procurement_date"] = procurement_record.get("procurement_date")
    
    # If in inventory, get current status
    if inventory_record:
        result["status"] = inventory_record.get("status")
        result["current_location"] = inventory_record.get("current_location")
        result["organization"] = inventory_record.get("organization")
        result["device_model"] = inventory_record.get("device_model")
        result["vendor"] = inventory_record.get("vendor")
    
    return result

@api_router.post("/inventory/scan")
async def scan_imei(scan_data: IMEIScan, current_user: User = Depends(get_current_user)):
    imei_record = await db.imei_inventory.find_one({"imei": scan_data.imei})
    if not imei_record:
        raise HTTPException(status_code=404, detail="IMEI not found")
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "current_location": scan_data.location,
        "organization": scan_data.organization
    }
    
    # Add vendor if provided
    if scan_data.vendor:
        update_data["vendor"] = scan_data.vendor
    
    if scan_data.action == "inward_nova":
        update_data["status"] = "Inward Nova"
        update_data["inward_nova_date"] = datetime.now(timezone.utc).isoformat()
    elif scan_data.action == "inward_magnova":
        update_data["status"] = "Inward Magnova"
        update_data["inward_magnova_date"] = datetime.now(timezone.utc).isoformat()
        update_data["organization"] = "Magnova"
    elif scan_data.action == "outward_nova":
        update_data["status"] = "Outward Nova"
        update_data["outward_nova_date"] = datetime.now(timezone.utc).isoformat()
    elif scan_data.action == "outward_magnova":
        update_data["status"] = "Outward Magnova"
        update_data["outward_magnova_date"] = datetime.now(timezone.utc).isoformat()
    elif scan_data.action == "dispatch":
        update_data["status"] = "Dispatched"
        update_data["dispatched_date"] = datetime.now(timezone.utc).isoformat()
    elif scan_data.action == "available":
        update_data["status"] = "Available"
    
    await db.imei_inventory.update_one({"imei": scan_data.imei}, {"$set": update_data})
    await create_audit_log("SCAN", "IMEI", scan_data.imei, current_user, {"action": scan_data.action, "location": scan_data.location, "vendor": scan_data.vendor})
    
    return {"message": "IMEI scanned successfully", "status": update_data.get("status", imei_record["status"])}

@api_router.get("/inventory", response_model=List[IMEIInventory])
async def get_inventory(status: Optional[str] = None, organization: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    if organization:
        query["organization"] = organization
    
    inventory = await db.imei_inventory.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    for item in inventory:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
        if item.get('inward_nova_date') and isinstance(item['inward_nova_date'], str):
            item['inward_nova_date'] = datetime.fromisoformat(item['inward_nova_date'])
        if item.get('inward_magnova_date') and isinstance(item['inward_magnova_date'], str):
            item['inward_magnova_date'] = datetime.fromisoformat(item['inward_magnova_date'])
        if item.get('dispatched_date') and isinstance(item['dispatched_date'], str):
            item['dispatched_date'] = datetime.fromisoformat(item['dispatched_date'])
        if item.get('sold_date') and isinstance(item['sold_date'], str):
            item['sold_date'] = datetime.fromisoformat(item['sold_date'])
    return [IMEIInventory(**item) for item in inventory]

@api_router.get("/inventory/{imei}", response_model=IMEIInventory)
async def get_imei_details(imei: str, current_user: User = Depends(get_current_user)):
    item = await db.imei_inventory.find_one({"imei": imei}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="IMEI not found")
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('updated_at'), str):
        item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    if item.get('inward_nova_date') and isinstance(item['inward_nova_date'], str):
        item['inward_nova_date'] = datetime.fromisoformat(item['inward_nova_date'])
    if item.get('inward_magnova_date') and isinstance(item['inward_magnova_date'], str):
        item['inward_magnova_date'] = datetime.fromisoformat(item['inward_magnova_date'])
    if item.get('dispatched_date') and isinstance(item['dispatched_date'], str):
        item['dispatched_date'] = datetime.fromisoformat(item['dispatched_date'])
    if item.get('sold_date') and isinstance(item['sold_date'], str):
        item['sold_date'] = datetime.fromisoformat(item['sold_date'])
    return IMEIInventory(**item)

# Logistics Endpoints
@api_router.post("/logistics/shipments", response_model=LogisticsShipment)
async def create_shipment(shipment_data: ShipmentCreate, current_user: User = Depends(get_current_user)):
    from uuid import uuid4
    
    shipment_doc = {
        "shipment_id": str(uuid4()),
        "po_number": shipment_data.po_number,
        "transporter_name": shipment_data.transporter_name,
        "vehicle_number": shipment_data.vehicle_number,
        "eway_bill_number": None,
        "from_location": shipment_data.from_location,
        "to_location": shipment_data.to_location,
        "pickup_date": shipment_data.pickup_date.isoformat(),
        "expected_delivery": shipment_data.expected_delivery.isoformat(),
        "actual_delivery": None,
        "status": "Pending",
        "imei_list": shipment_data.imei_list,
        "pickup_quantity": shipment_data.pickup_quantity or len(shipment_data.imei_list),
        "brand": shipment_data.brand,
        "model": shipment_data.model,
        "vendor": shipment_data.vendor,
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.logistics_shipments.insert_one(shipment_doc)
    await create_audit_log("CREATE", "Shipment", shipment_doc["shipment_id"], current_user, {"pickup_quantity": shipment_doc["pickup_quantity"], "vendor": shipment_data.vendor})
    
    return LogisticsShipment(**{k: v for k, v in shipment_doc.items() if k != "_id"})

@api_router.patch("/logistics/shipments/{shipment_id}/status")
async def update_shipment_status(shipment_id: str, status_update: ShipmentStatusUpdate, current_user: User = Depends(get_current_user)):
    result = await db.logistics_shipments.update_one(
        {"shipment_id": shipment_id},
        {
            "$set": {
                "status": status_update.status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "actual_delivery": datetime.now(timezone.utc).isoformat() if status_update.status == "Delivered" else None
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    await create_audit_log("UPDATE", "Shipment", shipment_id, current_user, {"new_status": status_update.status})
    return {"message": "Status updated successfully"}

@api_router.get("/logistics/shipments", response_model=List[LogisticsShipment])
async def get_shipments(current_user: User = Depends(get_current_user)):
    shipments = await db.logistics_shipments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for shipment in shipments:
        if isinstance(shipment.get('pickup_date'), str):
            shipment['pickup_date'] = datetime.fromisoformat(shipment['pickup_date'])
        if isinstance(shipment.get('expected_delivery'), str):
            shipment['expected_delivery'] = datetime.fromisoformat(shipment['expected_delivery'])
        if shipment.get('actual_delivery') and isinstance(shipment['actual_delivery'], str):
            shipment['actual_delivery'] = datetime.fromisoformat(shipment['actual_delivery'])
        if isinstance(shipment.get('created_at'), str):
            shipment['created_at'] = datetime.fromisoformat(shipment['created_at'])
        if isinstance(shipment.get('updated_at'), str):
            shipment['updated_at'] = datetime.fromisoformat(shipment['updated_at'])
        # Ensure backward compatibility
        if 'pickup_quantity' not in shipment:
            shipment['pickup_quantity'] = len(shipment.get('imei_list', []))
        if 'brand' not in shipment:
            shipment['brand'] = None
        if 'model' not in shipment:
            shipment['model'] = None
        if 'vendor' not in shipment:
            shipment['vendor'] = None
    return [LogisticsShipment(**shipment) for shipment in shipments]

# Invoice Endpoints
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    from uuid import uuid4
    
    invoice_count = await db.invoices.count_documents({}) + 1
    invoice_number = f"INV-{invoice_count:06d}"
    
    invoice_doc = {
        "invoice_id": str(uuid4()),
        "invoice_number": invoice_number,
        "invoice_type": invoice_data.invoice_type,
        "po_number": invoice_data.po_number,
        "from_organization": invoice_data.from_organization,
        "to_organization": invoice_data.to_organization,
        "amount": invoice_data.amount,
        "gst_amount": invoice_data.gst_amount,
        "total_amount": invoice_data.amount + invoice_data.gst_amount,
        "imei_list": invoice_data.imei_list,
        "invoice_date": invoice_data.invoice_date.isoformat(),
        "payment_status": "Pending",
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.invoices.insert_one(invoice_doc)
    await create_audit_log("CREATE", "Invoice", invoice_number, current_user, {"amount": invoice_data.amount})
    
    return Invoice(**{k: v for k, v in invoice_doc.items() if k != "_id"})

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for invoice in invoices:
        if isinstance(invoice.get('invoice_date'), str):
            invoice['invoice_date'] = datetime.fromisoformat(invoice['invoice_date'])
        if isinstance(invoice.get('created_at'), str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    return [Invoice(**invoice) for invoice in invoices]

# Sales Order Endpoints
@api_router.post("/sales-orders", response_model=SalesOrder)
async def create_sales_order(so_data: SalesOrderCreate, current_user: User = Depends(get_current_user)):
    from uuid import uuid4
    if current_user.organization != "Magnova":
        raise HTTPException(status_code=403, detail="Only Magnova can create sales orders")
    
    so_count = await db.sales_orders.count_documents({}) + 1
    so_number = f"SO-MAG-{so_count:05d}"
    
    so_doc = {
        "sales_order_id": str(uuid4()),
        "so_number": so_number,
        "customer_name": so_data.customer_name,
        "customer_type": so_data.customer_type,
        "total_quantity": so_data.total_quantity,
        "total_amount": so_data.total_amount,
        "status": "Created",
        "imei_list": so_data.imei_list,
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sales_orders.insert_one(so_doc)
    
    for imei in so_data.imei_list:
        await db.imei_inventory.update_one(
            {"imei": imei},
            {"$set": {"status": "Reserved", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await create_audit_log("CREATE", "SalesOrder", so_number, current_user, {"customer": so_data.customer_name})
    
    return SalesOrder(**{k: v for k, v in so_doc.items() if k != "_id"})

@api_router.get("/sales-orders", response_model=List[SalesOrder])
async def get_sales_orders(current_user: User = Depends(get_current_user)):
    orders = await db.sales_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return [SalesOrder(**order) for order in orders]

# Reports Endpoint
@api_router.get("/reports/dashboard")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_pos = await db.purchase_orders.count_documents({})
    pending_pos = await db.purchase_orders.count_documents({"approval_status": "Pending"})
    total_procurement = await db.procurement.count_documents({})
    total_inventory = await db.imei_inventory.count_documents({})
    available_inventory = await db.imei_inventory.count_documents({"status": "Available"})
    total_sales = await db.sales_orders.count_documents({})
    
    total_payments = await db.payments.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    total_payment_amount = total_payments[0]["total"] if total_payments else 0
    
    return {
        "total_pos": total_pos,
        "pending_pos": pending_pos,
        "total_procurement": total_procurement,
        "total_inventory": total_inventory,
        "available_inventory": available_inventory,
        "total_sales": total_sales,
        "total_payment_amount": total_payment_amount
    }

@api_router.get("/reports/po-summary")
async def get_po_summary(po_number: str, current_user: User = Depends(get_current_user)):
    po = await db.purchase_orders.find_one({"po_number": po_number}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    procurement_records = await db.procurement.find({"po_number": po_number}, {"_id": 0}).to_list(1000)
    payments = await db.payments.find({"po_number": po_number}, {"_id": 0}).to_list(1000)
    
    total_procured = len(procurement_records)
    total_paid = sum(p["amount"] for p in payments)
    
    return {
        "po": po,
        "total_procured": total_procured,
        "procurement_records": procurement_records,
        "payments": payments,
        "total_paid": total_paid
    }

@api_router.get("/reports/export/inventory")
async def export_inventory_report(current_user: User = Depends(get_current_user)):
    inventory = await db.imei_inventory.find({}, {"_id": 0}).to_list(5000)
    
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Inventory")
    
    headers = ["IMEI", "Device Model", "Status", "Organization", "Location", "Created At"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)
    
    for row, item in enumerate(inventory, start=1):
        worksheet.write(row, 0, item.get("imei", ""))
        worksheet.write(row, 1, item.get("device_model", ""))
        worksheet.write(row, 2, item.get("status", ""))
        worksheet.write(row, 3, item.get("organization", ""))
        worksheet.write(row, 4, item.get("current_location", ""))
        worksheet.write(row, 5, str(item.get("created_at", "")))
    
    workbook.close()
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=inventory_report.xlsx"}
    )

@api_router.get("/audit-logs")
async def get_audit_logs(entity_type: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(500).to_list(500)
    return logs

# DELETE ENDPOINTS - Admin Only
@api_router.delete("/purchase-orders/{po_number}")
async def delete_purchase_order(po_number: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete records")
    
    result = await db.purchase_orders.delete_one({"po_number": po_number})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="PO not found")
    
    await create_audit_log("DELETE", "PurchaseOrder", po_number, current_user, {})
    return {"message": "Purchase order deleted successfully"}

@api_router.delete("/procurement/{procurement_id}")
async def delete_procurement(procurement_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete records")
    
    # Also delete related IMEI inventory
    proc = await db.procurement.find_one({"procurement_id": procurement_id})
    if proc:
        await db.imei_inventory.delete_one({"imei": proc.get("imei")})
    
    result = await db.procurement.delete_one({"procurement_id": procurement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Procurement record not found")
    
    await create_audit_log("DELETE", "Procurement", procurement_id, current_user, {})
    return {"message": "Procurement record deleted successfully"}

@api_router.delete("/inventory/{imei}")
async def delete_inventory(imei: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete records")
    
    result = await db.imei_inventory.delete_one({"imei": imei})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IMEI not found")
    
    await create_audit_log("DELETE", "IMEI", imei, current_user, {})
    return {"message": "Inventory item deleted successfully"}

@api_router.delete("/logistics/shipments/{shipment_id}")
async def delete_shipment(shipment_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete records")
    
    result = await db.logistics_shipments.delete_one({"shipment_id": shipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    await create_audit_log("DELETE", "Shipment", shipment_id, current_user, {})
    return {"message": "Shipment deleted successfully"}

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete records")
    
    result = await db.payments.delete_one({"payment_id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    await create_audit_log("DELETE", "Payment", payment_id, current_user, {})
    return {"message": "Payment deleted successfully"}

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete records")
    
    result = await db.invoices.delete_one({"invoice_id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await create_audit_log("DELETE", "Invoice", invoice_id, current_user, {})
    return {"message": "Invoice deleted successfully"}

@api_router.delete("/sales-orders/{so_number}")
async def delete_sales_order(so_number: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete records")
    
    result = await db.sales_orders.delete_one({"so_number": so_number})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    await create_audit_log("DELETE", "SalesOrder", so_number, current_user, {})
    return {"message": "Sales order deleted successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    await create_indexes()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
