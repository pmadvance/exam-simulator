"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type CurrencyState = {
  baseCurrency: "USD";
  supportedCurrencies: string[];
  currency: string;
  rate: number;
  symbol: string;
  loading: boolean;
  setCurrency: (currency: string) => void;
  formatUsd: (amountUsd: number) => string;
  formatLocalFromUsd: (amountUsd: number) => string;
  convertFromUsd: (amountUsd: number) => number;
};

const CurrencyContext = createContext<CurrencyState | null>(null);
const CURRENCY_STORAGE_KEY = "pm_selected_currency";
const SUPPORTED_CURRENCIES = [
  "USD",
  "MYR",
  "SGD",
  "GBP",
  "AUD",
  "EUR",
  "CAD",
  "NZD",
  "JPY",
  "KRW",
  "CNY",
  "HKD",
  "INR",
  "IDR",
  "THB",
  "VND",
  "PHP",
  "BND",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
] as const;

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState("USD");
  const [rate, setRate] = useState(1);
  const [symbol, setSymbol] = useState("$");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrency() {
      try {
        const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
        const query = savedCurrency ? `?currency=${encodeURIComponent(savedCurrency)}` : "";
        const response = await fetch(`/currency${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load currency");
        const data = (await response.json()) as {
          currency: string;
          rate: number;
          symbol: string;
        };
        if (!cancelled) {
          setCurrency(data.currency || "USD");
          setRate(data.rate || 1);
          setSymbol(data.symbol || "$");
        }
      } catch {
        if (!cancelled) {
          setCurrency("USD");
          setRate(1);
          setSymbol("$");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCurrency();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateCurrency = useCallback(async (nextCurrency: string) => {
    const normalized = nextCurrency.toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(normalized as (typeof SUPPORTED_CURRENCIES)[number])) return;

    localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
    setLoading(true);
    try {
      const response = await fetch(`/currency?currency=${encodeURIComponent(normalized)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load currency");
      const data = (await response.json()) as {
        currency: string;
        rate: number;
        symbol: string;
      };
      setCurrency(data.currency || "USD");
      setRate(data.rate || 1);
      setSymbol(data.symbol || "$");
    } catch {
      setCurrency("USD");
      setRate(1);
      setSymbol("$");
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<CurrencyState>(() => ({
    baseCurrency: "USD",
    supportedCurrencies: [...SUPPORTED_CURRENCIES],
    currency,
    rate,
    symbol,
    loading,
    setCurrency: updateCurrency,
    formatUsd: (amountUsd: number) => formatCurrency(amountUsd, "USD"),
    convertFromUsd: (amountUsd: number) => amountUsd * rate,
    formatLocalFromUsd: (amountUsd: number) => {
      const converted = amountUsd * rate;
      return formatCurrency(converted, currency);
    },
  }), [currency, rate, symbol, loading, updateCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
