import { prisma } from "@hisab/db";

type ForeignCurrency = "USD" | "GBP" | "EUR";

const CURRENCIES: ForeignCurrency[] = ["USD", "GBP", "EUR"];

function today(): string {
  return new Date().toISOString().split("T")[0];
}

async function fetchRateFromApi(base: ForeignCurrency): Promise<number> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);
  const data = await res.json() as { rates?: Record<string, number> };
  const rate = data?.rates?.NPR;
  if (!rate) throw new Error(`NPR rate not found in response for ${base}`);
  return rate;
}

// Get NPR rate for a base currency — returns cached value if already fetched today
export async function getNPRRate(base: ForeignCurrency): Promise<number> {
  const date = today();

  const cached = await prisma.exchangeRate.findFirst({
    where: { base, date },
  });
  if (cached) return cached.rateToNPR;

  const rateToNPR = await fetchRateFromApi(base);

  // Upsert — concurrent requests may race; ignore unique constraint violation
  await prisma.exchangeRate
    .create({ data: { base, date, rateToNPR } })
    .catch(() => {});

  return rateToNPR;
}

// Get NPR rates for all foreign currencies — used by dashboard and exchange-rates endpoint
export async function getAllNPRRates(): Promise<Record<ForeignCurrency, number>> {
  const date = today();

  const cached = await prisma.exchangeRate.findMany({
    where: { base: { in: CURRENCIES }, date },
  });

  const rates: Partial<Record<ForeignCurrency, number>> = {};
  for (const row of cached) {
    rates[row.base as ForeignCurrency] = row.rateToNPR;
  }

  // Fetch any missing currencies
  await Promise.all(
    CURRENCIES.filter((c) => !rates[c]).map(async (c) => {
      rates[c] = await getNPRRate(c);
    })
  );

  return rates as Record<ForeignCurrency, number>;
}
