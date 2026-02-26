# Magnova ERP

Enterprise Resource Planning system for Purchase, Procurement, Finance, Logistics, and Inventory management.

## Tech Stack

- **Frontend:** React 19, TailwindCSS, shadcn/ui, Recharts
- **Backend:** FastAPI (Python), MongoDB Atlas, JWT Auth
- **Email:** Gmail SMTP
- **AI Chatbot:** Google Gemini

## Quick Start (Local Development)

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```
Runs at: `http://localhost:8000`

### Frontend
```bash
cd frontend
npm install
npm start
```
Runs at: `http://localhost:3000`

## Environment Variables

### Backend (`backend/.env`)
```
MONGO_URL=mongodb+srv://...
DB_NAME=magnova_db
JWT_SECRET_KEY=your-strong-random-secret
CORS_ORIGINS=http://localhost:3000
GEMINI_API_KEY=...
GMAIL_SENDER=your@email.com
GMAILPASS=your-app-password
```

### Frontend (`frontend/.env`)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## Roles

| Role | Access |
|---|---|
| Admin | Full access to all modules |
| Purchase | Purchase Orders + Procurement + Reports |
| InternalPayments | Internal Payments |
| ExternalPayments | External Payments |
| Logistics | Shipments |
| Inventory | Inventory Inward |
| Sales | Sales Orders + Invoices |
| Manager | Dashboard + Escalation alerts |

## Deployment

See `backend/.env.production` and `frontend/.env.production` for production configuration.

Recommended: **Railway** (backend) + **Vercel** (frontend) + **MongoDB Atlas** (database)
