'use client';

import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPending: 0,
    totalPaid: 0,
    invoiceCount: 0,
  });
  const [metalRates, setMetalRates] = useState({});
  const [rateHistory, setRateHistory] = useState([]);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [invoicesRes, ratesRes, historyRes] = await Promise.all([
        fetch('/api/invoices?limit=100'),
        fetch('/api/products/gold-rate'),
        fetch('/api/products/gold-rate/history?days=30'),
      ]);

      const invoicesData = await invoicesRes.json();
      const ratesData = ratesRes.ok ? await ratesRes.json() : {};
      const historyData = historyRes.ok ? await historyRes.json() : { history: [] };

      // Calculate stats
      let totalSales = 0;
      let totalPending = 0;
      let totalPaid = 0;

      if (invoicesData.invoices && Array.isArray(invoicesData.invoices)) {
        invoicesData.invoices.forEach((invoice) => {
          totalSales += invoice.totalAmount || 0;
          totalPending += invoice.amountPending || 0;
          totalPaid += invoice.amountPaid || 0;
        });
      }

      const normalizedRates = ratesData?.metalRates || {};
      setMetalRates(normalizedRates);

      const historyRows = Array.isArray(historyData?.history) ? historyData.history : [];
      setRateHistory(historyRows);

      const updatedAt = ratesData?.lastUpdated || ratesData?.rateApiConfig?.lastFetchedAt;
      setRatesUpdatedAt(updatedAt || '');

      setStats({
        totalSales,
        totalPending,
        totalPaid,
        invoiceCount: invoicesData.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatDateTime = (date) => {
    if (!date) return 'Not available';
    return new Date(date).toLocaleString('en-IN');
  };

  const metalSummary = [
    {
      key: 'gold',
      name: 'Gold',
      value:
        metalRates?.gold?.purity22K ||
        metalRates?.gold?.purity24K ||
        0,
    },
    {
      key: 'silver',
      name: 'Silver',
      value:
        metalRates?.silver?.purity999 ||
        metalRates?.silver?.purity925 ||
        0,
    },
    {
      key: 'platinum',
      name: 'Platinum',
      value:
        metalRates?.platinum?.purity950 ||
        metalRates?.platinum?.purity900 ||
        0,
    },
  ];

  const chartSeries = [
    { key: 'gold', name: 'Gold', color: '#b38a1f' },
    { key: 'silver', name: 'Silver', color: '#6b7280' },
    { key: 'platinum', name: 'Platinum', color: '#111827' },
  ];

  const chartData = rateHistory.map((entry) => ({
    date: entry?.date,
    label: entry?.date ? formatDate(entry.date) : '-',
    gold: Number(entry?.rates?.gold) || 0,
    silver: Number(entry?.rates?.silver) || 0,
    platinum: Number(entry?.rates?.platinum) || 0,
  }));

  const chartHasData = chartData.some(
    (point) => point.gold > 0 || point.silver > 0 || point.platinum > 0
  );

  const chartWidth = 720;
  const chartHeight = 260;
  const chartPadding = { top: 12, right: 20, bottom: 24, left: 12 };
  const graphWidth = chartWidth - chartPadding.left - chartPadding.right;
  const graphHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const maxChartRate = chartHasData
    ? Math.max(
        ...chartData.flatMap((point) => [point.gold, point.silver, point.platinum]),
        1
      )
    : 1;

  const getPointX = (index) => {
    if (chartData.length <= 1) {
      return chartPadding.left + graphWidth / 2;
    }

    return chartPadding.left + (index / (chartData.length - 1)) * graphWidth;
  };

  const getPointY = (value) => {
    const safeValue = Number(value) || 0;
    const normalized = Math.min(safeValue / maxChartRate, 1);
    return chartPadding.top + graphHeight - normalized * graphHeight;
  };

  const buildSeriesPoints = (metalKey) =>
    chartData
      .map((point, index) => `${getPointX(index)},${getPointY(point[metalKey])}`)
      .join(' ');

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <button className="btn-primary" onClick={fetchDashboardData}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading dashboard data...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💰</div>
              <div className={styles.statContent}>
                <h3>Total Sales</h3>
                <p className={styles.statValue}>{formatCurrency(stats.totalSales)}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statContent}>
                <h3>Total Paid</h3>
                <p className={styles.statValue} style={{ color: '#10b981' }}>
                  {formatCurrency(stats.totalPaid)}
                </p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>⏳</div>
              <div className={styles.statContent}>
                <h3>Pending Amount</h3>
                <p className={styles.statValue} style={{ color: '#f59e0b' }}>
                  {formatCurrency(stats.totalPending)}
                </p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📄</div>
              <div className={styles.statContent}>
                <h3>Total Invoices</h3>
                <p className={styles.statValue}>{stats.invoiceCount}</p>
              </div>
            </div>
          </div>

          <div className={styles.ratesSection}>
            <div className={styles.ratesHeader}>
              <h2>Current Metal Rates</h2>
              <span className={styles.ratesUpdatedAt}>
                Updated: {formatDateTime(ratesUpdatedAt)}
              </span>
            </div>

            <div className={styles.metalCards}>
              {metalSummary.map((metal) => (
                <div key={metal.key} className={styles.metalCard}>
                  <p className={styles.metalName}>{metal.name}</p>
                  <p className={styles.metalRate}>
                    {metal.value > 0 ? formatCurrency(metal.value) : 'Not set'}
                  </p>
                  <p className={styles.metalHint}>per gram</p>
                </div>
              ))}
            </div>

            <div className={styles.graphSection}>
              <h3>Metal Price History</h3>
              {chartData.length > 0 && chartHasData ? (
                <>
                  <div className={styles.graphLegend}>
                    {chartSeries.map((series) => (
                      <div key={series.key} className={styles.legendItem}>
                        <span
                          className={styles.legendDot}
                          style={{ backgroundColor: series.color }}
                        />
                        <span>{series.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.lineChartWrap}>
                    <svg
                      className={styles.lineChart}
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Gold, silver and platinum price history"
                    >
                      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                        const y = chartPadding.top + graphHeight - tick * graphHeight;
                        return (
                          <line
                            key={tick}
                            x1={chartPadding.left}
                            y1={y}
                            x2={chartWidth - chartPadding.right}
                            y2={y}
                            className={styles.gridLine}
                          />
                        );
                      })}

                      {chartSeries.map((series) => (
                        <polyline
                          key={series.key}
                          fill="none"
                          stroke={series.color}
                          strokeWidth="2.5"
                          points={buildSeriesPoints(series.key)}
                        />
                      ))}

                      {chartSeries.map((series) =>
                        chartData.map((point, index) => (
                          <circle
                            key={`${series.key}-${index}`}
                            cx={getPointX(index)}
                            cy={getPointY(point[series.key])}
                            r="2.8"
                            fill={series.color}
                          />
                        ))
                      )}
                    </svg>
                  </div>

                  <div className={styles.graphDates}>
                    {chartData.map((point, index) => (
                      <span
                        key={`${point.label}-${index}`}
                        className={styles.graphDateLabel}
                        style={{ left: `${(getPointX(index) / chartWidth) * 100}%` }}
                      >
                        {point.label}
                      </span>
                    ))}
                  </div>

                  <div className={styles.latestRatesRow}>
                    {chartSeries.map((series) => (
                      <div key={series.key} className={styles.latestRateCard}>
                        <p>{series.name} Latest</p>
                        <strong>
                          {formatCurrency(
                            chartData[chartData.length - 1]?.[series.key] || 0
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className={styles.emptyRates}>Metal rate history is not available yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
