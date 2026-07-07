'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { DISABLED_BUNDLE_CONFIG, type BundleConfig } from '@/lib/bundle-discounts'

// Holds the live bundle-discount config for the whole app. The value is fetched
// once server-side in the root layout (fetchBundleConfig) and injected here, so
// every client consumer (ticket selector, cart, checkout) reads the SAME rules
// synchronously — no per-component fetching, no flash of wrong prices.

const BundleConfigContext = createContext<BundleConfig>(DISABLED_BUNDLE_CONFIG)

export function BundleConfigProvider({
  config,
  children,
}: {
  config: BundleConfig
  children: ReactNode
}) {
  return <BundleConfigContext.Provider value={config}>{children}</BundleConfigContext.Provider>
}

/** Read the live bundle-discount config. Defaults to "discounts off". */
export function useBundleConfig(): BundleConfig {
  return useContext(BundleConfigContext)
}
