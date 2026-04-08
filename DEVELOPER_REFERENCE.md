# 💎 Jewellery Billing System - Quick Developer Reference

## 🚀 Start Development

```bash
# Navigate to project
cd "d:\CodePlayground\NextApps\Jewellery Billing System\jewellery-billing-system"

# Install dependencies (if not already done)
npm install

# Run development server
npm run dev

# Access at http://localhost:3000
```

## 🔐 Default Login (First Time Setup)

1. Visit http://localhost:3000/login
2. Click "Initialize System" button
3. This creates default admin user
4. Use email: `admin@billingsystem.com` and password from `.env.local`
5. Login to access dashboard

---

## 📁 Key File Locations

### API Routes
- Customers: `/src/app/api/customers/route.js`
- Products: `/src/app/api/products/route.js`
- Invoices: `/src/app/api/invoices/route.js`
- Payments: `/src/app/api/payments/route.js`
- Auth: `/src/app/api/auth/route.js`

### Components
- Dashboard: `/src/components/Dashboard/Dashboard.js`
- Customers: `/src/components/Customer/ManageCustomers.js`
- Products: `/src/components/Product/ManageProducts.js`
- Invoice Creation: `/src/components/Billing/CreateInvoice.js`
- Payment Entry: `/src/components/Billing/RecordPayment.js`
- Invoice View: `/src/components/Invoice/ViewInvoice.js`
- Reports: `/src/components/Reports/Reports.js`

### Database Models
- All models: `/src/models/` (7 models total)
- DB Connection: `/src/lib/mongoose.js`
- Calculations: `/src/lib/calculations.js`

### Styling
- Global: `/src/app/globals.css` (1000+ lines, all CSS variables)
- Module CSS: Each component has `.module.css` file

---

## 💡 Common Workflows

### Add New API Endpoint
1. Create route file in `/src/app/api/[resource]/route.js`
2. Export GET, POST, PUT, DELETE handlers
3. Use MongoDB models from `/src/models/`
4. Add validation and error handling
5. Test with Postman/Insomnia

### Add New Component
1. Create folder in `/src/components/[Category]/`
2. Create Component.js (React component with hooks)
3. Create Component.module.css (styling)
4. Create page.js in `/src/app/[route]/page.js`
5. Import Header component for navigation

### Update Database Schema
1. Edit model in `/src/models/[Model].js`
2. Add fields or validation rules
3. Restart development server (`npm run dev`)
4. No migration needed (MongoDB is flexible)

### Test Invoice Calculations
```javascript
// Access calculations library
import {
  calculateMetalPrice,
  calculateItemPrice,
  calculateGST,
  calculateDiscount,
  generateInvoiceNumber,
  formatCurrency
} from '@/lib/calculations';

// Example
const metalPrice = calculateMetalPrice(10, 6800); // 10gm @ ₹6800/gm
const itemPrice = calculateItemPrice(10, 6800, 500, 'Fixed', {hasStone: false});
```

---

## 📊 Data Relationships

```
Customer (1) -----> (Many) Invoices
Customer (1) -----> (Many) Payments
           |
           -----> (Many) Address entries

Product -----> Invoice Items (linked via invoices)

Invoice (1) -----> (Many) Payments
       -----> (Many) Items
       -----> Customer

Payment -----> Invoice
       -----> Customer

Settings (Global configuration)
AuditLog (Change tracking)
Admin (User management)
```

---

## 🔄 Invoice Creation Flow

1. **Select Customer**
   - Search and select from dropdown
   - Display customer address (for GST determination)

2. **Add Items**
   - Click products to add to invoice
   - Adjust quantity +/-
   - Real-time price calculation

3. **Apply Discount**
   - Choose: Fixed or Percentage
   - Enter discount value
   - See updated calculations

4. **Create Invoice**
   - API call to `/api/invoices` POST
   - Server auto-calculates:
     - Metal price for each item
     - Making charges
     - Subtotal
     - Tax (CGST+SGST or IGST based on state)
     - Final total
     - Invoice number
   - Invoice stored in database

---

## 💸 Payment Recording Flow

1. **Select Invoice**
   - Search by invoice number
   - Display outstanding balance

2. **Enter Payment**
   - Enter amount (max = pending amount)
   - Select payment mode
   - Add reference number

3. **Record Payment**
   - API call to `/api/payments` POST
   - Server automatically updates:
     - Invoice: amountPaid, amountPending, paymentStatus
     - Customer: totalPaid, totalPending
   - Payment status updates to Paying/PartialPaid/Paid

---

## 📈 Reports Generation

1. **Select Report Type**
   - Sales Report
   - Payment Status Report
   - Customer-wise Report

2. **Set Date Range**
   - Start date (default: 30 days ago)
   - End date (default: today)

3. **View Statistics**
   - Total sales
   - Total collected
   - Pending amount
   - Number of invoices
   - Collection percentage

4. **Export Data**
   - CSV format
   - Includes all invoice details
   - Compatible with Excel/Sheets

---

## 🎨 Styling Guide

### CSS Variables (in globals.css)
```css
--primary: #1a1a1a (black)
--secondary: #ffffff (white)
--gold: #d4af37 (jewellery theme)
--success: #2e7d32 (green)
--warning: #f57f17 (orange)
--error: #d32f2f (red)
--light: #f5f5f5 (light gray)
--dark: #333333 (dark gray)
```

### Class Names
- `.btn-primary` - Primary button (gold background)
- `.btn-secondary` - Secondary button (white background)
- `.card` - Card container
- `.badge` - Status badges (.badge-success, .badge-warning, .badge-error)
- `.container` - Max-width container
- `.grid` - Grid layout

### Responsive Breakpoints
- Desktop: 1920px and above
- Tablet: 1024px - 1919px
- Mobile: Below 768px

---

## 🔧 Environment Configuration

### .env.local Template
```env
# MongoDB
MongoDB_URI=mongodb+srv://user:password@cluster.mongodb.net/jewellery-billing

# Authentication
JWT_SECRET=generate_with_node_command: require('crypto').randomBytes(32).toString('hex')

# Admin Credentials (created on first init)
ADMIN_EMAIL=admin@billingsystem.com
ADMIN_PASSWORD=secure_password_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional - Future Features
SMS_API_KEY=your_sms_key
EMAIL_SERVICE=your_email_service
WHATSAPP_API_KEY=your_whatsapp_key
```

---

## 🧪 Testing API Endpoints

### Using cURL
```bash
# Get all customers
curl http://localhost:3000/api/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create invoice
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "672a1b2c3d4e5f6g7h8i9j0k",
    "items": [{
      "productId": "672a1b2c3d4e5f6g7h8i9j0l",
      "quantity": 1
    }],
    "discount": {"value": 0, "type": "Fixed"}
  }'

# Record payment
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "672a1b2c3d4e5f6g7h8i9j0m",
    "customerId": "672a1b2c3d4e5f6g7h8i9j0k",
    "amount": 5000,
    "paymentMode": "Cash"
  }'
```

---

## 📱 Mobile Responsiveness

All components are mobile-responsive:
- **Mobile (<768px):** Stack layouts, full-width inputs, simplified tables
- **Tablet (768-1024px):** 2-column layouts where applicable
- **Desktop (>1024px):** Full multi-column layouts

---

## 🚨 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "MongoDB connection failed" | No DB connection | Check MongoDB_URI, verify IP whitelist |
| "Invoice number already exists" | Duplicate invoice numbers | Clear invoiceNumberCounter in Settings |
| "Product not found" | Invalid product ID | Verify product exists before creating invoice |
| "Payment exceeds pending amount" | Invalid payment amount | Reduce payment to pending amount |
| "Invalid JWT token" | Expired or malformed token | Login again to get fresh token |
| "Cannot update locked invoice" | Trying to edit finalized invoice | Invoices lock after finalization |

---

## 📚 Database Queries (Mongoose)

### Common Queries
```javascript
// Find customer by ID
const customer = await Customer.findById(customerId);

// Find invoices by date range
const invoices = await Invoice.find({
  createdAt: { $gte: startDate, $lte: endDate }
});

// Get pending invoices
const pending = await Invoice.find({
  paymentStatus: { $in: ['Pending', 'PartialPaid'] }
});

// Update customer balance
await Customer.findByIdAndUpdate(customerId, {
  $inc: { totalPaid: amount, totalPending: -amount }
});
```

---

## 🎯 Next Steps to Enhance

1. **SMS/Email Notifications**
   - Notify customers on invoice creation
   - Payment confirmation SMS
   - Pending payment reminders

2. **Advanced Analytics**
   - Monthly sales trends
   - Customer spending patterns
   - Product popularity analysis

3. **Estimate to Invoice**
   - Convert estimates to invoices
   - Maintain estimate history

4. **Returns & Exchanges**
   - Create return invoices
   - Track exchange items

5. **Inventory Alerts**
   - Low stock notifications
   - Reorder points

6. **Multi-user Roles**
   - Admin, Manager, User roles
   - Permission-based access

---

## 💻 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Format code
npm run format (if configured)
```

---

## 🔗 External Resources

- Next.js Docs: https://nextjs.org/docs
- MongoDB Mongoose: https://mongoosejs.com
- React Documentation: https://react.dev
- JWT Auth: https://jwt.io
- jsPDF: https://github.com/parallax/jsPDF

---

## 📞 Support

For issues or questions:
1. Check FINAL_DOCUMENTATION.md for detailed docs
2. Review component code and inline comments
3. Check browser DevTools Console for errors
4. Verify MongoDB connection status

---

**Happy Coding! 💎**

Last Updated: 2024
