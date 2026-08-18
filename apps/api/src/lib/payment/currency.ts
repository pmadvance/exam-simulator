let cachedUsdToMyr: { rate: number; expiresAt: number } | null = null;

export async function getUsdToMyrRate() {
  const now = Date.now();
  if (cachedUsdToMyr && cachedUsdToMyr.expiresAt > now) {
    return cachedUsdToMyr.rate;
  }

  const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=MYR");
  if (!response.ok) {
    throw new Error(`Unable to load USD to MYR exchange rate (${response.status}).`);
  }

  const data = (await response.json()) as { rates?: { MYR?: number } };
  const rate = Number(data.rates?.MYR ?? 0);
  if (!rate || Number.isNaN(rate)) {
    throw new Error("Unable to load USD to MYR exchange rate.");
  }

  cachedUsdToMyr = {
    rate,
    expiresAt: now + 60 * 60 * 1000,
  };
  return rate;
}

export async function convertUsdToMyr(amountUsd: number) {
  const rate = await getUsdToMyrRate();
  return Math.round(amountUsd * rate * 100) / 100;
}
