# Invoice Notifications System

## Overview

When a billing invoice is created, the system automatically sends multiple notifications to the customer:

1. **SMS** - With direct link to view their purchases
2. **Call** - IVR notification informing about invoice creation
3. **Email** - Detailed invoice information
4. **WhatsApp** - Rich message format with invoice details

Each customer has a **unique invoice link** where they can view all their purchases and detailed invoice information.

---

## Architecture

### Notification Flow

```
Invoice Created
    ↓
[Generate Unique Link]
    ├─ SMS Link: /customer-invoice/{invoiceId}
    ├─ Call Message: Invoice details with link
    ├─ Email HTML: Invoice attachment
    └─ WhatsApp: Rich formatted message
    ↓
Send to Pingram API
    ├─ SMS: /send endpoint
    ├─ Call: /send endpoint with call type
    └─ Queue background
    
Async Notification Sending
    ├─ ✓ Success: Log message ID
    └─ ✗ Failure: Log error (doesn't block invoice creation)
```

---

## API Endpoints

### 1. Create Invoice (Updated)
**POST** `/api/invoices`

**Request:**
```json
{
  "customerId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "productId": "507f1f77bcf86cd799439012",
      "weight": 5.5,
      "quantity": 1,
      "makingCharges": 500
    }
  ],
  "discount": 0,
  "gstType": "CGST/SGST",
  "invoiceType": "Invoice"
}
```

**Response:**
```json
{
  "message": "Invoice created successfully",
  "invoice": {
    "_id": "507f1f77bcf86cd799439013",
    "invoiceNumber": "INV/2026/0001",
    "customerId": "507f1f77bcf86cd799439011",
    "totalAmount": 25000,
    "amountPaid": 0,
    "amountPending": 25000,
    "status": "Finalized"
  },
  "notification": "Notification sent to customer"
}
```

**Notifications Sent:**
- ✅ SMS with invoice link
- ✅ Call with IVR message
- ✅ Email with details
- ✅ WhatsApp message

---

### 2. Get Customer Invoices
**GET** `/api/customer-invoices/[customerId]`

Returns all finalized invoices for a customer with summary.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `status` (optional) - Filter by status
- `type` (optional) - Filter by type (Invoice, Estimate, etc)

**Response:**
```json
{
  "customer": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "mobileNumber": "+919876543210",
    "email": "john@example.com"
  },
  "invoices": [
    {
      "id": "507f1f77bcf86cd799439013",
      "invoiceNumber": "INV/2026/0001",
      "type": "Invoice",
      "totalAmount": 25000,
      "amountPaid": 5000,
      "amountPending": 20000,
      "status": "Finalized",
      "date": "2026-04-06T10:30:00.000Z",
      "itemCount": 2,
      "invoiceLink": "/customer-invoice/507f1f77bcf86cd799439013"
    }
  ],
  "summary": {
    "totalInvoices": 15,
    "totalAmount": 375000,
    "totalPaid": 125000,
    "totalPending": 250000
  },
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

---

### 3. View Invoice Details
**GET** `/api/invoice-details/[invoiceId]`

Returns detailed invoice information with itemized breakdown.

**Response:**
```json
{
  "invoice": {
    "id": "507f1f77bcf86cd799439013",
    "invoiceNumber": "INV/2026/0001",
    "invoiceType": "Invoice",
    "status": "Finalized",
    "paymentStatus": "Pending",
    "customer": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "mobileNumber": "+919876543210",
      "email": "john@example.com"
    },
    "items": [
      {
        "productName": "Gold Ring",
        "weight": 5.5,
        "purity": "22K",
        "quantity": 1,
        "metalPrice": 22000,
        "stonePrice": 0,
        "makingCharges": 500,
        "subtotal": 22500
      }
    ],
    "amounts": {
      "subtotal": 22500,
      "discount": 0,
      "discountedAmount": 22500,
      "cgst": 2025,
      "sgst": 2025,
      "totalGST": 4050,
      "totalAmount": 26550,
      "amountPaid": 0,
      "amountPending": 26550
    },
    "createdAt": "2026-04-06T10:30:00.000Z"
  }
}
```

---

## Customer Invoice Page

### Public Invoice View
**Route:** `/customer-invoice/[invoiceId]`

A beautiful, responsive page where customers can view their detailed invoice.

**Features:**
- ✅ Customer name and contact info
- ✅ Itemized product breakdown
- ✅ Amount calculation with taxes
- ✅ Payment status
- ✅ Print functionality
- ✅ Mobile responsive design
- ✅ Secure (only shows finalized invoices)

**Usage:**
```
URL: https://billing.jewellery.com/customer-invoice/507f1f77bcf86cd799439013
Customer clicks link from SMS/Call/Email
→ Loads invoice details page
→ Can print or view on mobile
```

---

## Notification Details

### SMS Notification

**Template:**
```
Invoice {invoiceNumber} created! Amount: ₹{totalAmount}. 
View your purchases: {linkUrl}
```

**Example:**
```
Invoice INV/2026/0001 created! Amount: ₹26,550. 
View your purchases: https://billing.jewellery.com/customer-invoice/507f1f77bcf86cd799439013
```

**Delivery:**
- Via Pingram SMS API
- Sent asynchronously (non-blocking)
- Includes clickable link to invoice page
- ~30 second delivery time

---

### Call Notification (IVR)

**Template:**
```
Hello {customerName}. Your invoice number {invoiceNumber} has been created 
with a total amount of rupees {totalAmount}. You can view all your purchases 
at {linkUrl}. Thank you for shopping with us.
```

**Example:**
```
Hello John. Your invoice number INV/2026/0001 has been created with a total 
amount of rupees twenty six thousand five hundred fifty. You can view all your 
purchases at our website. Thank you for shopping with us.
```

**Delivery:**
- Via Pingram Call API (IVR system)
- Sent asynchronously (non-blocking)
- Automatic voice reading
- Customer hears message automatically

---

### Email Notification

**Contents:**
- Invoice number and date
- Customer details
- Itemized breakdown
- Amount calculation breakdown
- Payment status
- HTML formatted for readability

---

### WhatsApp Notification

**Template:**
```
Hello {customerName},

Your invoice has been created successfully! 💎

📄 Invoice: {invoiceNumber}
💰 Total Amount: ₹{totalAmount}
💸 Amount Paid: ₹{amountPaid}
⏳ Amount Pending: ₹{amountPending}

Thank you for shopping with us!
For details, please contact us.
```

---

## File Structure

```
jewellery-billing-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── invoices/
│   │   │   │   └── route.js (UPDATED - Added call notification)
│   │   │   ├── customer-invoices/
│   │   │   │   └── [customerId]/
│   │   │   │       └── route.js (NEW)
│   │   │   └── invoice-details/
│   │   │       └── [invoiceId]/
│   │   │           └── route.js (NEW)
│   │   └── customer-invoice/
│   │       └── [invoiceId]/
│   │           ├── page.js (NEW - Customer view)
│   │           └── invoice.module.css (NEW - Styling)
│   └── lib/
│       ├── smsService.js (UPDATED - Added link to SMS)
│       └── whatsappService.js (UPDATED - Added call template)
│
└── INVOICE_NOTIFICATIONS.md (This file)
```

---

## Configuration

### Environment Variables Required

```env
# Pingram Configuration
PINGRAM_API_KEY=your_pingram_api_key
PINGRAM_BASE_URL=https://api.pingram.io

# Application URL (for invoice links)
NEXT_PUBLIC_APP_URL=https://billing.jewellery.com
```

### Update .env.local

```bash
# Add to .env.local
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Note:** The `NEXT_PUBLIC_APP_URL` is used to generate the invoice links sent in SMS and Call notifications.

---

## Testing

### Test Invoice Creation with All Notifications

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "YOUR_CUSTOMER_ID",
    "items": [
      {
        "productId": "YOUR_PRODUCT_ID",
        "weight": 5.5,
        "quantity": 1,
        "makingCharges": 500
      }
    ],
    "discount": 0,
    "gstType": "CGST/SGST"
  }'
```

### Test Getting Customer Invoices

```bash
curl http://localhost:3000/api/customer-invoices/YOUR_CUSTOMER_ID?page=1&limit=10
```

### Test Getting Invoice Details

```bash
curl http://localhost:3000/api/invoice-details/YOUR_INVOICE_ID
```

### View Invoice in Browser

Open in browser:
```
http://localhost:3000/customer-invoice/YOUR_INVOICE_ID
```

---

## SMS Message Formatting

The SMS message includes a shortened URL to the customer invoice page. Example:

```
Sent SMS:
"Invoice INV/2026/0001 created! Amount: ₹26,550. 
View your purchases: https://billing.jewellery.com/customer-invoice/507f1f77bcf86cd799439013"

Character Count: ~130 characters
SMS Count: 1 (< 160 chars)
```

---

## Security Considerations

### Invoice Access

- ✅ Only finalized invoices shown in public view
- ✅ Direct `/customer-invoice/[id]` access allowed (public link)
- ✅ API endpoints validate invoice exists before returning
- ✅ No authentication required (invoice ID acts as token)
- ⚠️ Consider adding HMAC token for production security

### Notification Delivery

- ✅ SMS sent via encrypted Pingram API
- ✅ Call sent via authenticated Pingram API
- ✅ Notifications sent asynchronously (non-blocking)
- ✅ Notification failures don't impact invoice creation
- ✅ Error logs for debugging notification issues

### Recommendations for Production

1. **Add Invoice Token/HMAC:**
   ```javascript
   const token = crypto
     .createHmac('sha256', process.env.SECRET_KEY)
     .update(invoiceId)
     .digest('hex');
   // Include token in URL for additional security
   ```

2. **Add Rate Limiting:**
   - Limit API calls per customer
   - Prevent abuse of invoice API

3. **Add Audit Logging:**
   - Log when invoices are viewed
   - Track notification delivery
   - Monitor failed notifications

4. **Add Verification:**
   - Optional: SMS verification before showing sensitive data
   - Optional: Email verification link

---

## Troubleshooting

### SMS Not Sending

**Check:**
1. `PINGRAM_API_KEY` is set in `.env.local`
2. Phone number is in valid format (+91XXXXXXXXXX)
3. Pingram API account has SMS quota
4. Check server logs for error messages

**Debug:**
```bash
# Check notification logs
tail -f logs/notifications.log

# Test Pingram API directly
curl -X POST https://api.pingram.io/send \
  -H "Authorization: Bearer YOUR_KEY" \
  -d "..."
```

### Call Not Received

**Check:**
1. `PINGRAM_API_KEY` configured
2. Phone number is valid and reachable
3. Pingram Call API has balance
4. Check account for call delivery status

### Invoice Link Not Working

**Check:**
1. `NEXT_PUBLIC_APP_URL` is set correctly
2. Invoice ID is valid
3. Invoice status is "Finalized"
4. Check browser console for errors

---

## Future Enhancements

1. **SMS Templates**
   - Allow customization of SMS message
   - Support multiple templates per business
   - A/B testing for message effectiveness

2. **Call Enhancements**
   - Menu options (press 1 to pay, press 2 for support)
   - Call recording and analytics
   - Multi-language support

3. **Scheduled Reminders**
   - Automatic reminders for pending payments
   - Customizable reminder schedules
   - Skip reminders on paid invoices

4. **Invoice Dashboard**
   - Customer portal showing all invoices
   - Payment tracking
   - Download invoices as PDF
   - Email invoice to other addresses

5. **Analytics**
   - Track notification delivery rates
   - Monitor click-through rates on SMS links
   - Call answer rates
   - Invoice view analytics

6. **Integration**
   - Webhook for payment confirmations
   - API for third-party integrations
   - Export invoice history

---

## Migration Notes

### From Previous System

**What Changed:**

1. **SMS Content:**
   - OLD: Amount summary
   - NEW: Includes invoice link for easy access

2. **Notifications:**
   - OLD: SMS + Email + WhatsApp (Call)
   - NEW: SMS + Email + WhatsApp + IVR Call with link

3. **Customer Access:**
   - OLD: No direct invoice link
   - NEW: Unique link in every notification

4. **API:**
   - NEW: `/api/customer-invoices/[customerId]` - List all invoices
   - NEW: `/api/invoice-details/[invoiceId]` - View details
   - NEW: `/customer-invoice/[invoiceId]` - Public invoice page

**Backward Compatibility:**
- ✅ Existing invoice creation unchanged
- ✅ All existing APIs still work
- ✅ New features are additive

---

## Quick Reference

| Feature | Endpoint | Method | Auth |
|---------|----------|--------|------|
| Create Invoice | `/api/invoices` | POST | Required |
| List Invoices | `/api/invoices` | GET | Required |
| Get Customer Invoices | `/api/customer-invoices/[id]` | GET | None |
| Get Invoice Details | `/api/invoice-details/[id]` | GET | None |
| View Invoice Page | `/customer-invoice/[id]` | GET | None |

---

**Implementation Complete!** ✅

The invoice notification system is now fully integrated. Every invoice created will:
1. Generate a unique link
2. Send SMS with link
3. Send Call notification
4. Send Email
5. Send WhatsApp notification

Customers receive instant notifications and can access their invoices through the unique link!
