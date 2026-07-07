'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import {
  DEFAULT_STORE_SETTINGS,
  formatMoney,
  type FormatMoneyOptions,
  type StoreSettings,
} from '@/lib/store-settings'

// Holds the live WooCommerce currency settings for the whole app. Fetched once
// server-side in the root layout (fetchStoreSettings) and injected here, so every
// client consumer formats money with the SAME live Woo currency — no per-component
// fetching, no hardcoded £/$ for dynamic product prices.

const StoreSettingsContext = createContext<StoreSettings>(DEFAULT_STORE_SETTINGS)

export function StoreSettingsProvider({
  settings,
  children,
}: {
  settings: StoreSettings
  children: ReactNode
}) {
  return <StoreSettingsContext.Provider value={settings}>{children}</StoreSettingsContext.Provider>
}

/** Read the raw live store settings (currency code, symbol, separators…). */
export function useStoreSettings(): StoreSettings {
  return useContext(StoreSettingsContext)
}

/**
 * Money formatter bound to the live Woo currency. Prefer this over any
 * `${currency}${n.toFixed(2)}` template so prices follow WooCommerce everywhere.
 *
 *   const fmt = useMoney()
 *   fmt(95)                 // "$95.00"
 *   fmt(6100, { decimals: 0 }) // "$6,100"
 */
export function useMoney(): (amount: number, opts?: FormatMoneyOptions) => string {
  const settings = useStoreSettings()
  return useCallback(
    (amount: number, opts?: FormatMoneyOptions) => formatMoney(amount, settings, opts),
    [settings],
  )
}

/** The bare currency symbol, when a raw symbol (not a full price) is needed. */
export function useCurrencySymbol(): string {
  const settings = useStoreSettings()
  return useMemo(() => settings.currencySymbol, [settings])
}
