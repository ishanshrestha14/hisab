import { Hono } from "hono";
import { getAllNPRRates } from "../lib/exchange-rate";

const exchangeRates = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// GET /api/exchange-rates/latest
// Returns today's NPR rates for USD, GBP, EUR (cached in DB)
exchangeRates.get("/latest", async (c) => {
  const rates = await getAllNPRRates();
  return c.json(rates);
});

export default exchangeRates;
