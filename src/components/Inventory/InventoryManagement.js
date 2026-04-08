'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './InventoryManagement.module.css';

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    await Promise.all([
      fetchInventory(),
      fetchAlerts(),
      fetchAdjustments(),
    ]);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchData();

    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 20000); // Refresh every 20 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory?status=LowStock');
      const data = await res.json();
      setInventory(data.inventory || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/inventory/alerts?status=Active');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchAdjustments = async () => {
    try {
      const res = await fetch('/api/inventory/stock-adjustments?limit=10');
      const data = await res.json();
      setAdjustments(data.adjustments || []);
    } catch (error) {
      console.error('Error fetching adjustments:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' }),
      });

      if (res.ok) {
        setMessage('Alert acknowledged');
        setTimeout(() => setMessage(''), 3000);
        fetchAlerts();
      }
    } catch (error) {
      setMessage('Failed to acknowledge alert');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'InStock':
        return '#10b981';
      case 'LowStock':
        return '#f59e0b';
      case 'OutOfStock':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📦 Inventory Management</h1>
        <p className={styles.subtitle}>Real-time stock levels and analytics</p>
      </div>

      <div className={styles.topBar}>
        <div className={styles.refreshInfo}>
          <span>Last updated: {lastUpdated.toLocaleTimeString('en-IN')}</span>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (20s)
          </label>
        </div>
        <button className="btn-primary" onClick={() => fetchData()}>
          🔄 Refresh Now
        </button>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'inventory' ? styles.active : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📊 Stock Levels
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'alerts' ? styles.active : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          ⚠️ Alerts ({alerts.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 History
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className={styles.content}>
          <div className={styles.grid}>
            {inventory && inventory.length > 0 ? (
              inventory.map((item) => (
                <div key={item._id} className={styles.stockCard}>
                  <div className={styles.cardHeader}>
                    <strong>{item.productId?.itemName || 'Unknown Product'}</strong>
                    <div
                      className={styles.statusBadge}
                      style={{ background: getStatusColor(item.status) }}
                    >
                      {item.status}
                    </div>
                  </div>

                  <div className={styles.stockLevel}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progress}
                        style={{
                          width: `${Math.min((item.quantity / item.maxStockLevel) * 100, 100)}%`,
                          background:
                            item.status === 'OutOfStock'
                              ? '#ef4444'
                              : item.status === 'LowStock'
                              ? '#f59e0b'
                              : '#10b981',
                        }}
                      />
                    </div>
                    <div className={styles.levelText}>
                      <strong>{item.quantity}</strong> / {item.maxStockLevel}
                    </div>
                  </div>

                  <div className={styles.stockDetails}>
                    <div className={styles.detail}>
                      <span>Min Level:</span>
                      <strong>{item.minStockLevel}</strong>
                    </div>
                    <div className={styles.detail}>
                      <span>Value:</span>
                      <strong>₹{item.valuationCost?.toLocaleString('en-IN') || '0'}</strong>
                    </div>
                  </div>

                  {item.location && (
                    <div className={styles.location}>📍 {item.location}</div>
                  )}
                </div>
              ))
            ) : (
              <div className={styles.empty}>No inventory items to display</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className={styles.content}>
          <div className={styles.alertsList}>
            {alerts && alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert._id} className={styles.alertItem}>
                  <div className={styles.alertHeader}>
                    <strong>{alert.productId?.itemName || 'Unknown Product'}</strong>
                    <span
                      className={styles.alertType}
                      style={{
                        background:
                          alert.alertType === 'OutOfStock'
                            ? '#ef4444'
                            : alert.alertType === 'LowStock'
                            ? '#f59e0b'
                            : '#fbbf24',
                      }}
                    >
                      {alert.alertType}
                    </span>
                  </div>

                  <div className={styles.alertDetails}>
                    <p>Current Level: {alert.currentLevel}</p>
                    <p>Threshold: {alert.threshold}</p>
                    <p>Status: {alert.status}</p>
                  </div>

                  {alert.status === 'Active' && (
                    <button
                      className="btn-primary"
                      onClick={() => handleAcknowledgeAlert(alert._id)}
                      disabled={loading}
                    >
                      {loading ? '⏳ Processing...' : '✓ Acknowledge'}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className={styles.empty}>No active alerts</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className={styles.content}>
          <div className={styles.historyTable}>
            <h3>Stock Adjustment History</h3>
            {adjustments && adjustments.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Before</th>
                    <th>After</th>
                    <th>Date</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj) => (
                    <tr key={adj._id}>
                      <td>{adj.productId?.itemName || '-'}</td>
                      <td>
                        <span className={styles.badge}>{adj.adjustmentType}</span>
                      </td>
                      <td>{Math.abs(adj.quantity)}</td>
                      <td>{adj.previousQuantity}</td>
                      <td>{adj.newQuantity}</td>
                      <td>{new Date(adj.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>{adj.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.empty}>No adjustment history</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
