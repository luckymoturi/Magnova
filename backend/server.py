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
import google.generativeai as genai
import json
import re
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests as http_requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Create indexes
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.imei_inventory.create_index("imei", unique=True)
    await db.purchase_orders.create_index("po_number", unique=True)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
if SECRET_KEY == 'your-secret-key-change-in-production':
    logging.warning("⚠️  JWT_SECRET_KEY is using the default insecure value! Set a strong secret in production .env")
ALGORITHM = "HS256"

# In-memory OTP store: {email: {otp: str, expires_at: datetime, verified: bool}}
otp_store: Dict[str, dict] = {}

# Determine environment
IS_PRODUCTION = os.environ.get('ENVIRONMENT', 'development').lower() == 'production'

# FastAPI app — hide docs in production
app = FastAPI(
    title="Magnova ERP API",
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)
api_router = APIRouter(prefix="/api")

# CORS — read allowed origins from env (comma-separated)
_cors_env = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
_cors_origins = [o.strip() for o in _cors_env.split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: EmailStr
    name: str
    organization: str
    role: str
    phone: Optional[str] = None
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    organization: str
    role: str
    phone: Optional[str] = None

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class MaintenanceContact(BaseModel):
    email: EmailStr

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
    po_quantity: Optional[int] = 1
    purchase_quantity: Optional[int] = 1
    purchase_price: float
    procurement_date: datetime
    created_by: str
    gap_qty: int = 0
    gap_amt: float = 0.0
    settlement_amount: Optional[float] = None
    settlement_utr: Optional[str] = None
    settlement_date: Optional[datetime] = None
    gap_resolved: bool = False
    created_at: datetime

class ProcurementCreate(BaseModel):
    po_number: str
    vendor_name: str
    store_location: str
    imei: Optional[str] = None
    serial_number: Optional[str] = None
    device_model: str
    po_quantity: Optional[int] = 1
    purchase_quantity: int
    purchase_price: float

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str
    po_number: str
    payment_type: str  # 'internal' or 'external'
    procurement_id: Optional[str] = None
    payee_type: Optional[str] = None  # 'vendor' or 'cc' for external
    payee_name: str
    payee_phone: Optional[str] = None
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
    payee_phone: Optional[str] = None  # Required when payee_type is 'cc'
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
    procurement_id: Optional[str] = None
    device_model: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    colour: Optional[str] = None
    storage: Optional[str] = None
    vendor: Optional[str] = None
    status: str
    current_location: str
    organization: str
    po_number: Optional[str] = None
    purchase_price: Optional[float] = None
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
    brand: Optional[str] = None
    model: Optional[str] = None
    colour: Optional[str] = None

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
    gst_percentage: Optional[float] = 18
    total_amount: float
    imei_list: List[str]
    invoice_date: datetime
    payment_status: str
    description: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    created_by: str
    created_at: datetime

class InvoiceCreate(BaseModel):
    invoice_type: str
    po_number: str
    from_organization: str
    to_organization: str
    amount: float
    gst_amount: float
    gst_percentage: Optional[float] = 18
    imei_list: List[str] = []
    invoice_date: datetime
    description: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None

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

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

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

# ── SMTP Email Helper (runs in thread executor so it doesn't block async loop) ──
import asyncio
import functools

def _send_smtp_sync(to_email: str, subject: str, html_body: str):
    """Blocking SMTP send – called via run_in_executor so it won't block FastAPI."""
    gmail_sender = os.environ.get("GMAIL_SENDER", "")
    gmail_pass   = os.environ.get("GMAILPASS", "")
    if not gmail_sender or not gmail_pass:
        logging.error("SMTP: GMAIL_SENDER or GMAILPASS env var is not set.")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = gmail_sender
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_sender, gmail_pass)
            server.sendmail(gmail_sender, to_email, msg.as_string())
        logging.info(f"SMTP email sent to {to_email} | subject: {subject}")
        return True
    except Exception as e:
        logging.error(f"SMTP send error to {to_email}: {e}")
        return False

async def send_smtp_email(to_email: str, subject: str, html_body: str) -> bool:
    """Async wrapper – runs blocking SMTP send in a thread pool executor."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, functools.partial(_send_smtp_sync, to_email, subject, html_body)
    )
# ────────────────────────────────────────────────────────────────────────────────

# Auth Endpoints
@api_router.post("/auth/send-otp")
async def send_otp(req: OTPRequest):
    """Generate a 6-digit OTP and send to user email via SMTP."""
    otp = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    otp_store[req.email] = {"otp": otp, "expires_at": expires_at, "verified": False}

    # Format expiry time for email (IST)
    expiry_ist = expires_at + timedelta(hours=5, minutes=30)
    expiry_str = expiry_ist.strftime("%I:%M %p IST")
    name_hint  = req.email.split('@')[0]

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 24px;">
      <div style="max-width:500px; margin:0 auto; background:#fff; border-radius:10px;
                  box-shadow:0 2px 10px rgba(0,0,0,0.08); overflow:hidden;">
        <div style="background:#1a1a1a; padding:22px 30px; text-align:center;">
          <h2 style="color:#fff; margin:0; font-size:20px; letter-spacing:1px;">MAGNOVA ERP</h2>
          <p style="color:#aaa; margin:4px 0 0; font-size:13px;">Email Verification</p>
        </div>
        <div style="padding:30px;">
          <p style="color:#333; font-size:15px;">Hi <strong>{name_hint}</strong>,</p>
          <p style="color:#555; font-size:14px;">
            Use the OTP below to verify your email address and complete registration.
          </p>

          <!-- OTP box -->
          <div style="text-align:center; margin:28px 0;">
            <div style="display:inline-block; background:#f0f0f0; border:2px dashed #1a1a1a;
                        border-radius:10px; padding:18px 40px;">
              <p style="margin:0; font-size:36px; font-weight:bold; font-family:monospace;
                         color:#1a1a1a; letter-spacing:10px;">{otp}</p>
            </div>
          </div>

          <p style="color:#e03e3e; font-size:13px; text-align:center; font-weight:bold;">
            ⏰ Valid until {expiry_str} (5 minutes only)
          </p>

          <div style="background:#fff8e1; border-left:4px solid #f59e0b; padding:12px 16px;
                      border-radius:4px; margin:20px 0; font-size:13px; color:#555;">
            <strong>Security notice:</strong> Magnova will never ask you to share this OTP.
            If you didn't request this, you can safely ignore this email.
          </div>

          <p style="color:#999; font-size:12px; border-top:1px solid #eee; padding-top:14px; margin-top:6px;">
            This is an automated message from Magnova ERP System. Do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    success = await send_smtp_email(req.email, "Your Magnova OTP – Verify Email", html_body)

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP email. Please check your email address and try again."
        )

    return {"message": "OTP sent successfully", "expires_in": 300}

@api_router.post("/auth/verify-otp")
async def verify_otp(req: OTPVerify):
    """Verify the OTP entered by the user"""
    record = otp_store.get(req.email)
    if not record:
        raise HTTPException(status_code=400, detail="No OTP found for this email. Please request a new OTP.")
    if datetime.now(timezone.utc) > record["expires_at"]:
        del otp_store[req.email]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    if record["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")
    otp_store[req.email]["verified"] = True
    return {"message": "Email verified successfully"}

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    from uuid import uuid4
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check email is verified via OTP
    otp_record = otp_store.get(user_data.email)
    if not otp_record or not otp_record.get("verified"):
        raise HTTPException(status_code=400, detail="Email not verified. Please verify your email with OTP first.")

    user_id = str(uuid4())
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "organization": user_data.organization,
        "role": user_data.role,
        "phone": user_data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.users.insert_one(user_doc)
    # Clean up OTP store
    if user_data.email in otp_store:
        del otp_store[user_data.email]

    user  = User(**{k: v for k, v in user_doc.items() if k != "password"})
    token = create_token(user_id, user_data.email)

    # ── Send welcome email via SMTP ─────────────────────────────────────────
    welcome_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 24px;">
      <div style="max-width:540px; margin:0 auto; background:#fff; border-radius:10px;
                  box-shadow:0 2px 10px rgba(0,0,0,0.08); overflow:hidden;">
        <div style="background:#1a1a1a; padding:22px 30px; text-align:center;">
          <h2 style="color:#fff; margin:0; font-size:22px; letter-spacing:1px;">MAGNOVA ERP</h2>
          <p style="color:#aaa; margin:4px 0 0; font-size:13px;">Welcome to the Platform</p>
        </div>
        <div style="padding:32px 30px;">
          <h3 style="color:#1a1a1a; margin-top:0;">Welcome, {user_data.name}! 🎉</h3>
          <p style="color:#555; font-size:15px; line-height:1.6;">
            Your account has been successfully created on the <strong>Magnova ERP System</strong>.
            You now have access to procurement, payments, logistics, and inventory management.
          </p>

          <table style="border-collapse:collapse; width:100%; margin:20px 0; font-size:14px;">
            <tr style="background:#f7fafc;">
              <td style="padding:10px 14px; border:1px solid #e2e8f0; font-weight:bold; width:130px;">Name</td>
              <td style="padding:10px 14px; border:1px solid #e2e8f0;">{user_data.name}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px; border:1px solid #e2e8f0; font-weight:bold; background:#f7fafc;">Email</td>
              <td style="padding:10px 14px; border:1px solid #e2e8f0;">{user_data.email}</td>
            </tr>
            <tr style="background:#f7fafc;">
              <td style="padding:10px 14px; border:1px solid #e2e8f0; font-weight:bold;">Organization</td>
              <td style="padding:10px 14px; border:1px solid #e2e8f0;">{user_data.organization}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px; border:1px solid #e2e8f0; font-weight:bold; background:#f7fafc;">Role</td>
              <td style="padding:10px 14px; border:1px solid #e2e8f0;">{user_data.role}</td>
            </tr>
          </table>

          <div style="background:#f0fdf4; border-left:4px solid #22c55e; padding:12px 16px;
                      border-radius:4px; margin-bottom:20px; font-size:13px; color:#166534;">
            ✅ Your account is active. Login at <strong>http://localhost:3000/login</strong>
          </div>

          <div style="background:#fef2f2; border-left:4px solid #ef4444; padding:12px 16px;
                      border-radius:4px; font-size:13px; color:#991b1b;">
            🔒 Keep your credentials safe. Magnova will never ask for your password or login codes.
            Beware of phishing scams.
          </div>

          <p style="color:#999; font-size:12px; border-top:1px solid #eee; padding-top:14px; margin-top:20px;">
            Thanks for joining Magnova! This is an automated message — do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    await send_smtp_email(user_data.email, f"Welcome to Magnova, {user_data.name}!", welcome_html)
    # ────────────────────────────────────────────────────────────────────────

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
    if current_user.role.lower() not in ["admin", "purchase"]:
        raise HTTPException(status_code=403, detail="Only Admins or Purchase Team can create POs")
    
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
    if current_user.role not in ["Approver", "Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Only managers or approvers can approve POs")
    
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
    
    # Generate IMEI if not provided
    imei = proc_data.imei or str(uuid4()).replace('-', '')[:15]
    
    existing_imei = await db.procurement.find_one({"imei": imei})
    if existing_imei:
        raise HTTPException(status_code=400, detail="IMEI already exists")
    
    proc_id = str(uuid4())
    gap_qty = (proc_data.po_quantity or 1) - proc_data.purchase_quantity
    gap_amt = gap_qty * proc_data.purchase_price

    proc_doc = {
        "procurement_id": proc_id,
        "po_number": proc_data.po_number,
        "vendor_name": proc_data.vendor_name,
        "store_location": proc_data.store_location,
        "imei": imei,
        "serial_number": proc_data.serial_number,
        "device_model": proc_data.device_model,
        "po_quantity": proc_data.po_quantity or 1,
        "purchase_quantity": proc_data.purchase_quantity,
        "purchase_price": proc_data.purchase_price,
        "procurement_date": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.user_id,
        "gap_qty": gap_qty,
        "gap_amt": gap_amt,
        "settlement_amount": None,
        "settlement_utr": None,
        "settlement_date": None,
        "gap_resolved": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.procurement.insert_one(proc_doc)
    
    imei_doc = {
        "imei": imei,
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
    
    await create_audit_log("CREATE", "Procurement", proc_id, current_user, {"imei": imei, "gap_qty": gap_qty})
    
    return ProcurementRecord(**{k: v for k, v in proc_doc.items() if k != "_id"})

class GapResolution(BaseModel):
    action: str  # 'reverse' or 'update'
    settlement_amount: Optional[float] = None
    settlement_utr: Optional[str] = None

@api_router.post("/procurement/{procurement_id}/resolve-gap")
async def resolve_gap(procurement_id: str, resolution: GapResolution, current_user: User = Depends(get_current_user)):
    proc = await db.procurement.find_one({"procurement_id": procurement_id})
    if not proc:
        raise HTTPException(status_code=404, detail="Procurement record not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if resolution.action == "reverse":
        # Create in-app notification for the creator (existing behaviour)
        notification = {
            "type": "gap_reverse",
            "procurement_id": procurement_id,
            "po_number": proc["po_number"],
            "message": "Resolve the issue in 48 hours",
            "target_user_id": proc["created_by"],
            "status": "pending",
            "color": "red",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "deadline": (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
        }
        await db.notifications.insert_one(notification)
        await create_audit_log("GAP_REVERSE", "Procurement", procurement_id, current_user, {"message": "Reverse requested"})

        # ── Send SMTP email to the PO creator ──────────────────────────────
        try:
            # Fetch PO creator's user record to get their email
            creator = await db.users.find_one({"user_id": proc["created_by"]}, {"_id": 0})
            if creator and creator.get("email"):
                creator_email = creator["email"]
                creator_name  = creator.get("name", creator_email)

                deadline_ist  = (datetime.now(timezone.utc) + timedelta(hours=48, minutes=330))  # +5:30 IST
                deadline_str  = deadline_ist.strftime("%d %b %Y, %I:%M %p IST")
                
                gmail_sender  = os.environ.get("GMAIL_SENDER", "")
                gmail_pass    = os.environ.get("GMAILPASS", "")
                
                msg = MIMEMultipart("alternative")
                msg["Subject"] = f"⚠️ Action Required: Resolve Procurement Gap within 48 Hours – {proc['po_number']}"
                msg["From"]    = gmail_sender
                msg["To"]      = creator_email

                html_body = f"""
                <html>
                <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px;">
                  <div style="max-width:620px; margin:0 auto; background:#fff; border-radius:8px;
                              box-shadow:0 2px 8px rgba(0,0,0,.1); overflow:hidden;">
                    <!-- Red header banner -->
                    <div style="background:#DC2626; padding:20px 30px;">
                      <h2 style="color:#fff; margin:0; font-size:20px;">⚠️ Procurement Gap – Action Required</h2>
                    </div>
                    <div style="padding:28px 30px;">
                      <p style="color:#444; font-size:15px;">Dear <strong>{creator_name}</strong>,</p>
                      <p style="color:#444; font-size:15px;">
                        A <strong style="color:#DC2626;">Reverse</strong> action has been triggered on a
                        procurement record under your Purchase Order. Please resolve the gap issue
                        <strong>within 48 hours</strong> to avoid escalation.
                      </p>

                      <!-- Detail table -->
                      <table style="border-collapse:collapse; width:100%; margin:18px 0; font-size:14px;">
                        <tr style="background:#FEF2F2;">
                          <td style="padding:10px 14px; border:1px solid #FCA5A5; font-weight:bold; width:170px;">PO Number</td>
                          <td style="padding:10px 14px; border:1px solid #FCA5A5; font-family:monospace;">{proc['po_number']}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 14px; border:1px solid #e2e8f0; font-weight:bold; background:#f7fafc;">IMEI</td>
                          <td style="padding:10px 14px; border:1px solid #e2e8f0; font-family:monospace;">{proc.get('imei', 'N/A')}</td>
                        </tr>
                        <tr style="background:#FEF2F2;">
                          <td style="padding:10px 14px; border:1px solid #FCA5A5; font-weight:bold;">Device Model</td>
                          <td style="padding:10px 14px; border:1px solid #FCA5A5;">{proc.get('device_model', 'N/A')}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 14px; border:1px solid #e2e8f0; font-weight:bold; background:#f7fafc;">Gap Qty</td>
                          <td style="padding:10px 14px; border:1px solid #e2e8f0; color:#DC2626; font-weight:bold;">{proc.get('gap_qty', 0)}</td>
                        </tr>
                        <tr style="background:#FEF2F2;">
                          <td style="padding:10px 14px; border:1px solid #FCA5A5; font-weight:bold;">Gap Amount</td>
                          <td style="padding:10px 14px; border:1px solid #FCA5A5; color:#DC2626; font-weight:bold;">₹{proc.get('gap_amt', 0):,.2f}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 14px; border:1px solid #e2e8f0; font-weight:bold; background:#f7fafc;">Resolve By</td>
                          <td style="padding:10px 14px; border:1px solid #e2e8f0; color:#DC2626; font-weight:bold;">{deadline_str}</td>
                        </tr>
                        <tr style="background:#FEF2F2;">
                          <td style="padding:10px 14px; border:1px solid #FCA5A5; font-weight:bold;">Initiated By</td>
                          <td style="padding:10px 14px; border:1px solid #FCA5A5;">{current_user.name}</td>
                        </tr>
                      </table>

                      <div style="background:#FEF2F2; border-left:4px solid #DC2626; padding:14px 18px; border-radius:4px; margin-bottom:20px;">
                        <p style="margin:0; color:#991B1B; font-weight:bold;">
                          🕐 You have <u>48 hours</u> to resolve this issue in the Magnova ERP system.
                          Failure to act will result in automatic escalation to the Manager.
                        </p>
                      </div>

                      <p style="color:#666; font-size:13px; border-top:1px solid #eee; padding-top:16px; margin-top:8px;">
                        Please log in to the Magnova ERP system and navigate to
                        <strong>Procurement → Review Procurement Issue</strong> to resolve this gap.
                        <br><br>
                        This is an automated alert. Do not reply to this email.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
                """

                msg.attach(MIMEText(html_body, "html"))

                with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                    server.login(gmail_sender, gmail_pass)
                    server.sendmail(gmail_sender, creator_email, msg.as_string())

                logging.info(f"Gap-reverse email sent to {creator_email} for PO {proc['po_number']}")
            else:
                logging.warning(f"Gap-reverse: PO creator user_id={proc['created_by']} not found or has no email")
        except Exception as mail_err:
            logging.error(f"Gap-reverse SMTP email error: {mail_err}")
            # Don't fail the API call if email fails – notification already saved
        # ───────────────────────────────────────────────────────────────────

        return {"message": "Reverse notification sent to purchase team and email dispatched"}

        
    elif resolution.action == "update":
        # Resolve the gap
        update_data.update({
            "gap_qty": 0,
            "gap_amt": 0,
            "purchase_quantity": proc["po_quantity"],
            "gap_resolved": True,
            "settlement_amount": resolution.settlement_amount,
            "settlement_utr": resolution.settlement_utr,
            "settlement_date": datetime.now(timezone.utc).isoformat()
        })
        await db.procurement.update_one({"procurement_id": procurement_id}, {"$set": update_data})
        
        # ── Remove gap_reverse notification so header banner disappears ──
        await db.notifications.delete_many({
            "type": "gap_reverse",
            "procurement_id": procurement_id
        })
        # ─────────────────────────────────────────────────────────────────
        
        await create_audit_log("GAP_UPDATE", "Procurement", procurement_id, current_user, {"settlement_amount": resolution.settlement_amount})
        return {"message": "Gap resolved and quantities updated"}

    return {"message": "Resolution completed"}

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
        "payee_phone": payment_data.payee_phone,
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

@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    # Find notifications for this user or their role
    query = {
        "$or": [
            {"target_user_id": current_user.user_id},
            {"role": current_user.role}
        ]
    }
    
    # Also include Manager notifications for escalated issues
    if current_user.role in ["Manager", "Admin"]:
        # Find escalated notifications (older than 48h)
        escalated_query = {
            "type": "gap_reverse",
            "status": "pending",
            "created_at": {"$lt": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()}
        }
        query["$or"].append(escalated_query)

    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Process notifications for escalation
    for n in notifications:
        if n.get("type") == "gap_reverse" and n.get("status") == "pending":
            created_at = datetime.fromisoformat(n["created_at"])
            if (datetime.now(timezone.utc) - created_at).total_seconds() > 48 * 3600:
                n["is_escalated"] = True
                n["message"] = f"URGENT: {n['message']} (Escalated to Manager)"
                
    return notifications
@api_router.get("/inventory/lookup/{imei}")
async def lookup_imei(imei: str, current_user: User = Depends(get_current_user)):
    """Lookup IMEI details - always returns found: true to allow any IMEI without procurement linking"""
    # First check if IMEI exists in inventory
    inventory_record = await db.imei_inventory.find_one({"imei": imei}, {"_id": 0})
    
    # Then check procurement records for this IMEI
    procurement_record = await db.procurement.find_one({"imei": imei}, {"_id": 0})
    
    # Also check PO items for this IMEI to get brand, model, color
    po_item_data = None
    if procurement_record and procurement_record.get("po_number"):
        po = await db.purchase_orders.find_one({"po_number": procurement_record.get("po_number")}, {"_id": 0})
        if po and po.get("items"):
            for item in po["items"]:
                if item.get("imei") == imei or item.get("vendor") == procurement_record.get("vendor_name"):
                    po_item_data = item
                    break
            # If no exact match, use first item with same vendor
            if not po_item_data:
                po_item_data = po["items"][0] if po["items"] else None
    
    # Always return found: true - allow any IMEI without requiring procurement linking
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
    
    # If we found PO item data, get brand, model, color
    if po_item_data:
        result["brand"] = po_item_data.get("brand")
        result["model"] = po_item_data.get("model")
        result["colour"] = po_item_data.get("colour")
        result["storage"] = po_item_data.get("storage")
        # Also use vendor and location from PO item if available
        if po_item_data.get("vendor"):
            result["vendor"] = po_item_data.get("vendor")
        if po_item_data.get("location"):
            result["store_location"] = po_item_data.get("location")
    
    # If in inventory, get current status
    if inventory_record:
        result["status"] = inventory_record.get("status")
        result["current_location"] = inventory_record.get("current_location")
        result["organization"] = inventory_record.get("organization")
        result["device_model"] = inventory_record.get("device_model")
        result["vendor"] = inventory_record.get("vendor")
        result["brand"] = inventory_record.get("brand") or result.get("brand")
        result["model"] = inventory_record.get("model") or result.get("model")
        result["colour"] = inventory_record.get("colour") or result.get("colour")
    
    return result

@api_router.post("/inventory/scan")
async def scan_imei(scan_data: IMEIScan, current_user: User = Depends(get_current_user)):
    try:
        # Validate required fields
        if not scan_data.imei or not scan_data.imei.strip():
            raise HTTPException(status_code=400, detail="IMEI is required")
        if not scan_data.action or not scan_data.action.strip():
            raise HTTPException(status_code=400, detail="Action is required")
        if not scan_data.location or not scan_data.location.strip():
            raise HTTPException(status_code=400, detail="Location is required")
        
        # Valid actions
        valid_actions = ["inward_nova", "inward_magnova", "outward_nova", "outward_magnova", "dispatch", "available"]
        if scan_data.action not in valid_actions:
            raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {', '.join(valid_actions)}")
        
        imei_record = await db.imei_inventory.find_one({"imei": scan_data.imei})
        
        # If IMEI not in inventory, check procurement and create entry
        if not imei_record:
            procurement_record = await db.procurement.find_one({"imei": scan_data.imei})
            
            # Get PO item data for brand, model, color
            po_item_data = None
            if procurement_record and procurement_record.get("po_number"):
                po = await db.purchase_orders.find_one({"po_number": procurement_record.get("po_number")}, {"_id": 0})
                if po and po.get("items"):
                    for item in po["items"]:
                        if item.get("imei") == scan_data.imei or item.get("vendor") == procurement_record.get("vendor_name"):
                            po_item_data = item
                            break
                    if not po_item_data:
                        po_item_data = po["items"][0] if po["items"] else None
            
            # Create new inventory entry - allow IMEI even without procurement record
            new_inventory = {
                "imei": scan_data.imei,
                "device_model": procurement_record.get("device_model", "Unknown") if procurement_record else "Unknown",
                "status": "Procured" if procurement_record else "Available",
                "vendor": (procurement_record.get("vendor_name") if procurement_record else None) or scan_data.vendor or "Unknown",
                "organization": "Nova",
                "current_location": scan_data.location or (procurement_record.get("store_location") if procurement_record else ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            
            # Add procurement data if available
            if procurement_record:
                new_inventory["po_number"] = procurement_record.get("po_number")
                new_inventory["procurement_id"] = procurement_record.get("procurement_id")
                new_inventory["purchase_price"] = procurement_record.get("purchase_price")
            
            # Add brand, model, color from PO item data
            if po_item_data:
                new_inventory["brand"] = po_item_data.get("brand")
                new_inventory["model"] = po_item_data.get("model")
                new_inventory["colour"] = po_item_data.get("colour")
                new_inventory["storage"] = po_item_data.get("storage")
            
            await db.imei_inventory.insert_one(new_inventory)
            imei_record = new_inventory
        
        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "current_location": scan_data.location,
        }
        
        # Add vendor if provided
        if scan_data.vendor and scan_data.vendor.strip():
            update_data["vendor"] = scan_data.vendor
        
        # Add brand, model, colour if provided
        if scan_data.brand and scan_data.brand.strip():
            update_data["brand"] = scan_data.brand
        if scan_data.model and scan_data.model.strip():
            update_data["model"] = scan_data.model
        if scan_data.colour and scan_data.colour.strip():
            update_data["colour"] = scan_data.colour
        
        # Set status based on action
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
        
        # Update the inventory record
        result = await db.imei_inventory.update_one(
            {"imei": scan_data.imei}, 
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update IMEI record")
        
        await create_audit_log("SCAN", "IMEI", scan_data.imei, current_user, {
            "action": scan_data.action, 
            "location": scan_data.location, 
            "vendor": scan_data.vendor or "N/A"
        })
        
        return {
            "message": "IMEI scanned successfully", 
            "status": update_data.get("status", "Unknown")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scanning IMEI {scan_data.imei}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to scan IMEI: {str(e)}")

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
        "status": "In Transit",
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
        "gst_percentage": invoice_data.gst_percentage or 18,
        "total_amount": invoice_data.amount + invoice_data.gst_amount,
        "imei_list": invoice_data.imei_list or [],
        "invoice_date": invoice_data.invoice_date.isoformat(),
        "payment_status": "Pending",
        "description": invoice_data.description,
        "billing_address": invoice_data.billing_address,
        "shipping_address": invoice_data.shipping_address,
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
        # Ensure backward compatibility for new fields
        if 'gst_percentage' not in invoice:
            invoice['gst_percentage'] = 18
        if 'description' not in invoice:
            invoice['description'] = None
        if 'billing_address' not in invoice:
            invoice['billing_address'] = None
        if 'shipping_address' not in invoice:
            invoice['shipping_address'] = None
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

# Get related records count for a PO (for confirmation before delete)
@api_router.get("/purchase-orders/{po_number}/related-counts")
async def get_po_related_counts(po_number: str, current_user: User = Depends(get_current_user)):
    po = await db.purchase_orders.find_one({"po_number": po_number})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    procurement_count = await db.procurement.count_documents({"po_number": po_number})
    payments_count = await db.payments.count_documents({"po_number": po_number})
    logistics_count = await db.logistics_shipments.count_documents({"po_number": po_number})
    invoices_count = await db.invoices.count_documents({"po_number": po_number})
    
    # Get IMEIs from procurement to count inventory
    procurement_records = await db.procurement.find({"po_number": po_number}, {"imei": 1}).to_list(1000)
    imeis = [p.get("imei") for p in procurement_records if p.get("imei")]
    inventory_count = await db.imei_inventory.count_documents({"imei": {"$in": imeis}}) if imeis else 0
    
    return {
        "po_number": po_number,
        "procurement_records": procurement_count,
        "payments": payments_count,
        "logistics_shipments": logistics_count,
        "inventory_items": inventory_count,
        "invoices": invoices_count,
        "total_related": procurement_count + payments_count + logistics_count + inventory_count + invoices_count
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
    
    headers = ["IMEI", "Brand", "Model", "Colour", "Storage", "Device Model", "Status", "Vendor", "Organization", "Location", "PO Number", "Created At"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)
    
    for row, item in enumerate(inventory, start=1):
        worksheet.write(row, 0, item.get("imei", ""))
        worksheet.write(row, 1, item.get("brand", ""))
        worksheet.write(row, 2, item.get("model", ""))
        worksheet.write(row, 3, item.get("colour", ""))
        worksheet.write(row, 4, item.get("storage", ""))
        worksheet.write(row, 5, item.get("device_model", ""))
        worksheet.write(row, 6, item.get("status", ""))
        worksheet.write(row, 7, item.get("vendor", ""))
        worksheet.write(row, 8, item.get("organization", ""))
        worksheet.write(row, 9, item.get("current_location", ""))
        worksheet.write(row, 10, item.get("po_number", ""))
        worksheet.write(row, 11, str(item.get("created_at", "")))
    
    workbook.close()
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=inventory_report.xlsx"}
    )

@api_router.get("/reports/export/master")
async def export_master_report(current_user: User = Depends(get_current_user)):
    """Export the complete Master Report with all sections as Excel"""
    
    # Fetch all data
    pos = await db.purchase_orders.find({}, {"_id": 0}).to_list(1000)
    procurements = await db.procurement.find({}, {"_id": 0}).to_list(1000)
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    shipments = await db.logistics_shipments.find({}, {"_id": 0}).to_list(1000)
    inventory = await db.imei_inventory.find({}, {"_id": 0}).to_list(5000)
    
    # Separate internal and external payments
    internal_payments = [p for p in payments if p.get("payment_type") == "internal" or not p.get("payment_type")]
    external_payments = [p for p in payments if p.get("payment_type") == "external"]
    
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Master Report")
    
    # Formatting
    header_format = workbook.add_format({'bold': True, 'bg_color': '#1e3a5f', 'font_color': 'white', 'border': 1})
    section_format_procurement = workbook.add_format({'bold': True, 'bg_color': '#16a34a', 'font_color': 'white', 'border': 1})
    section_format_payment_int = workbook.add_format({'bold': True, 'bg_color': '#f97316', 'font_color': 'white', 'border': 1})
    section_format_payment_ext = workbook.add_format({'bold': True, 'bg_color': '#9333ea', 'font_color': 'white', 'border': 1})
    section_format_logistics = workbook.add_format({'bold': True, 'bg_color': '#2563eb', 'font_color': 'white', 'border': 1})
    section_format_stores = workbook.add_format({'bold': True, 'bg_color': '#ec4899', 'font_color': 'white', 'border': 1})
    cell_format = workbook.add_format({'border': 1})
    money_format = workbook.add_format({'border': 1, 'num_format': '₹#,##0.00'})
    
    # Section Headers Row
    worksheet.merge_range('A1:O1', 'PROCUREMENT (Magnova → Nova PO)', section_format_procurement)
    worksheet.merge_range('P1:U1', 'PAYMENT (Magnova → Nova)', section_format_payment_int)
    worksheet.merge_range('V1:AB1', 'PAYMENTS (Nova → Vendors)', section_format_payment_ext)
    worksheet.merge_range('AC1:AF1', 'LOGISTICS', section_format_logistics)
    worksheet.merge_range('AG1:AJ1', 'STORES', section_format_stores)
    
    # Column Headers Row
    headers = [
        # PROCUREMENT (Magnova → Nova PO) - 15 columns
        'SL No', 'PO ID', 'PO Date', 'Purchase Office', 'Vendor', 'Location', 'Brand', 'Model', 
        'Storage', 'Colour', 'IMEI', 'Qty', 'Rate', 'PO Value', 'GRN No',
        # PAYMENT (Magnova → Nova) - 6 columns
        'Payment#', 'Payee Account', 'Payee Bank', 'Payment Dt', 'UTR/Ref#', 'Amount',
        # PAYMENTS (Nova → Vendors) - 7 columns
        'Payment#', 'Payee Name', 'Payee Type', 'Account #', 'Payment Dt', 'UTR #', 'Amount',
        # LOGISTICS - 4 columns
        'Courier', 'Dispatch Dt', 'POD No', 'Status',
        # STORES - 4 columns
        'Received Dt', 'Rcvd Qty', 'Warehouse', 'Status'
    ]
    
    for col, header in enumerate(headers):
        worksheet.write(1, col, header, header_format)
    
    # Data Rows
    row = 2
    sl_no = 1
    
    for po in pos:
        items = po.get("items", [{}])
        for item in items:
            # Find related data
            related_proc = next((p for p in procurements if p.get("po_number") == po.get("po_number") and 
                               (p.get("vendor_name") == item.get("vendor") or p.get("device_model", "").find(item.get("model", "")) >= 0)), None)
            related_int_payment = next((p for p in internal_payments if p.get("po_number") == po.get("po_number")), None)
            related_ext_payment = next((p for p in external_payments if p.get("po_number") == po.get("po_number")), None)
            related_shipment = next((s for s in shipments if s.get("po_number") == po.get("po_number") and 
                                    (s.get("vendor") == item.get("vendor") or s.get("from_location") == item.get("location"))), None)
            related_inv = next((i for i in inventory if 
                               (i.get("brand") and item.get("brand") and i.get("brand") == item.get("brand")) or
                               (i.get("model") and item.get("model") and i.get("model") == item.get("model"))), None)
            
            # PROCUREMENT columns
            worksheet.write(row, 0, sl_no, cell_format)
            worksheet.write(row, 1, po.get("po_number", ""), cell_format)
            worksheet.write(row, 2, str(po.get("po_date", ""))[:10], cell_format)
            worksheet.write(row, 3, po.get("purchase_office", ""), cell_format)
            worksheet.write(row, 4, item.get("vendor", ""), cell_format)
            worksheet.write(row, 5, item.get("location", ""), cell_format)
            worksheet.write(row, 6, item.get("brand", ""), cell_format)
            worksheet.write(row, 7, item.get("model", ""), cell_format)
            worksheet.write(row, 8, item.get("storage", ""), cell_format)
            worksheet.write(row, 9, item.get("colour", ""), cell_format)
            worksheet.write(row, 10, item.get("imei") or (related_proc.get("imei") if related_proc else ""), cell_format)
            worksheet.write(row, 11, item.get("qty", 0), cell_format)
            worksheet.write(row, 12, item.get("rate", 0), money_format)
            worksheet.write(row, 13, item.get("po_value", 0), money_format)
            worksheet.write(row, 14, related_proc.get("procurement_id", "")[:8] if related_proc else "-", cell_format)
            
            # PAYMENT (Magnova → Nova) columns
            worksheet.write(row, 15, related_int_payment.get("payment_id", "")[:8] if related_int_payment else "-", cell_format)
            worksheet.write(row, 16, related_int_payment.get("payee_account", "-") if related_int_payment else "-", cell_format)
            worksheet.write(row, 17, related_int_payment.get("payee_bank", "-") if related_int_payment else "-", cell_format)
            worksheet.write(row, 18, str(related_int_payment.get("payment_date", ""))[:10] if related_int_payment else "-", cell_format)
            worksheet.write(row, 19, related_int_payment.get("transaction_ref", "-") if related_int_payment else "-", cell_format)
            worksheet.write(row, 20, related_int_payment.get("amount", 0) if related_int_payment else 0, money_format)
            
            # PAYMENTS (Nova → Vendors) columns
            worksheet.write(row, 21, related_ext_payment.get("payment_id", "")[:8] if related_ext_payment else "-", cell_format)
            worksheet.write(row, 22, related_ext_payment.get("payee_name", "-") if related_ext_payment else "-", cell_format)
            worksheet.write(row, 23, related_ext_payment.get("payee_type", "-") if related_ext_payment else "-", cell_format)
            worksheet.write(row, 24, related_ext_payment.get("account_number", "-") if related_ext_payment else "-", cell_format)
            worksheet.write(row, 25, str(related_ext_payment.get("payment_date", ""))[:10] if related_ext_payment else "-", cell_format)
            worksheet.write(row, 26, related_ext_payment.get("utr_number", "-") if related_ext_payment else "-", cell_format)
            worksheet.write(row, 27, related_ext_payment.get("amount", 0) if related_ext_payment else 0, money_format)
            
            # LOGISTICS columns
            worksheet.write(row, 28, related_shipment.get("transporter_name", "-") if related_shipment else "-", cell_format)
            worksheet.write(row, 29, str(related_shipment.get("pickup_date", ""))[:10] if related_shipment else "-", cell_format)
            worksheet.write(row, 30, related_shipment.get("shipment_id", "")[:8] if related_shipment else "-", cell_format)
            worksheet.write(row, 31, related_shipment.get("status", "-") if related_shipment else "-", cell_format)
            
            # STORES columns
            worksheet.write(row, 32, str(related_inv.get("created_at", ""))[:10] if related_inv else "-", cell_format)
            worksheet.write(row, 33, 1 if related_inv else 0, cell_format)
            worksheet.write(row, 34, related_inv.get("current_location", "-") if related_inv else "-", cell_format)
            worksheet.write(row, 35, related_inv.get("status", "-") if related_inv else "-", cell_format)
            
            row += 1
            sl_no += 1
    
    # Auto-fit columns (approximate)
    for col in range(36):
        worksheet.set_column(col, col, 12)
    
    workbook.close()
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=master_report.xlsx"}
    )

@api_router.get("/audit-logs")
async def get_audit_logs(entity_type: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(500).to_list(500)
    return logs

# DELETE ENDPOINTS - Admin Only with CASCADE
@api_router.delete("/purchase-orders/{po_number}")
async def delete_purchase_order(po_number: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete records")
    
    # Check if PO exists
    po = await db.purchase_orders.find_one({"po_number": po_number})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    # CASCADE DELETE - Delete all related records
    deleted_counts = {
        "procurement": 0,
        "payments": 0,
        "logistics": 0,
        "inventory": 0,
        "invoices": 0
    }
    
    # 1. Get all procurement records for this PO (to get IMEIs)
    procurement_records = await db.procurement.find({"po_number": po_number}).to_list(1000)
    imeis_to_delete = [p.get("imei") for p in procurement_records if p.get("imei")]
    
    # 2. Delete related inventory items
    if imeis_to_delete:
        inv_result = await db.imei_inventory.delete_many({"imei": {"$in": imeis_to_delete}})
        deleted_counts["inventory"] = inv_result.deleted_count
    
    # 3. Delete all procurement records for this PO
    proc_result = await db.procurement.delete_many({"po_number": po_number})
    deleted_counts["procurement"] = proc_result.deleted_count
    
    # 4. Delete all payments for this PO
    pay_result = await db.payments.delete_many({"po_number": po_number})
    deleted_counts["payments"] = pay_result.deleted_count
    
    # 5. Delete all logistics/shipments for this PO
    log_result = await db.logistics_shipments.delete_many({"po_number": po_number})
    deleted_counts["logistics"] = log_result.deleted_count
    
    # 6. Delete all invoices for this PO
    inv_result = await db.invoices.delete_many({"po_number": po_number})
    deleted_counts["invoices"] = inv_result.deleted_count
    
    # 7. Finally delete the PO
    await db.purchase_orders.delete_one({"po_number": po_number})
    
    await create_audit_log("CASCADE_DELETE", "PurchaseOrder", po_number, current_user, deleted_counts)
    return {
        "message": f"Purchase order {po_number} and all related records deleted successfully",
        "deleted_counts": deleted_counts
    }

@api_router.delete("/admin/clear-all-data")
async def clear_all_data(current_user: User = Depends(get_current_user)):
    """Clear all transactional data while preserving user accounts"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can clear data")
    
    deleted_counts = {}
    
    # Delete all transactional data
    deleted_counts["purchase_orders"] = (await db.purchase_orders.delete_many({})).deleted_count
    deleted_counts["procurement"] = (await db.procurement.delete_many({})).deleted_count
    deleted_counts["payments"] = (await db.payments.delete_many({})).deleted_count
    deleted_counts["logistics_shipments"] = (await db.logistics_shipments.delete_many({})).deleted_count
    deleted_counts["imei_inventory"] = (await db.imei_inventory.delete_many({})).deleted_count
    deleted_counts["invoices"] = (await db.invoices.delete_many({})).deleted_count
    deleted_counts["audit_logs"] = (await db.audit_logs.delete_many({})).deleted_count
    
    await create_audit_log("CLEAR_ALL_DATA", "System", "all", current_user, deleted_counts)
    
    return {
        "message": "All transactional data cleared successfully. User accounts preserved.",
        "deleted_counts": deleted_counts
    }


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

# Chatbot Logic
SYSTEM_PROMPT = """
You are "Magnova AI", a professional assistant for the Magnova & Nova logistics system.
You have access to a MongoDB database with these collections:
- purchase_orders: {po_number, po_date, purchase_office, status, total_quantity, total_value, items: [{vendor, brand, model, qty, rate}], approval_status}
- procurement: {po_number, vendor_name, imei, device_model, purchase_price, procurement_date}
- imei_inventory: {imei, brand, model, status, current_location, organization, po_number}
- logistics_shipments: {shipment_id, po_number, transporter_name, status, from_location, to_location, pickup_quantity}
- payments: {po_number, payment_type, payee_name, amount, status, payment_date}
- invoices: {invoice_number, po_number, total_amount, invoice_date}

If the user asks a question in a specific language (like Telugu, Hindi, etc.), respond in that same language. Maintain the same professional tone.

Step 1: Convert the user's question into a MongoDB query.
Return ONLY a JSON object like this:
{
  "collection": "name", 
  "query": {}, 
  "type": "find" or "aggregate",
  "explanation": "Briefly what you are looking for"
}
If the question is just a greeting or general talk, return:
{"type": "chat", "response": "Your friendly response in the user's language"}
"""

@api_router.post("/chat")
async def handle_chat(request: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Step 1: Query Generation
        chat_prompt = f"{SYSTEM_PROMPT}\n\nUser: {request.message}"
        response = model.generate_content(chat_prompt)
        
        if not response.text:
             return {"response": "I received an empty response from the AI. Please try rephrasing."}

        # Extract JSON (strip markdown code blocks if present)
        text = response.text
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if not json_match:
            return {"response": text}
            
        try:
            data = json.loads(json_match.group())
        except json.JSONDecodeError:
            return {"response": text}
        
        if data.get("type") == "chat":
            return {"response": data.get("response")}
            
        # Step 2: DB Execution
        collection = data.get("collection")
        query = data.get("query", {})
        query_type = data.get("type", "find")
        
        # Validate collection
        existing_collections = await db.list_collection_names()
        if not collection or collection not in existing_collections:
             return {"response": f"I'm sorry, I couldn't find the relevant data in our {collection} records."}
        
        results = []
        if query_type == "aggregate":
            results = await db[collection].aggregate(query).to_list(10)
        else:
            # For find queries, ensure we don't return sensitive IDs
            results = await db[collection].find(query, {"_id": 0, "password": 0}).limit(10).to_list(10)
            
        if not results:
             return {"response": "I found no records matching your request."}

        # Step 3: Humanize Results
        humanize_prompt = f"User asked (might be in any language): {request.message}\nDatabase results: {json.dumps(results, default=str)}\n\nProvide a professional and helpful answer based on these results. IMPORTANT: Respond in the SAME LANGUAGE that the user used for their question (e.g., if they asked in Telugu, answer in Telugu). Mention specific details from the data."
        human_response = model.generate_content(humanize_prompt)
        
        return {"response": human_response.text}
        
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}", exc_info=True)
        return {"response": "I'm sorry, I'm having trouble accessing the data right now. Please try again later."}

@api_router.post("/contact/maintenance")
async def maintenance_contact(req: MaintenanceContact):
    """Send user's email to Magnova team via Gmail SMTP when they submit from maintenance page"""
    gmail_pass = os.environ.get('GMAILPASS', '')
    # Gmail address used to authenticate SMTP - must match Google account
    sender_gmail = os.environ.get('GMAIL_SENDER', 'ramakrishna.mtr@magnova.in')
    recipient_email = "ramakrishna.mtr@magnova.in"
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Magnova ERP - Maintenance Page: User Wants Notification"
        msg['From'] = sender_gmail
        msg['To'] = recipient_email
        msg['Reply-To'] = req.email
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px;">🔧 Maintenance Page - User Contact</h2>
                <p style="color: #444;">A user has submitted their email from the <b style="color: #e53e3e;">Under Maintenance</b> page requesting to be notified when the feature is back.</p>
                <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
                    <tr>
                        <td style="padding: 10px 14px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold; width: 140px;">User Email</td>
                        <td style="padding: 10px 14px; border: 1px solid #e2e8f0; color: #2b6cb0;">{req.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 14px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Submitted At</td>
                        <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{datetime.now(timezone.utc).strftime('%d %b %Y, %I:%M %p UTC')}</td>
                    </tr>
                </table>
                <p style="color: #888; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">This is an automated message from the Magnova ERP System. You can reply to this email to contact the user directly.</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_gmail, gmail_pass)
            server.sendmail(sender_gmail, recipient_email, msg.as_string())
        
        return {"message": "Thank you! We'll notify you when we're back."}
    except Exception as e:
        logging.error(f"Maintenance contact email error: {e}")
        # Return success to user even if email fails - don't expose internal errors
        return {"message": "Thank you! We'll notify you when we're back."}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
