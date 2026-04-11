// hooks/use-share-intent.ts — Detect incoming share intent data on Android
// See CLAUDE.md "Android Share Intent" for notes on limitations.

import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

export interface ShareIntentData {
  /** The URL if a URL was shared, otherwise null */
  url: string | null;
  /** Alias for url — pre-populates the input field */
  text: string | null;
  /** True if intent data has been consumed (avoid double-navigation) */
  consumed: boolean;
}

/**
 * Detects when the app is opened via the Android Share menu.
 *
 * Works reliably for URL shares from Chrome and most Android browsers.
 * For plain-text shares, the `text` field will contain the shared URL if
 * the system encodes it as the intent data URI; otherwise the user must
 * paste manually. A custom native module is required for full text capture.
 *
 * Must only be called once at the root layout level.
 */
export function useShareIntent(): ShareIntentData & { consume: () => void } {
  const [data, setData] = useState<ShareIntentData>({
    url: null,
    text: null,
    consumed: false,
  });

  const consume = () => setData((prev) => ({ ...prev, consumed: true }));

  useEffect(() => {
    // Cold start — app opened directly from the share sheet
    Linking.getInitialURL().then((url) => {
      if (url && !isInternalRoute(url)) {
        setData({ url, text: url, consumed: false });
      }
    });

    // Warm start — app was already running and a share was made
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url && !isInternalRoute(url)) {
        setData({ url, text: url, consumed: false });
      }
    });

    return () => sub.remove();
  }, []);

  return { ...data, consume };
}

/** Returns true for Expo Router internal deep links that shouldn't trigger the share handler. */
function isInternalRoute(url: string): boolean {
  return url.startsWith('exp://') || url.startsWith('miamshare://');
}
