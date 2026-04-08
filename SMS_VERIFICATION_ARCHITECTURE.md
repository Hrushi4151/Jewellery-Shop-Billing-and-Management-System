# SMS Verification Architecture

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Phone Input  │→ │  Code Input  │→ │  Register Form  │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Next.js)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   POST /api/customers/verify-sms                    │   │
│  │   ├─ Generate 6-digit OTP                           │   │
│  │   ├─ Create SMSVerification record                  │   │
│  │   └─ Send SMS via Pingram API                       │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │   PATCH /api/customers/verify-sms                   │   │
│  │   ├─ Verify code against stored code                │   │
│  │   ├─ Track attempts (max 5)                         │   │
│  │   ├─ Check expiration (10 minutes)                  │   │
│  │   └─ Mark as verified                               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │   GET /api/customers/verify-sms?mobileNumber=...    │   │
│  │   ├─ Check verification status                      │   │
│  │   ├─ Get remaining attempts                         │   │
│  │   └─ Check expiration                               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │   POST /api/customers (UPDATED)                     │   │
│  │   ├─ Check SMSVerification.isVerified = true        │   │
│  │   ├─ Create Customer if verified                    │   │
│  │   ├─ Delete SMSVerification record                  │   │
│  │   └─ Return error if not verified                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            ↓                          ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│   MongoDB Collections    │  │   External Services     │
│  ┌────────────────────┐  │  │  ┌──────────────────┐   │
│  │ SMSVerification    │  │  │  │  Pingram API     │   │
│  │ ├─ mobileNumber    │  │  │  │  ├─ SMS Sending  │   │
│  │ ├─ code (OTP)      │  │  │  │  ├─ Call Send    │   │
│  │ ├─ isVerified      │  │  │  │  └─ Tracking     │   │
│  │ ├─ attempts        │  │  │  └──────────────────┘   │
│  │ ├─ maxAttempts     │  │  │                         │
│  │ ├─ expiresAt (TTL) │  │  └─ Customer's Phone      │
│  │ └─ verifiedAt      │  │                            │
│  ├────────────────────┤  │                            │
│  │ Customers          │  │                            │
│  │ ├─ name            │  │                            │
│  │ ├─ mobileNumber    │  │                            │
│  │ ├─ email           │  │                            │
│  │ └─ address         │  │                            │
│  └────────────────────┘  │                            │
└──────────────────────────┘  └──────────────────────────┘
```

---

## Data Flow

### 1. Send Verification Code

```
User Input (Phone)
    ↓
POST /api/customers/verify-sms
    ├─ Clean & Format: "9876543210" → "+919876543210"
    ├─ Delete Previous Attempts (cleanup)
    ├─ Generate OTP: "123456"
    ├─ Create SMSVerification Record
    │  ├─ mobileNumber: "+919876543210"
    │  ├─ code: "123456"
    │  ├─ isVerified: false
    │  ├─ attempts: 0
    │  ├─ expiresAt: now + 10 minutes
    │  └─ createdAt: now
    │
    ├─ Send SMS via Pingram API
    │  └─ Message: "Your code is: 123456. Expires in 10 minutes."
    │
    └─ Return: { verificationId, mobileNumber, expiresIn: 600 }

SMS Delivery
    ├─ Pingram → SMS Gateway → Telecom Provider
    └─ Customer Receives SMS (usually ≤ 30 seconds)
```

### 2. Verify Code

```
User Input (Code)
    ↓
PATCH /api/customers/verify-sms
    ├─ Clean & Format Mobile: "9876543210" → "+919876543210"
    ├─ Find SMSVerification record
    ├─ Check If Already Verified
    │  └─ If yes: Return "already verified"
    ├─ Check If Expired (current time > expiresAt)
    │  ├─ If yes: Delete record → Return "expired"
    │  └─ Continue if valid
    ├─ Check Max Attempts (5)
    │  ├─ If exceeded: Delete record → Return "too many attempts"
    │  └─ Continue if <5
    ├─ Compare Code
    │  ├─ If NO MATCH:
    │  │  ├─ Increment attempts
    │  │  ├─ Save record
    │  │  └─ Return "Wrong code. X attempts left"
    │  │
    │  └─ If MATCH:
    │     ├─ Set isVerified: true
    │     ├─ Set verifiedAt: now
    │     ├─ Save record
    │     └─ Return "Verified successfully"
    
Customer can now create account
```

### 3. Create Customer (After Verification)

```
User Input (Name, Email, Phone)
    ↓
POST /api/customers
    ├─ Clean & Format Mobile: "9876543210" → "+919876543210"
    ├─ Check SMSVerification.isVerified = true
    │  ├─ If false/not found:
    │  │  └─ Return "Must verify phone first"
    │  │
    │  └─ If true:
    │     ├─ Validate no duplicate customer
    │     ├─ Create Customer Document
    │     │  ├─ name, mobileNumber, email, address
    │     │  ├─ totalPurchase: 0
    │     │  ├─ totalPaid: 0
    │     │  ├─ totalPending: 0
    │     │  ├─ isActive: true
    │     │  ├─ createdAt: now
    │     │  └─ updatedAt: now
    │     │
    │     ├─ Save (MongoDB)
    │     ├─ Delete SMSVerification Record (cleanup)
    │     └─ Return "Customer created" + customer object

Customer Successfully Created ✓
```

---

## Database Schema

### SMSVerification Collection

```javascript
{
  _id: ObjectId,
  mobileNumber: "+919876543210",        // Formatted phone
  code: "123456",                       // 6-digit OTP
  isVerified: boolean,                  // Verification status
  attempts: 0,                          // Incorrect attempts count
  maxAttempts: 5,                       // Max allowed attempts
  expiresAt: DateTime,                  // TTL expiration
  verifiedAt: DateTime | null,          // When code was verified
  createdAt: DateTime,                  // Record creation time
  updatedAt: DateTime,                  // Last update time
  
  // MongoDB TTL Index: auto-delete when expiresAt is reached
}
```

### Customers Collection (Updated)

```javascript
{
  _id: ObjectId,
  name: "John Doe",
  mobileNumber: "+919876543210",        // Now formatted + verified
  email: "john@example.com",
  address: {
    street: "123 Main St",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    country: "India"
  },
  totalPurchase: 0,
  totalPaid: 0,
  totalPending: 0,
  isActive: true,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

---

## Security Features

```
┌─────────────────────────────────────────────┐
│       Security Implementation                │
├─────────────────────────────────────────────┤
│ ✓ OTP Expiration                 10 min     │
│ ✓ Attempt Limiting                5 tries   │
│ ✓ Auto-Delete Expired Code        TTL Index │
│ ✓ Phone Number Formatting         +91XXXXX  │
│ ✓ Brute Force Protection          Blocked   │
│ ✓ Cleanup After Success           Deleted   │
│ ✓ SMS Via Encrypted API           Pingram   │
│ ✓ Unique Phone Constraint         Database  │
│ ✓ Duplicate Prevention             Query    │
└─────────────────────────────────────────────┘
```

---

## Error Handling

```
Send Code Request
    ├─ Invalid format? → 400: "Valid mobile required"
    ├─ SMS Failed? → 200: "Code sent (pending)"
    └─ Success? → 200: "Code sent"

Verify Code Request
    ├─ Phone not found? → 404: "No verification found"
    ├─ Already verified? → 400: "Already verified"
    ├─ Expired? → 400: "Code expired"
    ├─ Too many attempts? → 400: "Max attempts exceeded"
    ├─ Wrong code? → 400: "Wrong code. X attempts left"
    └─ Correct? → 200: "Verified successfully"

Create Customer
    ├─ Not verified? → 400: "Must verify first"
    ├─ Duplicate phone? → 400: "Phone already exists"
    ├─ Missing name? → 400: "Name required"
    └─ Success? → 201: "Customer created"
```

---

## Timeline Example

```
14:00:00 → User opens registration
14:00:05 → User enters phone: "9876543210"
14:00:06 → Click "Send Code"
14:00:07 → POST /api/customers/verify-sms
           - Generate OTP: "729183"
           - Save to SMSVerification
           - Send to Pingram

14:00:10 → SMS Delivered to phone
           Message: "Your code is: 729183"

14:00:15 → User reads SMS
14:00:20 → User enters code: "729183"
14:00:21 → Click "Verify"
14:00:22 → PATCH /api/customers/verify-sms
           - Check code ✓
           - Mark isVerified: true

14:00:23 → Show customer form
14:00:30 → User fills name: "John Doe"
14:00:35 → Click "Create Customer"
14:00:36 → POST /api/customers
           - Check verified ✓
           - Create customer
           - Delete verification record

14:00:37 → ✓ Customer created!
14:10:05 → (If not used) TTL expires, record deleted
```

---

## Files Structure

```
jewellery-billing-system/
├── src/
│   ├── models/
│   │   ├── SMSVerification.js ← NEW
│   │   ├── Customer.js
│   │   └── Invoice.js
│   │
│   └── app/
│       └── api/
│           └── customers/
│               ├── route.js (UPDATED)
│               └── verify-sms/
│                   └── route.js ← NEW
│
├── SMS_VERIFICATION_GUIDE.md ← NEW
├── SMS_VERIFICATION_QUICK_REF.md ← NEW
└── PINGRAM_MIGRATION.md

```

---

**Architecture Complete!** ✅
