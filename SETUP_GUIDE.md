# Jewellery Billing System - Setup & Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- MongoDB Database (Atlas or Local)
- npm or yarn

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Create/update `.env.local` file with:
   ```
   # MongoDB
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jewellery-billing?retryWrites=true&w=majority
   
   # Auth
   JWT_SECRET=your-super-secret-key-change-in-production
   ADMIN_EMAIL=admin@jewellery.com
   ADMIN_PASSWORD=admin123
   ```

3. **Initialize the System**
   
   Make a POST request to initialize default admin:
   ```bash
   curl -X POST http://localhost:3000/api/auth/init
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   - URL: http://localhost:3000
   - Redirects to login page
   - Default credentials: admin@jewellery.com / admin123

---

## 📊 System Architecture

### Frontend (Next.js 16 + React 19)
- **Pages**: Login, Dashboard, Customers, Products, Invoices, Payments, Reports
- **Components**: Reusable UI components with CSS modules
- **Theme**: Professional black & white design with gold accents

### Backend (API Routes)
- **Authentication**: JWT-based login
- **Customers API**: CRUD operations with search
- **Products API**: Item management with auto pricing
- **Invoices API**: Complex billing logic with calculations
- **Payments API**: Payment tracking and status updates

### Database (MongoDB)
- **Models**: Customer, Product, Invoice, Payment, Admin, Settings, AuditLog
- **Relationships**: Customers → Invoices → Payments

---

## 🔧 API Documentation

### Authentication

#### Login
```
POST /api/auth/login
{
  "email": "admin@jewellery.com",
  "password": "admin123"
}

Response:
{
  "token": "jwt_token",
  "user": { "id", "name", "email", "role" }
}
```

#### Initialize System
```
POST /api/auth/init
Initializes default admin and settings
```

### Customers

#### List Customers
```
GET /api/customers?page=1&limit=10&search=query&mobile=9999999999
```

#### Create Customer
```
POST /api/customers
{
  "name": "John Doe",
  "mobileNumber": "9999999999",
  "email": "john@example.com",
  "address": {
    "street": "Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

#### Get Customer
```
GET /api/customers/[id]
```

#### Update Customer
```
PUT /api/customers/[id]
{ "name": "Jane Doe", ... }
```

#### Delete Customer
```
DELETE /api/customers/[id]
(Only if no invoices)
```

### Products

#### List Products
```
GET /api/products?page=1&limit=10&category=Ring&search=query
Categories: Ring, Necklace, Bracelet, Earring, Anklet, Pendant, Chain, Other
```

#### Create Product
```
POST /api/products
{
  "name": "Gold Ring",
  "sku": "RING-001",
  "category": "Ring",
  "purity": "22K",
  "weight": 5,
  "metalType": "Gold",
  "goldRate": 6800,
  "makingCharges": 500,
  "makingChargeType": "Fixed",
  "stoneDetails": {
    "hasStone": true,
    "stoneType": "Diamond",
    "stoneWeight": 2,
    "stonePrice": 1000
  }
}
```

#### Update Product
```
PUT /api/products/[id]
```

#### Delete Product
```
DELETE /api/products/[id]
(Soft delete - sets isActive to false)
```

### Gold Rates

#### Get Current Rates
```
GET /api/products/gold-rate

Response:
{
  "goldRate": 6800,
  "silverRate": 75,
  "platinumRate": 4500,
  "lastUpdated": "2026-04-06T15:30:00Z"
}
```

#### Update Rates
```
PUT /api/products/gold-rate
{
  "goldRate": 7000,
  "silverRate": 80,
  "platinumRate": 4800
}
```

### Invoices

#### List Invoices
```
GET /api/invoices?page=1&limit=10&customerId=xxx&status=Draft
```

#### Create Invoice
```
POST /api/invoices
{
  "customerId": "xxx",
  "items": [
    {
      "productId": "xxx",
      "weight": 5,
      "quantity": 1,
      "makingCharges": 500,
      "stonePrice": 1000
    }
  ],
  "discount": 0,
  "discountType": "Fixed",
  "invoiceType": "Invoice",
  "notes": "Optional notes"
}

Auto-Calculated Fields:
- invoiceNumber: INV/2026/0001
- subtotal: weight × goldRate + making + stone
- GST: Based on customer state
- totalAmount: subtotal + GST - discount
- paymentStatus: "Pending"
```

#### Get Invoice
```
GET /api/invoices/[id]
```

#### Update Invoice
```
PUT /api/invoices/[id]
{
  "notes": "Updated notes",
  "discount": 500,
  "status": "Draft"
}
(Cannot edit finalized invoices)
```

#### Cancel Invoice
```
DELETE /api/invoices/[id]
(Sets status to Cancelled)
```

### Payments

#### List Payments
```
GET /api/payments?page=1&limit=10&invoiceId=xxx&customerId=xxx
```

#### Record Payment
```
POST /api/payments
{
  "invoiceId": "xxx",
  "amount": 5000,
  "paymentMode": "Cash | UPI | Card | NetBanking | Cheque",
  "referenceNumber": "UTR123456",
  "notes": "Optional"
}

Auto-Updated:
- invoice.amountPaid
- invoice.amountPending
- invoice.paymentStatus (Paid/PartialPaid/Pending)
- customer balance totals
```

---

## 💰 Billing Calculation Logic

### 1. Metal Price Calculation
```
Metal Price = Weight (gm) × Current Gold Rate (₹/gm)
```

### 2. Making Charges
**Three options:**
- **Fixed**: Flat ₹500 per item
- **Percentage**: 10% of metal price
- **Per Gram**: ₹100 × weight

### 3. Item Subtotal
```
Item Subtotal = Metal Price + Making Charges + Stone Price
```

### 4. Invoice Subtotal
```
Subtotal = Sum of all item subtotals
```

### 5. Discount
```
If Percentage: Discount Amount = Subtotal × Discount%
If Fixed: Discount Amount = Fixed Value
Discounted Subtotal = Subtotal - Discount Amount
```

### 6. GST Calculation
**Same State (Customer & Shop):**
```
CGST = Discounted Subtotal × 1.5%
SGST = Discounted Subtotal × 1.5%
Total GST = CGST + SGST = 3% of Discounted Subtotal
```

**Different State:**
```
IGST = Discounted Subtotal × 3%
Total GST = IGST
```

### 7. Final Amount
```
Final Amount = Discounted Subtotal + Total GST
```

---

## 📂 Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── invoices/
│   │   └── payments/
│   ├── login/
│   ├── dashboard/
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── Auth/
│   ├── Billing/
│   ├── Customer/
│   ├── Dashboard/
│   ├── Invoice/
│   ├── Product/
│   ├── Reports/
│   └── Common/
│       ├── Header.js
│       └── Header.module.css
├── models/
│   ├── Admin.js
│   ├── Customer.js
│   ├── Invoice.js
│   ├── Payment.js
│   ├── Product.js
│   ├── Settings.js
│   └── AuditLog.js
└── lib/
    ├── mongoose.js (DB connection)
    └── calculations.js (Billing logic)
```

---

## 🎨 Theme Customization

All colors defined in `src/app/globals.css`:
```css
--bg-primary: #ffffff;        /* Main background */
--text-primary: #1a1a1a;      /* Main text */
--accent-gold: #d4af37;       /* Jewellery theme */
--success: #10b981;           /* Paid/Success */
--warning: #f59e0b;           /* Pending/Warning */
--error: #ef4444;             /* Pending/Error */
```

---

## 🔐 Security Notes

1. **Change default admin password** immediately after setup
2. **Use strong JWT_SECRET** in production
3. **Validate all inputs** on backend
4. **Implement rate limiting** for login attempts
5. **Use HTTPS** in production
6. **Keep MongoDB credentials** secure

---

## 📱 Invoice Number Format

Format: `INV/YYYY/NNNN`
- `INV` - Prefix
- `YYYY` - Current year (2026)
- `NNNN` - Auto-incrementing number (0001-9999)

Example: `INV/2026/0001`, `INV/2026/0002`

---

## 🚀 Deployment

### MongoDB Atlas
1. Create account at mongodb.com/cloud
2. Create cluster
3. Get connection string
4. Add to `.env.local`

### Vercel (Recommended for Next.js)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

---

## 📞 Support

For issues or questions:
1. Check error logs
2. Verify MongoDB connection
3. Ensure all env variables are set
4. Check browser console for frontend errors

---

## ✨ Features Implemented

✅ Customer Management
✅ Product Catalog with Auto-Pricing
✅ Invoice Creation with Complex Calculations
✅ Automatic GST Calculation (state-aware)
✅ Multiple Payment Methods & Split Payments
✅ Payment Status Tracking
✅ Invoice Number Generation
✅ Authentication & Authorization
✅ Responsive Design
✅ Professional Black & White Theme
✅ Search & Filtering
✅ Pagination

---

**Last Updated:** April 6, 2026
