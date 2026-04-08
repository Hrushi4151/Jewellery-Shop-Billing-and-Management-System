import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Settings from '@/models/Settings';
import MetalRateHistory from '@/models/MetalRateHistory';

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
};

const normalizeRatesFromSettings = (settings) => ({
  gold:
    toNumber(settings?.metalRates?.gold?.purity22K) ||
    toNumber(settings?.currentGoldRate),
  silver:
    toNumber(settings?.metalRates?.silver?.purity999) ||
    toNumber(settings?.silverRate),
  platinum:
    toNumber(settings?.metalRates?.platinum?.purity950) ||
    toNumber(settings?.platinumRate),
});

export async function GET(req) {
  try {
    await connectDB();

    const searchParams = new URL(req.url).searchParams;
    const days = Math.max(1, Math.min(365, Number(searchParams.get('days')) || 30));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await MetalRateHistory.find({ recordedAt: { $gte: startDate } })
      .sort({ recordedAt: 1 })
      .lean();

    // Keep the last snapshot per calendar day to draw a readable line chart.
    const byDay = new Map();
    entries.forEach((entry) => {
      const date = new Date(entry.recordedAt);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      byDay.set(key, {
        date: entry.recordedAt,
        source: entry.source,
        rates: {
          gold: toNumber(entry?.rates?.gold),
          silver: toNumber(entry?.rates?.silver),
          platinum: toNumber(entry?.rates?.platinum),
        },
      });
    });

    let history = Array.from(byDay.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    if (history.length === 0) {
      const settings = await Settings.findOne({}).lean();
      if (settings) {
        const rates = normalizeRatesFromSettings(settings);
        history = [
          {
            date: settings.goldRateLastUpdated || settings.updatedAt || new Date(),
            source: 'manual',
            rates,
          },
        ];
      }
    }

    return NextResponse.json({
      days,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Get metal rate history error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch metal rate history' },
      { status: 500 }
    );
  }
}
