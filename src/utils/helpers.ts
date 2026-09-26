export type Currency = 'INR';

export const CURRENCY_RATES: Record<Currency, { symbol: string; rate: number }> = {
  INR: { symbol: '₹', rate: 1 }
};

export function formatPrice(amountInINR: number, _currency?: Currency): string {
  return `₹${amountInINR.toLocaleString('en-IN')}`;
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `FP-${timestamp}-${randomStr}`;
}

export function estimateDeliveryDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
