import { NextRequest, NextResponse } from "next/server";

const FALLBACK_CURRENCY_BY_COUNTRY: Record<string, string> = {
  MY: "MYR",
  SG: "SGD",
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
  CA: "CAD",
  JP: "JPY",
  KR: "KRW",
  CN: "CNY",
  HK: "HKD",
  IN: "INR",
  ID: "IDR",
  TH: "THB",
  VN: "VND",
  PH: "PHP",
  BN: "BND",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  IE: "EUR",
};

const SUPPORTED_CURRENCIES = new Set([
  "MYR",
  "USD",
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
]);

function getCurrencySymbol(code: string) {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

export async function GET(request: NextRequest) {
  const country = (request.headers.get("x-vercel-ip-country") || "US").toUpperCase();
  const requestedCurrency = request.nextUrl.searchParams.get("currency")?.toUpperCase();
  const detectedCurrency = FALLBACK_CURRENCY_BY_COUNTRY[country] ?? "USD";
  const localCurrency = requestedCurrency && SUPPORTED_CURRENCIES.has(requestedCurrency)
    ? requestedCurrency
    : detectedCurrency;

  try {
    const rateResponse = await fetch("https://api.frankfurter.app/latest?from=USD", {
      next: { revalidate: 86400 },
    });

    if (!rateResponse.ok) {
      throw new Error(`Rates API failed with ${rateResponse.status}`);
    }

    const data = (await rateResponse.json()) as {
      base: string;
      date: string;
      rates: Record<string, number>;
    };

    const rate = localCurrency === "USD"
      ? 1
      : Number(data.rates[localCurrency] ?? 0);

    return NextResponse.json({
      baseCurrency: "USD",
      currency: rate > 0 ? localCurrency : "USD",
      rate: rate > 0 ? rate : 1,
      symbol: getCurrencySymbol(rate > 0 ? localCurrency : "USD"),
      date: data.date,
      source: "frankfurter.app",
      country,
    }, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch {
    const fallbackCurrency = requestedCurrency && SUPPORTED_CURRENCIES.has(requestedCurrency)
      ? requestedCurrency
      : "USD";
    const fallbackRate = fallbackCurrency === "USD" ? 1 : 1;
    return NextResponse.json({
      baseCurrency: "USD",
      currency: fallbackCurrency,
      rate: fallbackRate,
      symbol: getCurrencySymbol(fallbackCurrency),
      date: new Date().toISOString().slice(0, 10),
      source: "fallback",
      country,
    });
  }
}
