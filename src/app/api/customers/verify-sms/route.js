import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import SMSVerification from '@/models/SMSVerification';
import { sendSMSNotification } from '@/lib/smsService';

// Generate 6-digit OTP code
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS verification code
export async function POST(req) {
  try {
    await connectDB();

    const { mobileNumber } = await req.json();

    // Validate mobile number
    if (!mobileNumber || mobileNumber.trim().length < 10) {
      return NextResponse.json(
        { message: 'Valid mobile number is required' },
        { status: 400 }
      );
    }

    // Clean mobile number (remove special characters)
    const cleanedNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    const formattedNumber = '+91' + cleanedNumber;

    // Delete previous verification attempts for this number (if any)
    await SMSVerification.deleteMany({ mobileNumber: formattedNumber });

    // Generate OTP
    const otp = generateOTP();

    // Create verification record (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const verification = new SMSVerification({
      mobileNumber: formattedNumber,
      code: otp,
      expiresAt,
    });

    await verification.save();

    // Send SMS with OTP
    const message = `Your Laxmi Alankar verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;
    
    const smsResult = await sendSMSNotification(formattedNumber, message);

    if (!smsResult.success) {
      // Still return success but log the issue
      console.warn('SMS sending failed but verification record created:', smsResult);
      return NextResponse.json(
        {
          message: 'Verification code sent (SMS delivery status: pending)',
          verificationId: verification._id,
          mobileNumber: formattedNumber,
          expiresIn: 600, // 10 minutes in seconds
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: 'Verification code sent successfully',
        verificationId: verification._id,
        mobileNumber: formattedNumber,
        expiresIn: 600, // 10 minutes in seconds
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send verification SMS error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to send verification code' },
      { status: 500 }
    );
  }
}

// Verify SMS code
export async function PATCH(req) {
  try {
    await connectDB();

    const { mobileNumber, code } = await req.json();

    // Validate inputs
    if (!mobileNumber || !code) {
      return NextResponse.json(
        { message: 'Mobile number and verification code are required' },
        { status: 400 }
      );
    }

    // Clean mobile number
    const cleanedNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    const formattedNumber = '+91' + cleanedNumber;

    // Find verification record
    const verification = await SMSVerification.findOne({
      mobileNumber: formattedNumber,
    });

    if (!verification) {
      return NextResponse.json(
        { message: 'No verification code found for this mobile number' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (verification.isVerified) {
      return NextResponse.json(
        { message: 'This mobile number is already verified' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > verification.expiresAt) {
      await SMSVerification.deleteOne({ _id: verification._id });
      return NextResponse.json(
        { message: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (verification.attempts >= verification.maxAttempts) {
      await SMSVerification.deleteOne({ _id: verification._id });
      return NextResponse.json(
        { message: 'Maximum verification attempts exceeded. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check code
    if (verification.code !== code.trim()) {
      verification.attempts += 1;
      await verification.save();

      const remainingAttempts = verification.maxAttempts - verification.attempts;
      return NextResponse.json(
        {
          message: `Incorrect verification code. ${remainingAttempts} attempts remaining.`,
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Code is correct - mark as verified
    verification.isVerified = true;
    verification.verifiedAt = new Date();
    await verification.save();

    return NextResponse.json(
      {
        message: 'Mobile number verified successfully',
        mobileNumber: formattedNumber,
        verified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify SMS code error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to verify code' },
      { status: 500 }
    );
  }
}

// Get verification status
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const mobileNumber = searchParams.get('mobileNumber');

    if (!mobileNumber) {
      return NextResponse.json(
        { message: 'Mobile number is required' },
        { status: 400 }
      );
    }

    // Clean mobile number
    const cleanedNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    const formattedNumber = '+91' + cleanedNumber;

    const verification = await SMSVerification.findOne({
      mobileNumber: formattedNumber,
    });

    if (!verification) {
      return NextResponse.json(
        { verified: false, message: 'No verification found' },
        { status: 200 }
      );
    }

    // Check if expired
    if (new Date() > verification.expiresAt) {
      return NextResponse.json(
        { verified: false, message: 'Verification code has expired' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      verified: verification.isVerified,
      expiresAt: verification.expiresAt,
      attempts: verification.attempts,
      remainingAttempts: verification.maxAttempts - verification.attempts,
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
