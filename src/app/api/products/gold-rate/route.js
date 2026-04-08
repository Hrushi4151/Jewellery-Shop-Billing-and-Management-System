import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Settings from '@/models/Settings';
import MetalRateHistory from '@/models/MetalRateHistory';

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
};

const buildHistoryRates = (settings) => ({
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

const saveRateHistory = async (settings, source) => {
  const rates = buildHistoryRates(settings);
  if (!rates.gold && !rates.silver && !rates.platinum) {
    return;
  }

  await MetalRateHistory.create({
    source,
    recordedAt: new Date(),
    rates,
  });
};

export async function GET(req) {
  try {
    await connectDB();

    const settings = await Settings.findOne({});

    if (!settings) {
      return NextResponse.json(
        { message: 'Settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      // New purity-based structure
      metalRates: settings.metalRates,
      purityFactors: settings.purityFactors,
      
      // Legacy fields (for backward compatibility)
      goldRate: settings.currentGoldRate,
      silverRate: settings.silverRate,
      platinumRate: settings.platinumRate,
      lastUpdated: settings.goldRateLastUpdated,
      gstRates: settings.gstRate,
      
      // API config
      rateApiConfig: settings.rateApiConfig,
    });
  } catch (error) {
    console.error('Get gold rate error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch gold rate' },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await connectDB();

    const data = await req.json();

    let updateData = {
      goldRateLastUpdated: new Date(),
    };

    // Support both new (metalRates) and legacy (goldRate, silverRate, platinumRate) formats
    if (data.metalRates) {
      updateData.metalRates = data.metalRates;
    }

    if (data.goldRate !== undefined) {
      updateData.currentGoldRate = data.goldRate;
    }

    if (data.silverRate !== undefined) {
      updateData.silverRate = data.silverRate;
    }

    if (data.platinumRate !== undefined) {
      updateData.platinumRate = data.platinumRate;
    }

    // Update API config if provided
    if (data.rateApiConfig) {
      updateData.rateApiConfig = {
        ...data.rateApiConfig,
        lastFetchedAt: new Date(),
      };
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true }
    );

    try {
      await saveRateHistory(settings, 'manual');
    } catch (historyError) {
      console.error('Failed to store manual rate history snapshot:', historyError);
    }

    return NextResponse.json({
      message: 'Rates updated successfully',
      metalRates: settings.metalRates,
      goldRate: settings.currentGoldRate,
      silverRate: settings.silverRate,
      platinumRate: settings.platinumRate,
      lastUpdated: settings.goldRateLastUpdated,
    });
  } catch (error) {
    console.error('Update gold rate error:', error);
    return NextResponse.json(
      { message: 'Failed to update gold rate' },
      { status: 500 }
    );
  }
}

// Fetch from external API
export async function POST(req) {
  try {
    await connectDB();

    const { action, provider, rateApiConfig } = await req.json();

    if (action !== 'fetchFromAPI') {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      );
    }

    const settings = await Settings.findOne({});

    const effectiveProvider =
      provider || rateApiConfig?.apiProvider || settings?.rateApiConfig?.apiProvider || 'goldapi';
    const effectiveApiKey =
      (rateApiConfig?.apiKey || settings?.rateApiConfig?.apiKey || '').trim();

    if (!effectiveApiKey) {
      return NextResponse.json(
        { message: 'API configuration not found. Please add an API key.' },
        { status: 400 }
      );
    }

    let fetchedRates = {};

    // Example: Fetch from external provider (goldapi.io, metals.live, etc.)
    if (effectiveProvider === 'goldapi') {
      const ounceToGram = 31.1035;

      const fetchMetalPerGram = async (symbol) => {
        const response = await fetch(`https://www.goldapi.io/api/${symbol}/INR`, {
          headers: { 'x-access-token': effectiveApiKey },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${symbol} rate`);
        }

        const data = await response.json();
        if (!data?.price) {
          throw new Error(`Invalid ${symbol} rate payload`);
        }

        return data.price / ounceToGram;
      };

      const [goldResult, silverResult, platinumResult] = await Promise.allSettled([
        fetchMetalPerGram('XAU'),
        fetchMetalPerGram('XAG'),
        fetchMetalPerGram('XPT'),
      ]);

      const goldPerGram =
        goldResult.status === 'fulfilled' ? goldResult.value : settings?.currentGoldRate || 0;
      const silverPerGram =
        silverResult.status === 'fulfilled'
          ? silverResult.value
          : settings?.silverRate || settings?.metalRates?.silver?.purity999 || 0;
      const platinumPerGram =
        platinumResult.status === 'fulfilled'
          ? platinumResult.value
          : settings?.platinumRate || settings?.metalRates?.platinum?.purity950 || 0;

      if (!goldPerGram && !silverPerGram && !platinumPerGram) {
        return NextResponse.json(
          { message: 'Failed to fetch rates from API' },
          { status: 400 }
        );
      }

      fetchedRates = {
        metalRates: {
          gold: {
            purity22K: parseFloat((goldPerGram * 0.9167).toFixed(2)),
            purity18K: parseFloat((goldPerGram * 0.75).toFixed(2)),
            purity14K: parseFloat((goldPerGram * 0.5833).toFixed(2)),
            purity10K: parseFloat((goldPerGram * 0.4167).toFixed(2)),
          },
          silver: {
            purity999: parseFloat((silverPerGram * 0.999).toFixed(2)),
            purity925: parseFloat((silverPerGram * 0.925).toFixed(2)),
          },
          platinum: {
            purity950: parseFloat((platinumPerGram * 0.95).toFixed(2)),
            purity900: parseFloat((platinumPerGram * 0.9).toFixed(2)),
          },
        },
        currentGoldRate: parseFloat(goldPerGram.toFixed(2)),
        silverRate: parseFloat(silverPerGram.toFixed(2)),
        platinumRate: parseFloat(platinumPerGram.toFixed(2)),
        goldRateLastUpdated: new Date(),
      };
    }

    if (!Object.keys(fetchedRates).length) {
      return NextResponse.json(
        { message: 'Failed to fetch rates from API' },
        { status: 400 }
      );
    }

    // Update settings with fetched rates
    const nextRateApiConfig = {
      ...(settings?.rateApiConfig?.toObject?.() || settings?.rateApiConfig || {}),
      ...(rateApiConfig || {}),
      apiProvider: effectiveProvider,
      apiKey: effectiveApiKey,
      enabled: true,
      lastFetchedAt: new Date(),
    };

    const updated = await Settings.findOneAndUpdate(
      {},
      {
        ...fetchedRates,
        rateApiConfig: nextRateApiConfig,
      },
      { new: true, upsert: true }
    );

    try {
      await saveRateHistory(updated, 'api');
    } catch (historyError) {
      console.error('Failed to store API rate history snapshot:', historyError);
    }

    return NextResponse.json({
      message: 'Rates fetched and updated successfully',
      metalRates: updated.metalRates,
      lastFetchedAt: updated.rateApiConfig.lastFetchedAt,
    });
  } catch (error) {
    console.error('Fetch from API error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch rates from API' },
      { status: 500 }
    );
  }
}
