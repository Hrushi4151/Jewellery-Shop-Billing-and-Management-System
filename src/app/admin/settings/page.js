'use client';

import React from 'react';
import Header from '@/components/Common/Header';
import GoldRateSettings from '@/components/Settings/GoldRateSettings';

export default function SettingsPage() {
  return (
    <>
      <Header />
      <main>
        <GoldRateSettings />
      </main>
    </>
  );
}
