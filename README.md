# Laxmi Alankar Billing System

A comprehensive jewellery shop management system for Laxmi Alankar, built with Next.js 16, React 19, and MongoDB. Handles complete billing, invoicing, GST calculation, and payment tracking.

## 🌟 Key Features

✅ **Customer Management** - Add, search, and track customer history  
✅ **Product Catalog** - Manage jewellery items with automatic pricing  
✅ **Smart Invoicing** - Auto calculations for metal price, making charges, GST  
✅ **Payment Tracking** - Multiple payment modes, split payments, status updates  
✅ **GST Automation** - State-aware GST calculation (CGST/SGST or IGST)  
✅ **Professional UI** - Black & white theme with gold accents  
✅ **Responsive Design** - Works on desktop, tablet, mobile  
✅ **JWT Authentication** - Secure user login with role-based access  
✅ **Dashboard** - Sales overview, pending payments, recent invoices  

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Configure environment
# Create/edit .env.local with MongoDB URI and settings
# See SETUP_GUIDE.md for details

# Start development server
npm run dev

# Initialize system (create admin user)
# POST http://localhost:3000/api/auth/init

# Open http://localhost:3000 in browser
```

**Default Login:**
```
Email: admin@laxmialankar.com
Password: admin123
```

⚠️ **Change password immediately after first login!**

## 📚 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup, configuration, and API documentation
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Complete technical implementation details
- **[AGENTS.md](AGENTS.md)** - Custom AI agent configuration
- **[CLAUDE.md](CLAUDE.md)** - Claude AI instructions

## 💻 Tech Stack

- **Frontend:** Next.js 16.2.2, React 19.2.4, CSS Modules
- **Backend:** Next.js API Routes, Node.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Styling:** CSS with Tailwind CSS v4
- **Additional:** jsPDF, html2canvas, bcryptjs, axios

## 📊 Core Modules

### 1. **Authentication**
- Login with JWT tokens
- Role-based access control
- Password hashing with bcryptjs
- Session management

### 2. **Customer Module**
- Create/edit/delete customers
- Search by mobile, name, or email
- Track purchase history
- Balance tracking

### 3. **Product Module**
- Manage jewellery inventory
- Auto price calculation
- Gold rate management
- Category organization

### 4. **Invoicing System** ⭐ Core Feature
- Auto invoice number generation (INV/YYYY/NNNN)
- Item-level details with weight and purity
- Automatic calculations:
  - Metal Price = Weight × Gold Rate
  - Making Charges (Fixed/Percentage/Per-gram)
  - Stone Price addition
  - GST calculation (state-aware)
  - Discount handling
  - Final amount computation

### 5. **Payment Processing**
- Multiple payment modes (Cash, UPI, Card, NetBanking, Cheque)
- Split/partial payment support
- Payment status tracking
- Reference number tracking

### 6. **Dashboard**
- Sales overview
- Payment status summary
- Recent invoices
- Quick metrics

## 🧮 Calculation Examples

### Invoice Amount Calculation

**Example: Gold Ring Invoice**

```
Item: 22K Gold Ring
- Weight: 5 grams
- Gold Rate: ₹6,800/gram
- Making Charges: Fixed ₹500
- Stone (Diamond): ₹2,000

Metal Price = 5 × 6800 = ₹34,000
Making Charges = ₹500
Stone Price = ₹2,000
Subtotal = ₹34,000 + ₹500 + ₹2,000 = ₹36,500

Customer State: Maharashtra (Same as shop)
GST Calculation:
- CGST (1.5%) = ₹36,500 × 1.5% = ₹547.50
- SGST (1.5%) = ₹36,500 × 1.5% = ₹547.50
Total GST = ₹1,095

Discount: ₹500 (Fixed)
Final Amount = ₹36,500 + ₹1,095 - ₹500 = ₹37,095

Invoice Number: INV/2026/0001
Payment Status: Pending
Amount Paid: ₹0
Amount Pending: ₹37,095
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              API routes
│   │   ├── auth/         Authentication
│   │   ├── customers/    Customer CRUD
│   │   ├── products/     Product management
│   │   ├── invoices/     Invoice operations
│   │   └── payments/     Payment tracking
│   ├── login/            Login page
│   ├── dashboard/        Dashboard page
│   ├── globals.css       Global styles
│   ├── layout.js         Root layout
│   └── page.js           Home page
├── components/
│   ├── Auth/             Auth components
│   ├── Billing/          Billing components
│   ├── Customer/         Customer components
│   ├── Dashboard/        Dashboard component
│   ├── Invoice/          Invoice components
│   ├── Product/          Product components
│   ├── Reports/          Reports components
│   └── Common/           Shared components
├── models/               Database models
│   ├── Admin.js
│   ├── Customer.js
│   ├── Product.js
│   ├── Invoice.js
│   ├── Payment.js
│   ├── Settings.js
│   └── AuditLog.js
└── lib/
    ├── mongoose.js       DB connection
    └── calculations.js   Billing logic
```

## 🔐 Security Features

- ✅ JWT authentication with 7-day expiry
- ✅ Password hashing with bcryptjs (10 salt rounds)
- ✅ Role-based access control
- ✅ Input validation and sanitization
- ✅ Error handling without exposing sensitive info
- ✅ MongoDB injection prevention through Mongoose
- ✅ HTTPS recommended for production

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/init` - System initialization

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product
- `GET /api/products/gold-rate` - Get current rates
- `PUT /api/products/gold-rate` - Update rates

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/[id]` - Get invoice
- `PUT /api/invoices/[id]` - Update invoice
- `DELETE /api/invoices/[id]` - Cancel invoice

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment

**See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete API documentation with examples.**

## 🎨 Design

- **Theme:** Professional black & white with gold accents
- **Colors:**
  - Primary: Black (#1a1a1a)
  - Background: White (#ffffff)
  - Accent: Gold (#d4af37)
  - Success: Green (#10b981)
  - Warning: Amber (#f59e0b)
  - Error: Red (#ef4444)
- **Typography:** Segoe UI, modern sans-serif
- **Responsive:** Mobile-first design

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

### Traditional Server
1. Build: `npm run build`
2. Start: `npm start`
3. Set environment variables
4. Use PM2 or similar for process management

### Database
- MongoDB Atlas (recommended for cloud)
- Local MongoDB for development

## 📋 Features Roadmap

### ✅ Implemented
- Customer CRUD and search
- Product management with auto-pricing
- Invoice creation with complex calculations
- GST calculation (state-aware)
- Payment tracking and status updates
- Dashboard with metrics
- Authentication and authorization
- Professional black & white UI theme

### 🔄 In Progress
- Customer and product management UI components
- Invoice creation form interface
- Payment entry interface

### 📅 Planned
- PDF invoice generation and download
- Print-ready invoice layout
- SMS/Email notifications
- WhatsApp integration
- Estimate to invoice conversion
- Return & exchange handling
- Advanced reporting and analytics
- Audit logs and history tracking

## 💡 Tips

1. **Gold Rate Updates:** Use `/api/products/gold-rate` endpoint to update daily gold rates
2. **Invoice Locking:** Finalized invoices cannot be edited for data integrity
3. **Customer State:** Set customer state correctly for accurate GST calculation
4. **Payment Reference:** Use for tracking payments with payment gateways
5. **Dashboard:** Refresh dashboard to see latest sales data

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify connection string in `.env.local`
- Check if MongoDB service is running
- Ensure IP whitelist in MongoDB Atlas

### Authentication Issues
- Clear browser cookies and localStorage
- Verify JWT_SECRET is set
- Check admin credentials in database

### Calculation Issues
- Verify gold rate is set in settings
- Check customer state is configured
- Ensure product purity and weight are correct

## 📞 Support

1. Check detailed documentation in SETUP_GUIDE.md
2. Review IMPLEMENTATION_SUMMARY.md for technical details
3. Check error logs in browser console
4. Verify all environment variables are set

## 📄 License

Private project for jewellery shop management

## 👨‍💻 Built With Next.js

This project is built with [Next.js](https://nextjs.org) - The React Framework for Production.

---

**Last Updated:** April 6, 2026  
**Version:** 1.0.0  
**Status:** Ready for Development & Testing
