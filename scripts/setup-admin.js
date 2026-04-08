#!/usr/bin/env node

/**
 * Setup Script - Create Admin User in Database
 * 
 * Usage: node scripts/setup-admin.js
 * 
 * This script creates the default admin user from environment variables
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB Connection
async function setupAdmin() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect("mongodb+srv://hrushitech51_db_user:kGMsi4mBlOF8wKu6@cluster0.gnpk86q.mongodb.net/?appName=Cluster0")
    console.log('✅ Connected to MongoDB');

    // Get Admin model
    const adminSchema = new mongoose.Schema(
      {
        name: String,
        email: { type: String, unique: true, lowercase: true },
        password: String,
        role: { type: String, default: 'Admin' },
        permissions: [String],
        isActive: { type: Boolean, default: true },
        lastLogin: Date,
      },
      { timestamps: true }
    );

    const Admin = mongoose.model('Admin', adminSchema);

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'admin@jewellery.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`Email: ${existingAdmin.email}`);
      console.log('No action taken.');
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'admin123',
      salt
    );

    // Create admin
    console.log('👤 Creating admin user...');
    const admin = new Admin({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@jewellery.com',
      password: hashedPassword,
      role: 'Admin',
      permissions: [
        'invoice.create',
        'invoice.view',
        'invoice.edit',
        'invoice.delete',
        'customer.create',
        'customer.view',
        'customer.edit',
        'customer.delete',
        'product.create',
        'product.view',
        'product.edit',
        'product.delete',
        'reports.view',
        'settings.manage',
        'users.manage',
      ],
      isActive: true,
    });

    await admin.save();

    console.log('\n✅ ========================================');
    console.log('✅ Admin user created successfully!');
    console.log('✅ ========================================');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log('✅ ========================================\n');

    // Also create default settings
    const settingsSchema = new mongoose.Schema({
      shopName: String,
      currentGoldRate: Number,
      goldRateLastUpdated: Date,
      silverRate: Number,
      platinumRate: Number,
    });

    const Settings = mongoose.model('Settings', settingsSchema);
    const existingSettings = await Settings.findOne({});

    if (!existingSettings) {
      console.log('⚙️  Creating default settings...');
      const settings = new Settings({
        shopName: 'Jewellery Shop',
        currentGoldRate: 6800,
        goldRateLastUpdated: new Date(),
        silverRate: 75,
        platinumRate: 4500,
      });
      await settings.save();
      console.log('✅ Default settings created!\n');
    } else {
      console.log('✅ Settings already exist\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupAdmin();
