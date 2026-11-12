export type Currency = 'INR';

export const CURRENCY_RATES: Record<Currency, { symbol: string; rate: number }> = {
  INR: { symbol: '₹', rate: 1 }
};

export function formatPrice(amountInINR: number, _currency?: Currency): string {
  return `₹${amountInINR.toLocaleString('en-IN')}`;
}

export function generateOrderId(existingOrders?: { id: string }[]): string {
  let highest = 1000;

  if (Array.isArray(existingOrders) && existingOrders.length > 0) {
    existingOrders.forEach(o => {
      const num = parseInt(String(o.id).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num >= 1000 && num < 1000000) {
        if (num > highest) highest = num;
      }
    });
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('amrr_last_order_id');
      if (stored) {
        const num = parseInt(stored.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num >= 1000 && num < 1000000) {
          if (num > highest) highest = num;
        }
      }
    } catch {}
  }

  const nextId = String(highest + 1);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('amrr_last_order_id', nextId);
    } catch {}
  }

  return nextId;
}

export function formatOrderId(id: string | number): string {
  if (!id) return '1001';
  const str = String(id).trim();
  if (/^\d{4,7}$/.test(str)) {
    return str;
  }
  if (/^#\d{4,7}$/.test(str)) {
    return str.replace('#', '');
  }
  if (str.includes('420158') || str.startsWith('FP-')) {
    return '1001';
  }
  if (str.startsWith('order_')) {
    const digits = str.replace(/\D/g, '');
    if (digits.length >= 4) return digits.slice(-4);
    return '1001';
  }
  return str;
}

export function estimateDeliveryDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
