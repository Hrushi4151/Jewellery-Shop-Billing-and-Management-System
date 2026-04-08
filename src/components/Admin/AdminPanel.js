'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './AdminPanel.module.css';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [health, setHealth] = useState(null);
  const [backups, setBackups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchSystemHealth(), fetchBackups(), fetchTemplates()]);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchData();
    
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const fetchSystemHealth = async () => {
    try {
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      setHealth(data);
    } catch (error) {
      console.error('Error fetching health:', error);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/admin/backups');
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleCreateBackup = async (type) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupType: type }),
      });

      const data = await res.json();
      setMessage(data.message || 'Backup initiated');
      setTimeout(() => setMessage(''), 3000);
      fetchBackups();
    } catch (error) {
      setMessage('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🛠️ Admin Control Panel</h1>
        <p className={styles.subtitle}>System administration and monitoring</p>
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
            Auto-refresh (30s)
          </label>
        </div>
        <button className="btn-primary" onClick={() => fetchData()}>
          🔄 Refresh Now
        </button>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'health' ? styles.active : ''}`}
          onClick={() => setActiveTab('health')}
        >
          💚 System Health
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'backup' ? styles.active : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          💾 Backups
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📧 Templates
        </button>
      </div>

      {activeTab === 'overview' && health && (
        <div className={styles.content}>
          <div className={styles.grid2}>
            <div className={styles.card}>
              <h3>System Statistics</h3>
              <div className={styles.stat}>
                <span>Total Invoices</span>
                <strong>{health.stats?.totalInvoices || 0}</strong>
              </div>
              <div className={styles.stat}>
                <span>Total Customers</span>
                <strong>{health.stats?.totalCustomers || 0}</strong>
              </div>
              <div className={styles.stat}>
                <span>Total Products</span>
                <strong>{health.stats?.totalProducts || 0}</strong>
              </div>
              <div className={styles.stat}>
                <span>Total Revenue</span>
                <strong>₹{health.stats?.totalRevenue?.toLocaleString('en-IN') || 0}</strong>
              </div>
            </div>

            <div className={styles.card}>
              <h3>System Status: {health.systemStatus}</h3>
              <div className={styles.stat}>
                <span>CPU Usage</span>
                <strong>{health.health?.metrics?.cpuUsage?.toFixed(2) || 0}%</strong>
              </div>
              <div className={styles.stat}>
                <span>Memory Used</span>
                <strong>{health.health?.metrics?.memoryUsage?.toFixed(2) || 0} MB</strong>
              </div>
              <div className={styles.stat}>
                <span>Uptime</span>
                <strong>{formatUptime(health.health?.metrics?.uptime || 0)}</strong>
              </div>
              <div className={styles.stat}>
                <span>DB Connected</span>
                <strong>{health.health?.databaseStatus?.connected ? '✅ Yes' : '❌ No'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className={styles.content}>
          <div className={styles.card}>
            <h3>System Health Monitoring</h3>
            <button className="btn-primary" onClick={() => fetchSystemHealth()}>
              🔄 Refresh Health
            </button>

            {health && (
              <>
                <div className={styles.healthMetrics}>
                  <div className={styles.metric}>
                    <strong>CPU Usage:</strong>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progress}
                        style={{
                          width: `${Math.min(health.health?.metrics?.cpuUsage || 0, 100)}%`,
                          background:
                            (health.health?.metrics?.cpuUsage || 0) > 80 ? '#ef4444' : '#10b981',
                        }}
                      />
                    </div>
                    <span>{health.health?.metrics?.cpuUsage?.toFixed(2) || 0}%</span>
                  </div>

                  <div className={styles.metric}>
                    <strong>Memory Usage:</strong>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progress}
                        style={{
                          width: `${Math.min(
                            (health.health?.metrics?.memoryUsage / (health.health?.metrics?.memoryAvailable || 1)) *
                              100,
                            100
                          )}%`,
                          background:
                            (health.health?.metrics?.memoryUsage / (health.health?.metrics?.memoryAvailable || 1)) *
                              100 >
                            80
                              ? '#ef4444'
                              : '#10b981',
                        }}
                      />
                    </div>
                    <span>{health.health?.metrics?.memoryUsage?.toFixed(2) || 0} MB</span>
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.infoBox}>
                    <h4>Database Status</h4>
                    <p>Connected: {health.health?.databaseStatus?.connected ? '✅' : '❌'}</p>
                    <p>Latency: {health.health?.databaseStatus?.latencyMs?.toFixed(2) || 0}ms</p>
                  </div>

                  <div className={styles.infoBox}>
                    <h4>System Info</h4>
                    <p>Node: {health.systemInfo?.nodeVersion}</p>
                    <p>CPUs: {health.systemInfo?.cpuCount}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className={styles.content}>
          <div className={styles.card}>
            <h3>Backup Management</h3>

            <div className={styles.grid2}>
              <button
                className="btn-primary"
                onClick={() => handleCreateBackup('Full')}
                disabled={loading}
              >
                {loading ? '⏳ Creating...' : '💾 Full Backup'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleCreateBackup('Incremental')}
                disabled={loading}
              >
                {loading ? '⏳ Creating...' : '📦 Incremental Backup'}
              </button>
            </div>

            <div className={styles.backupList}>
              <h4>Recent Backups</h4>
              {backups && backups.length > 0 ? (
                <div className={styles.table}>
                  {backups.map((backup) => (
                    <div key={backup._id} className={styles.backupRow}>
                      <div>
                        <strong>{backup.backupName}</strong>
                        <p>Type: {backup.backupType}</p>
                        <p>Status: {backup.status}</p>
                      </div>
                      <div>
                        <p>Size: {formatBytes(backup.size)}</p>
                        <p>Date: {new Date(backup.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No backups yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className={styles.content}>
          <div className={styles.card}>
            <h3>Notification Templates</h3>

            <div className={styles.templateList}>
              {templates && templates.length > 0 ? (
                templates.map((template) => (
                  <div key={template._id} className={styles.templateItem}>
                    <strong>{template.name}</strong>
                    <p>Category: {template.category}</p>
                    <p>Type: {template.type}</p>
                    {template.smsContent && <p>SMS: {template.smsContent.substring(0, 50)}...</p>}
                  </div>
                ))
              ) : (
                <p>No templates configured</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
