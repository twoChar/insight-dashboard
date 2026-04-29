// Mock dataset generator — 24 months of automotive/industrial sales data
export type SalesRecord = {
  date: string; // YYYY-MM
  region: string;
  segment: string;
  model: string;
  customer: string;
  units_sold: number;
  price: number;
  discount_percent: number;
  revenue: number;
  cost: number;
  inventory: number;
};

export const REGIONS = ["North", "South", "East", "West", "Central"];
export const SEGMENTS = ["Premium", "Mid-Range", "Economy", "Commercial"];
export const MODELS: Record<string, string[]> = {
  Premium: ["Aurora X", "Aurora GT", "Vanguard"],
  "Mid-Range": ["Horizon", "Meridian", "Falcon"],
  Economy: ["Pulse", "Spark", "Nova"],
  Commercial: ["Titan HD", "Hauler Pro"],
};
export const ALL_MODELS = Object.values(MODELS).flat();
export const CUSTOMERS = [
  "Apex Motors", "Velocity Group", "Crown Auto", "Pinnacle Dealers",
  "Summit Mobility", "Vertex Trade", "Horizon Holdings", "Stellar Auto",
  "Meridian Group", "Beacon Distributors",
];

const seed = (s: number) => () => {
  s = (s * 9301 + 49297) % 233280;
  return s / 233280;
};

const rand = seed(42);

const basePriceFor = (segment: string) => {
  switch (segment) {
    case "Premium": return 65000;
    case "Mid-Range": return 32000;
    case "Economy": return 18000;
    case "Commercial": return 48000;
    default: return 25000;
  }
};

const baseCostRatio = 0.72; // cost ~72% of list price

function generateData(): SalesRecord[] {
  const records: SalesRecord[] = [];
  const now = new Date(2026, 3, 1); // April 2026
  for (let m = 23; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthIdx = 23 - m;
    const seasonality = 1 + 0.15 * Math.sin((monthIdx / 12) * Math.PI * 2);
    const trend = 1 + monthIdx * 0.008;

    SEGMENTS.forEach((segment) => {
      MODELS[segment].forEach((model) => {
        REGIONS.forEach((region) => {
          CUSTOMERS.forEach((customer) => {
            if (rand() < 0.55) return; // sparsity
            const basePrice = basePriceFor(segment);
            const price = Math.round(basePrice * (0.95 + rand() * 0.12));
            const units = Math.max(1, Math.round((5 + rand() * 40) * seasonality * trend));
            // discount logic: bigger customers / commercial get more
            let discount = 4 + rand() * 10;
            if (customer === "Apex Motors" || customer === "Velocity Group") discount += 5 + rand() * 6;
            if (segment === "Commercial") discount += 3;
            if (segment === "Economy") discount -= 2;
            // anomalies
            if (rand() < 0.04) discount += 12 + rand() * 8;
            discount = Math.max(0, Math.min(35, discount));
            const revenue = Math.round(units * price * (1 - discount / 100));
            const cost = Math.round(units * price * baseCostRatio);
            const inventory = Math.round((10 + rand() * 200) * (segment === "Premium" ? 0.6 : 1));
            records.push({
              date: dateStr, region, segment, model, customer,
              units_sold: units, price, discount_percent: +discount.toFixed(1),
              revenue, cost, inventory,
            });
          });
        });
      });
    });
  }
  return records;
}

export const SALES_DATA: SalesRecord[] = generateData();

export const formatCurrency = (n: number, compact = true) => {
  if (compact) {
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  }
  return `$${n.toLocaleString()}`;
};

export const formatNumber = (n: number) => {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

export const formatPct = (n: number) => `${n.toFixed(1)}%`;
