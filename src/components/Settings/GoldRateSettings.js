'use client';

import React, { useState, useEffect } from 'react';
import styles from './GoldRateSettings.module.css';

export default function GoldRateSettings() {
  const [goldRates, setGoldRates] = useState({
    metalRates: {
      gold: { purity22K: 0, purity18K: 0, purity14K: 0, purity10K: 0 },
      silver: { purity999: 0, purity925: 0 },
      platinum: { purity950: 0, purity900: 0 },
    },
  });

  const [gstRates, setGstRates] = useState({
    cgst: 1.5,
    sgst: 1.5,
    igst: 3,
  });

  const [rateApiConfig, setRateApiConfig] = useState({
    enabled: false,
    apiProvider: 'manual',
    apiKey: '',
    autoUpdateInterval: 0,
  });

  const [shopProfile, setShopProfile] = useState({
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    shopGSTIN: '',
    shopLogo: '',
    companyDetails: {
      cin: '',
      pan: '',
      bankName: '',
      bankAccount: '',
      ifscCode: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [apiSource, setApiSource] = useState('manual');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [rateRes, settingsRes] = await Promise.all([
        fetch('/api/products/gold-rate'),
        fetch('/api/settings'),
      ]);

      const data = await rateRes.json();
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};

      if (data.metalRates) {
        setGoldRates({
          metalRates: data.metalRates,
        });
      }

      if (data.gstRates) {
        setGstRates(data.gstRates);
      }

      if (data.rateApiConfig) {
        setRateApiConfig(data.rateApiConfig);
        setApiSource(data.rateApiConfig.apiProvider || 'manual');
      }

      const settings = settingsData.settings || {};
      setShopProfile({
        shopName: settings.shopName || '',
        shopAddress: settings.shopAddress || '',
        shopPhone: settings.shopPhone || '',
        shopEmail: settings.shopEmail || '',
        shopGSTIN: settings.shopGSTIN || '',
        shopLogo: settings.shopLogo || '',
        companyDetails: {
          cin: settings.companyDetails?.cin || '',
          pan: settings.companyDetails?.pan || '',
          bankName: settings.companyDetails?.bankName || '',
          bankAccount: settings.companyDetails?.bankAccount || '',
          ifscCode: settings.companyDetails?.ifscCode || '',
        },
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (metal, purity, value) => {
    setGoldRates((prev) => ({
      metalRates: {
        ...prev.metalRates,
        [metal]: {
          ...prev.metalRates[metal],
          [purity]: parseFloat(value) || 0,
        },
      },
    }));
  };

  const handleGstChange = (type, value) => {
    setGstRates((prev) => ({
      ...prev,
      [type]: parseFloat(value) || 0,
    }));
  };

  const handleShopProfileChange = (name, value) => {
    if (name.startsWith('companyDetails.')) {
      const key = name.replace('companyDetails.', '');
      setShopProfile((prev) => ({
        ...prev,
        companyDetails: {
          ...prev.companyDetails,
          [key]: value,
        },
      }));
      return;
    }

    setShopProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveAllSettings = async () => {
    setSaveLoading(true);
    setMessage('');

    try {
      const [settingsRes, ratesRes] = await Promise.all([
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shopProfile),
        }),
        fetch('/api/products/gold-rate', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metalRates: goldRates.metalRates,
            gstRate: gstRates,
          }),
        }),
      ]);

      const settingsData = await settingsRes.json();
      const ratesData = await ratesRes.json();

      if (!settingsRes.ok) {
        setMessage(settingsData.message || 'Failed to save shop profile');
        return;
      }

      if (!ratesRes.ok) {
        setMessage(ratesData.message || 'Failed to save rates');
        return;
      }

      setMessage('✅ Settings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFetchFromAPI = async () => {
    setSaveLoading(true);
    setMessage('Fetching rates from API...');

    try {
      const currentApiKey = (rateApiConfig.apiKey || '').trim();
      if (!currentApiKey) {
        setMessage('❌ API key is required to fetch rates');
        return;
      }

      const res = await fetch('/api/products/gold-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetchFromAPI',
          provider: apiSource,
          rateApiConfig: {
            ...rateApiConfig,
            apiProvider: apiSource,
            apiKey: currentApiKey,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`❌ ${data.message || 'Failed to fetch rates'}`);
        return;
      }

      setMessage('✅ Rates fetched successfully');
      setGoldRates((prev) => ({
        metalRates: data.metalRates,
      }));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error fetching from API:', error);
      setMessage('❌ Failed to fetch rates from API');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <h1>💰 Gold Rate & Settings Management</h1>

      <div className={styles.card}>
        <h2>🏪 Shop Profile</h2>
        <p className={styles.description}>
          Add the shop details that appear on customer pages and invoices.
        </p>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Shop Name</label>
            <input
              type="text"
              value={shopProfile.shopName}
              onChange={(e) => handleShopProfileChange('shopName', e.target.value)}
              placeholder="Enter shop name"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Shop Logo URL</label>
            <input
              type="text"
              value={shopProfile.shopLogo}
              onChange={(e) => handleShopProfileChange('shopLogo', e.target.value)}
              placeholder="Paste logo image URL"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Shop Address</label>
            <input
              type="text"
              value={shopProfile.shopAddress}
              onChange={(e) => handleShopProfileChange('shopAddress', e.target.value)}
              placeholder="Enter shop address"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Shop Phone</label>
            <input
              type="text"
              value={shopProfile.shopPhone}
              onChange={(e) => handleShopProfileChange('shopPhone', e.target.value)}
              placeholder="Enter shop phone"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Shop Email</label>
            <input
              type="email"
              value={shopProfile.shopEmail}
              onChange={(e) => handleShopProfileChange('shopEmail', e.target.value)}
              placeholder="Enter shop email"
            />
          </div>

          <div className={styles.formGroup}>
            <label>GSTIN</label>
            <input
              type="text"
              value={shopProfile.shopGSTIN}
              onChange={(e) => handleShopProfileChange('shopGSTIN', e.target.value)}
              placeholder="Enter GSTIN"
            />
          </div>
        </div>

        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label>PAN</label>
            <input
              type="text"
              value={shopProfile.companyDetails.pan}
              onChange={(e) => handleShopProfileChange('companyDetails.pan', e.target.value)}
              placeholder="Enter PAN"
            />
          </div>

          <div className={styles.formGroup}>
            <label>CIN</label>
            <input
              type="text"
              value={shopProfile.companyDetails.cin}
              onChange={(e) => handleShopProfileChange('companyDetails.cin', e.target.value)}
              placeholder="Enter CIN"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Bank Name</label>
            <input
              type="text"
              value={shopProfile.companyDetails.bankName}
              onChange={(e) => handleShopProfileChange('companyDetails.bankName', e.target.value)}
              placeholder="Enter bank name"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Account Number</label>
            <input
              type="text"
              value={shopProfile.companyDetails.bankAccount}
              onChange={(e) => handleShopProfileChange('companyDetails.bankAccount', e.target.value)}
              placeholder="Enter account number"
            />
          </div>

          <div className={styles.formGroup}>
            <label>IFSC Code</label>
            <input
              type="text"
              value={shopProfile.companyDetails.ifscCode}
              onChange={(e) => handleShopProfileChange('companyDetails.ifscCode', e.target.value)}
              placeholder="Enter IFSC code"
            />
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`${styles.message} ${
            message.includes('✅') ? styles.success : styles.error
          }`}
        >
          {message}
        </div>
      )}

      {/* Manual Entry Section */}
      <div className={styles.card}>
        <h2>📊 Metal Rates (Manual Entry)</h2>
        <p className={styles.description}>
          Enter current rates per gram (₹/gm) for different metals and purities
        </p>

        {/* Gold Section */}
        <div className={styles.metalSection}>
          <h3>🥇 Gold Rates (Per Gram)</h3>
          <div className={styles.grid4}>
            <div className={styles.formGroup}>
              <label>22K Gold (₹/gm)</label>
              <input
                type="number"
                value={goldRates.metalRates.gold.purity22K}
                onChange={(e) => handleRateChange('gold', 'purity22K', e.target.value)}
                step="0.1"
                placeholder="Enter rate"
              />
            </div>

            <div className={styles.formGroup}>
              <label>18K Gold (₹/gm)</label>
              <input
                type="number"
                value={goldRates.metalRates.gold.purity18K}
                onChange={(e) => handleRateChange('gold', 'purity18K', e.target.value)}
                step="0.1"
                placeholder="Enter rate"
              />
            </div>

            <div className={styles.formGroup}>
              <label>14K Gold (₹/gm)</label>
              <input
                type="number"
                value={goldRates.metalRates.gold.purity14K}
                onChange={(e) => handleRateChange('gold', 'purity14K', e.target.value)}
                step="0.1"
                placeholder="Enter rate"
              />
            </div>

            <div className={styles.formGroup}>
              <label>10K Gold (₹/gm)</label>
              <input
                type="number"
                value={goldRates.metalRates.gold.purity10K}
                onChange={(e) => handleRateChange('gold', 'purity10K', e.target.value)}
                step="0.1"
                placeholder="Enter rate"
              />
            </div>
          </div>
        </div>

        {/* Silver Section */}
        <div className={styles.metalSection}>
          <h3>🥈 Silver Rates (Per Gram)</h3>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Silver 999 (₹/gm)</label>
              <input
                type="number"
                value={goldRates.metalRates.silver.purity999}
                onChange={(e) => handleRateChange('silver', 'purity999', e.target.value)}
                step="0.1"
                placeholder="Enter rate"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Silver 925 (₹/gm)</label>
              <input
                type="number"
                value={goldRates.metalRates.silver.purity925}
                onChange={(e) => handleRateChange('silver', 'purity925', e.target.value)}
                step="0.1"
                placeholder="Enter rate"
              />
            </div>
          </div>
        </div>

        {/* Platinum Section */}
        <div className={styles.metalSection}>
          <h3>🔷 Platinum Rates (Per Gram)</h3>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Platinum 950 (₹/gm)</label>
              <input
                type="number"
                value={goldRates.metalRates.platinum.purity950}
                onChange={(e) => handleRateChange('platinum', 'purity950', e.target.value)}
                step="0.1"
                placeholder="Enter rate"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Platinum 900 (₹/gm)</label>
              <input
                type="number"
                value={goldRates.metalRates.platinum.purity900}
                onChange={(e) => handleRateChange('platinum', 'purity900', e.target.value)}
                step="0.1"
                placeholder="Enter rate"
              />
            </div>
          </div>
        </div>
      </div>

      {/* GST Settings */}
      <div className={styles.card}>
        <h2>📋 GST Rates</h2>
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label>CGST (%)</label>
            <input
              type="number"
              value={gstRates.cgst}
              onChange={(e) => handleGstChange('cgst', e.target.value)}
              step="0.01"
              placeholder="CGST %"
            />
          </div>

          <div className={styles.formGroup}>
            <label>SGST (%)</label>
            <input
              type="number"
              value={gstRates.sgst}
              onChange={(e) => handleGstChange('sgst', e.target.value)}
              step="0.01"
              placeholder="SGST %"
            />
          </div>

          <div className={styles.formGroup}>
            <label>IGST (%)</label>
            <input
              type="number"
              value={gstRates.igst}
              onChange={(e) => handleGstChange('igst', e.target.value)}
              step="0.01"
              placeholder="IGST %"
            />
          </div>
        </div>
      </div>

      {/* API Configuration Section */}
      <div className={styles.card}>
        <h2>🔗 API Rate Fetching (Optional)</h2>
        <p className={styles.description}>
          Automatically fetch gold rates from external APIs. Leave empty to use manual entry only.
        </p>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>API Provider</label>
            <select value={apiSource} onChange={(e) => setApiSource(e.target.value)}>
              <option value="manual">Manual (No API)</option>
              <option value="goldapi">Gold API (goldapi.io)</option>
              <option value="metals.live">Metals.live</option>
              <option value="custom">Custom API</option>
            </select>
          </div>

          {apiSource !== 'manual' && (
            <div className={styles.formGroup}>
              <label>API Key</label>
              <input
                type="password"
                value={rateApiConfig.apiKey}
                onChange={(e) =>
                  setRateApiConfig({ ...rateApiConfig, apiKey: e.target.value })
                }
                placeholder="Enter API key"
              />
            </div>
          )}
        </div>

        {apiSource !== 'manual' && (
          <div className={styles.formGroup}>
            <label>Auto-Update Interval (minutes)</label>
            <input
              type="number"
              value={rateApiConfig.autoUpdateInterval}
              onChange={(e) =>
                setRateApiConfig({
                  ...rateApiConfig,
                  autoUpdateInterval: parseInt(e.target.value) || 0,
                })
              }
              step="1"
              min="0"
              placeholder="0 = Disabled"
            />
            <small>Set to 0 to disable automatic updates</small>
          </div>
        )}

        {apiSource !== 'manual' && (
          <button
            className={`${styles.fetchBtn} ${saveLoading ? styles.loading : ''}`}
            onClick={handleFetchFromAPI}
            disabled={saveLoading || !rateApiConfig.apiKey}
          >
            {saveLoading ? '⏳ Fetching...' : '🔄 Fetch Rates Now'}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          className={`btn-primary ${saveLoading ? styles.loading : ''}`}
          onClick={handleSaveAllSettings}
          disabled={saveLoading}
        >
          {saveLoading ? '💾 Saving...' : '✓ Save All Settings'}
        </button>

        <button className="btn-secondary" onClick={fetchSettings}>
          🔄 Reset to Last Saved
        </button>
      </div>

      {/* Rate Reference Table */}
      <div className={styles.card}>
        <h2>📈 Current Rates Summary</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Metal</th>
                <th>Purity</th>
                <th>Rate (₹/gm)</th>
                <th>Pure Content %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td rowSpan="4" className={styles.metal}>
                  Gold
                </td>
                <td>22K</td>
                <td>₹{goldRates.metalRates.gold.purity22K}</td>
                <td>91.67%</td>
              </tr>
              <tr>
                <td>18K</td>
                <td>₹{goldRates.metalRates.gold.purity18K}</td>
                <td>75%</td>
              </tr>
              <tr>
                <td>14K</td>
                <td>₹{goldRates.metalRates.gold.purity14K}</td>
                <td>58.33%</td>
              </tr>
              <tr>
                <td>10K</td>
                <td>₹{goldRates.metalRates.gold.purity10K}</td>
                <td>41.67%</td>
              </tr>
              <tr>
                <td rowSpan="2" className={styles.metal}>
                  Silver
                </td>
                <td>999</td>
                <td>₹{goldRates.metalRates.silver.purity999}</td>
                <td>99.9%</td>
              </tr>
              <tr>
                <td>925</td>
                <td>₹{goldRates.metalRates.silver.purity925}</td>
                <td>92.5%</td>
              </tr>
              <tr>
                <td rowSpan="2" className={styles.metal}>
                  Platinum
                </td>
                <td>950</td>
                <td>₹{goldRates.metalRates.platinum.purity950}</td>
                <td>95%</td>
              </tr>
              <tr>
                <td>900</td>
                <td>₹{goldRates.metalRates.platinum.purity900}</td>
                <td>90%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
