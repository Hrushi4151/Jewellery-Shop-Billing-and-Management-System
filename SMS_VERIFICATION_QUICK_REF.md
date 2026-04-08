# SMS Verification - Quick Reference

## Overview
Before a customer can be added, their mobile number must be verified via SMS OTP.

## Flow

```
1. User enters phone number
        ↓
2. Send SMS with OTP code
        ↓
3. User receives code
        ↓
4. User enters code
        ↓
5. Verify code
        ↓
6. If verified: Can create customer
   If wrong: Show error & remaining attempts
```

---

## API Endpoints

### 1. Send SMS Code
```
POST /api/customers/verify-sms

Request:
{
  "mobileNumber": "9876543210"
}

Response (Success):
{
  "message": "Verification code sent successfully",
  "verificationId": "...",
  "mobileNumber": "+919876543210",
  "expiresIn": 600
}
```

---

### 2. Verify SMS Code
```
PATCH /api/customers/verify-sms

Request:
{
  "mobileNumber": "9876543210",
  "code": "123456"
}

Response (Success):
{
  "message": "Mobile number verified successfully",
  "mobileNumber": "+919876543210",
  "verified": true
}

Response (Wrong Code):
{
  "message": "Incorrect verification code. 4 attempts remaining.",
  "remainingAttempts": 4
}
```

---

### 3. Create Customer (Now with SMS Verification)
```
POST /api/customers

Request:
{
  "name": "John Doe",
  "mobileNumber": "9876543210",
  "email": "john@example.com",
  "address": { ... }
}

Response (Success - if verified):
{
  "message": "Customer created successfully",
  "customer": { ... }
}

Response (Not verified):
{
  "message": "Mobile number must be verified first. Please complete SMS verification.",
  "requiresVerification": true,
  "mobileNumber": "+919876543210"
}
```

---

## Key Features

✅ **6-digit OTP** - Auto-generated random code  
✅ **10-minute expiration** - Code valid for 10 minutes  
✅ **5 attempt limit** - Max 5 incorrect attempts  
✅ **Auto-delete expired** - MongoDB TTL index  
✅ **Phone formatting** - Auto-converts to +91XXXXXXXXXX  
✅ **Brute-force protection** - Blocks after 5 attempts  
✅ **SMS via Pingram** - Uses your Pingram API key  

---

## Example Flow

**Step 1: Send Code**
```javascript
POST /api/customers/verify-sms
Body: { "mobileNumber": "9876543210" }
// Returns: expiresIn: 600 seconds (10 minutes)
// SMS sent: "Your code is: 123456"
```

**Step 2: User Waits for SMS**
- SMS arrives in seconds
- User sees code: 123456
- Timer shows 10:00, 9:59, 9:58...

**Step 3: Submit Code**
```javascript
PATCH /api/customers/verify-sms
Body: { "mobileNumber": "9876543210", "code": "123456" }
// Returns: verified: true
```

**Step 4: Create Customer**
```javascript
POST /api/customers
Body: { "name": "John", "mobileNumber": "9876543210", ... }
// Now succeeds! Verification record auto-deleted.
```

---

## Error Codes

| Error | Solution |
|-------|----------|
| "Valid mobile number is required" | Enter 10-digit phone |
| "No verification code found" | Send code first |
| "Verification code has expired" | Request new code |
| "Maximum verification attempts exceeded" | Request new code |
| "Incorrect verification code. X attempts remaining" | Re-enter correct code |
| "Mobile number must be verified first" | Complete SMS verification |

---

## Files

**New Files Created:**
- `src/models/SMSVerification.js` - OTP model
- `src/app/api/customers/verify-sms/route.js` - Verification API

**Modified:**
- `src/app/api/customers/route.js` - Added verification check

**Documentation:**
- `SMS_VERIFICATION_GUIDE.md` - Complete guide
- This file

---

## Testing

### Via cURL
```bash
# 1. Send code
curl -X POST http://localhost:3000/api/customers/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210"}'

# 2. Verify code (replace with actual code from SMS)
curl -X PATCH http://localhost:3000/api/customers/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210","code":"XXXXXX"}'

# 3. Create customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "mobileNumber":"9876543210",
    "email":"test@example.com"
  }'
```

---

**Setup Complete!** ✅
