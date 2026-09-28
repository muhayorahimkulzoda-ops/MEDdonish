export const COMMERCE_CHANNELS = ['manual_telegram', 'web_payment'] as const;
export type CommerceChannel = (typeof COMMERCE_CHANNELS)[number];

export function isPremiumPrices(prices: { amountMinor: number }[]) {
  return prices.some((price) => price.amountMinor > 0);
}

export function displayAmount(amountMinor: number) {
  const amount = amountMinor >= 1000 ? Math.round(amountMinor / 100) : amountMinor;
  return amount;
}

export function resolveCommerceChannel(value?: string | null): CommerceChannel {
  return value === 'web_payment' ? 'web_payment' : 'manual_telegram';
}

export function publicTelegramContactUrl(raw?: string | null) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    if (host !== 't.me' && host !== 'telegram.me') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}
