'use client';

import { useEffect } from 'react';

interface Props {
  slot: string;
}

export function AdInline({ slot }: Props) {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
      (window as any).adsbygoogle.push({});
    }
  }, []);

  return (
    <div className="ads-wrapper">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-0000000000000000"
        data-ad-slot={`inline-${slot}`}
        data-ad-format="fluid"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
