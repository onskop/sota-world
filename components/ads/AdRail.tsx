'use client';

import { useEffect } from 'react';

export function AdRail() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
      (window as any).adsbygoogle.push({});
    }
  }, []);

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-[0.3em] text-slate-400">Sponsored Signals</h3>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-0000000000000000"
        data-ad-slot="rail-1"
        data-ad-format="rectangle"
      ></ins>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-0000000000000000"
        data-ad-slot="rail-2"
        data-ad-format="rectangle"
      ></ins>
    </div>
  );
}
