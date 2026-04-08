# SMS Verification for Customer Registration

**Date:** April 6, 2026  
**Status:** ✅ Complete and Ready

## Overview

SMS verification is now required before adding a customer to the system. This ensures:
- Valid mobile numbers are verified
- Two-factor authentication for customer creation
- Prevents fake/invalid phone number entries
- Secure customer registration process

---

## Implementation Details

### 1. SMS Verification Model
**File:** `/src/models/SMSVerification.js`

**Fields:**
- `mobileNumber`: Formatted phone number (+91XXXXXXXXXX)
- `code`: 6-digit OTP code
- `isVerified`: Boolean flag for verification status
- `attempts`: Count of verification attempts
- `maxAttempts`: Maximum allowed attempts (5 by default)
- `expiresAt`: Code expiration time (10 minutes)
- `verifiedAt`: Timestamp when verified
- `createdAt/updatedAt`: Timestamps

**Features:**
- Auto-delete expired codes via MongoDB TTL index
- Track verification attempts to prevent brute force
- 10-minute expiration for security

---

### 2. SMS Verification API Endpoints
**File:** `/src/app/api/customers/verify-sms/route.js`

#### Step 1: Send Verification Code
**Endpoint:** `POST /api/customers/verify-sms`

**Request:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response (Success):**
```json
{
  "message": "Verification code sent successfully",
  "verificationId": "507f1f77bcf86cd799439011",
  "mobileNumber": "+919876543210",
  "expiresIn": 600
}
```

**Response (Error):**
```json
{
  "message": "Valid mobile number is required",
  "status": 400
}
```

**Features:**
- Accepts 10-digit mobile number (auto-formats to +91XXXXXXXXXX)
- Generates 6-digit OTP
- Deletes previous attempts for same number
- Sends SMS via Pingram API
- Returns 10-minute expiration time

---

#### Step 2: Verify the Code
**Endpoint:** `PATCH /api/customers/verify-sms`

**Request:**
```json
{
  "mobileNumber": "9876543210",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "message": "Mobile number verified successfully",
  "mobileNumber": "+919876543210",
  "verified": true
}
```

**Response (Incorrect Code):**
```json
{
  "message": "Incorrect verification code. 4 attempts remaining.",
  "remainingAttempts": 4
}
```

**Response (Expired):**
```json
{
  "message": "Verification code has expired. Please request a new code."
}
```

**Features:**
- Validates OTP code
- Tracks attempts (max 5)
- Prevents brute force after 5 attempts
- Auto-deletes after expiration or max attempts
- Marks as verified on successful code entry

---

#### Step 3: Check Verification Status
**Endpoint:** `GET /api/customers/verify-sms?mobileNumber=9876543210`

**Response:**
```json
{
  "verified": true,
  "expiresAt": "2026-04-06T12:35:00.000Z",
  "attempts": 1,
  "remainingAttempts": 4
}
```

**Features:**
- Check if a number is currently verified
- See remaining attempts
- Check expiration time

---

### 3. Updated Customer Creation
**File:** `/src/app/api/customers/route.js`

#### Changes:
1. **Import SMSVerification model**
2. **Check verification before creating customer**
3. **Auto-delete verification record after creation**
4. **Format mobile number to +91XXXXXXXXXX**

**POST /api/customers - Updated Requirements:**

**Before:** Could create customer with just name + mobile

**After:** Mobile number MUST be verified first

**Request:**
```json
{
  "name": "John Doe",
  "mobileNumber": "9876543210",
  "email": "john@example.com",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

**Response (Success - if verified):**
```json
{
  "message": "Customer created successfully",
  "customer": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "mobileNumber": "+919876543210",
    "email": "john@example.com",
    "address": { ... },
    "createdAt": "2026-04-06T12:30:00.000Z"
  }
}
```

**Response (Error - not verified):**
```json
{
  "message": "Mobile number must be verified first. Please complete SMS verification.",
  "requiresVerification": true,
  "mobileNumber": "+919876543210"
}
```

---

## Frontend Integration Guide

### Step-by-Step Implementation

#### Step 1: Get Mobile Number from User
```javascript
const [mobileNumber, setMobileNumber] = useState('');

<input 
  type="tel"
  placeholder="Enter mobile number"
  value={mobileNumber}
  onChange={(e) => setMobileNumber(e.target.value)}
/>
```

#### Step 2: Send Verification Code
```javascript
const sendVerificationCode = async () => {
  try {
    const response = await fetch('/api/customers/verify-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      setVerificationSent(true);
      setExpiresIn(data.expiresIn);
      setVerificationId(data.verificationId);
      // Start countdown timer
    } else {
      setError(data.message);
    }
  } catch (err) {
    setError('Failed to send verification code');
  }
};
```

#### Step 3: Get Code from User
```javascript
const [code, setCode] = useState('');

<input
  type="text"
  maxLength="6"
  placeholder="Enter 6-digit code"
  value={code}
  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
/>
```

#### Step 4: Verify the Code
```javascript
const verifyCode = async () => {
  try {
    const response = await fetch('/api/customers/verify-sms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, code })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      setCodeVerified(true);
      setError('');
      // Show customer form - mobile is now verified
    } else {
      setError(data.message);
    }
  } catch (err) {
    setError('Failed to verify code');
  }
};
```

#### Step 5: Create Customer (after verification)
```javascript
const createCustomer = async (formData) => {
  try {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        mobileNumber  // This must be verified
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Customer created successfully
      console.log('Customer created:', data.customer);
    } else {
      setError(data.message);
    }
  } catch (err) {
    setError('Failed to create customer');
  }
};
```

---

## Complete Example Component

```javascript
import React, { useState } from 'react';

export default function CustomerRegistration() {
  const [step, setStep] = useState('phone'); // phone -> verify -> details
  const [mobileNumber, setMobileNumber] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);

  // Step 1: Send verification code
  const sendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/customers/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber })
      });
      const data = await response.json();
      if (response.ok) {
        setStep('verify');
        setExpiresIn(data.expiresIn);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const verifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/customers/verify-sms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, code })
      });
      const data = await response.json();
      if (response.ok) {
        setStep('details');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create customer
  const createCustomer = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobileNumber, email })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Customer created successfully!');
        // Reset form
        setStep('phone');
        setMobileNumber('');
        setCode('');
        setName('');
        setEmail('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd' }}>
      <h2>Customer Registration</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {step === 'phone' && (
        <div>
          <h3>Step 1: Enter Mobile Number</h3>
          <input
            type="tel"
            placeholder="9876543210"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button
            onClick={sendCode}
            disabled={loading || mobileNumber.length < 10}
            style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div>
          <h3>Step 2: Verify Code</h3>
          <p>Code sent to {mobileNumber} (Expires in {expiresIn}s)</p>
          <input
            type="text"
            maxLength="6"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', fontSize: '24px' }}
          />
          <button
            onClick={verifyCode}
            disabled={loading || code.length !== 6}
            style={{ width: '100%', padding: '10px', marginBottom: '5px', cursor: 'pointer' }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            onClick={() => setStep('phone')}
            style={{ width: '100%', padding: '10px', background: '#e0e0e0', cursor: 'pointer' }}
          >
            Back
          </button>
        </div>
      )}

      {step === 'details' && (
        <div>
          <h3>Step 3: Customer Details</h3>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button
            onClick={createCustomer}
            disabled={loading || !name}
            style={{ width: '100%', padding: '10px', background: '#4CAF50', color: 'white', cursor: 'pointer' }}
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## API Testing with cURL

### 1. Send Verification Code
```bash
curl -X POST http://localhost:3000/api/customers/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210"}'
```

### 2. Verify Code (Correct)
```bash
curl -X PATCH http://localhost:3000/api/customers/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210","code":"123456"}'
```

### 3. Create Customer (After Verification)
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Doe",
    "mobileNumber":"9876543210",
    "email":"john@example.com"
  }'
```

### 4. Check Verification Status
```bash
curl http://localhost:3000/api/customers/verify-sms?mobileNumber=9876543210
```

---

## Security Features

| Feature | Implementation |
|---------|---|
| OTP Expiration | 10 minutes |
| Attempt Limiting | Max 5 attempts |
| Auto-Delete | Expired codes deleted automatically |
| Phone Formatting | Standardized +91XXXXXXXXXX format |
| Brute Force Protection | Blocks after 5 failed attempts |
| SMS Delivery Status | Tracked and logged |
| Verification Cleanup | Auto-delete after customer creation |

---

## Files Modified/Created

**Created:**
- `/src/models/SMSVerification.js` - OTP storage model
- `/src/app/api/customers/verify-sms/route.js` - Verification endpoints

**Modified:**
- `/src/app/api/customers/route.js` - Added verification check

---

## Workflow Diagram

```
User → Send Phone Number
         ↓
    Pingram API
    (Send SMS)
         ↓
    User Receives Code
         ↓
    User Enters Code
         ↓
    Verify Code
         ↓
    Check ✓ Success
         ↓
    Show Customer Form
         ↓
    Enter Name, Email
         ↓
    Create Customer
         ↓
    Delete Verification Record
         ↓
    Customer Created ✓
```

---

## Error Handling

| Error | Status | Solution |
|-------|--------|----------|
| Invalid phone format | 400 | Ensure 10-digit number |
| Code expired | 400 | Request new code (expires in 10 min) |
| Too many attempts | 400 | Wait for new code or resend |
| SMS sending failed | 200 | Code created but SMS pending |
| Unverified phone | 400 | Complete verification first |
| Phone already registered | 400 | Use different phone number |

---

**Status:** ✅ Production Ready  
**Testing:** ✅ Complete  
**Documentation:** ✅ Complete
