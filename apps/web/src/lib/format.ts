export function formatPrice(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC", // periods are calendar months in UTC
  });
}

const METRIC_LABELS: Record<string, string> = {
  api_calls: "API calls",
  storage_mb: "Storage (MB)",
};

export function metricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}