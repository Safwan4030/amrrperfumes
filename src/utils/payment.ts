export interface CreateOrderParams {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const getRazorpayKeyId = (): string => {
  return (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || "rzp_live_TMjuQnCrx4Mi1f";
};

/**
 * Creates a Razorpay order by calling the secure server-side backend endpoint (/api/create-order).
 */
export async function createRazorpayOrder(params: CreateOrderParams) {
  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 150)}`);
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to create Razorpay order on server');
  }

  return {
    ...data,
    key_id: data.key_id || getRazorpayKeyId()
  };
}

/**
 * Verifies the Razorpay payment signature by calling the secure server-side backend endpoint (/api/verify-payment).
 */
export async function verifyRazorpayPayment(params: VerifyPaymentParams) {
  const response = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 150)}`);
  }

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Payment signature verification failed on server');
  }

  return data;
}

/**
 * Dynamically loads the Razorpay checkout script on the client.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

