import { 
  Order, 
  DelhiveryPincodeResponse, 
  DelhiveryRateResponse, 
  DelhiveryShipmentResponse, 
  DelhiveryTrackingResponse 
} from '../types';

/**
 * Validates whether a customer's postal pincode is serviceable by Delhivery.
 * Calls secure server route /api/delhivery/check-pincode
 */
export async function checkPincodeServiceability(
  pincode: string, 
  isTest = false
): Promise<DelhiveryPincodeResponse> {
  const cleanPin = pincode.replace(/\D/g, '').trim();
  if (cleanPin.length !== 6) {
    return {
      success: false,
      serviceable: false,
      pincode: cleanPin,
      message: 'Please enter a valid 6-digit postal pincode.'
    };
  }

  try {
    const response = await fetch(`/api/delhivery?action=check-pincode&pincode=${cleanPin}&test=${isTest ? 'true' : 'false'}`);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        serviceable: false,
        pincode: cleanPin,
        message: errData.message || `Service check failed (Status ${response.status})`
      };
    }
    return await response.json();
  } catch (err: any) {
    console.error('Pincode check network error:', err);
    return {
      success: false,
      serviceable: true, // fallback to standard check
      pincode: cleanPin,
      message: 'Network error checking pincode. Standard delivery remains available.'
    };
  }
}

/**
 * Calculates shipping charges using Delhivery Shipping Charge API.
 * Calls secure server route /api/delhivery/calculate-shipping
 */
export async function calculateShippingCharges(params: {
  pincode: string;
  weightGrams?: number;
  isCod?: boolean;
  test?: boolean;
}): Promise<DelhiveryRateResponse> {
  try {
    const response = await fetch('/api/delhivery?action=calculate-shipping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...params, action: 'calculate-shipping' })
    });
    if (!response.ok) {
      return {
        success: true,
        shippingCharge: 0,
        isComplimentary: true,
        message: 'Complimentary shipping applied.'
      };
    }
    return await response.json();
  } catch (err) {
    console.warn('Rate calculation fallback:', err);
    return {
      success: true,
      shippingCharge: 0,
      isComplimentary: true,
      message: 'Complimentary shipping applied.'
    };
  }
}

/**
 * Creates a Delhivery shipment for a placed order using pickup location "amrparfumes".
 * Calls secure server route /api/delhivery?action=create-shipment
 */
export async function createDelhiveryShipment(
  order: Order,
  isTestMode = false
): Promise<DelhiveryShipmentResponse> {
  try {
    const response = await fetch('/api/delhivery?action=create-shipment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create-shipment',
        order,
        isTestMode
      })
    });

    const data = await response.json().catch(() => ({
      success: false,
      error: `Server responded with HTTP ${response.status}`
    }));

    if (!response.ok || !data.success) {
      return {
        success: false,
        orderId: order.id,
        pickupLocation: 'amrparfumes',
        status: 'Processing',
        message: data.error || data.message || 'Failed to manifest Delhivery shipment.',
        error: data.error || data.message || 'Shipment creation failed on carrier API.'
      };
    }

    return data;
  } catch (err: any) {
    console.error('Shipment creation error:', err);
    return {
      success: false,
      orderId: order.id,
      pickupLocation: 'amrparfumes',
      status: 'Processing',
      message: err.message || 'Network error connecting to Delhivery shipment API.',
      error: err.message || 'Network error'
    };
  }
}

/**
 * Tracks a package in real time using AWB number or Order ID.
 * Calls secure server route /api/delhivery?action=track-shipment
 */
export async function trackDelhiveryShipment(
  waybillOrOrderId: string
): Promise<DelhiveryTrackingResponse> {
  try {
    const response = await fetch(`/api/delhivery?action=track-shipment&waybill=${encodeURIComponent(waybillOrOrderId.trim())}`);
    const data = await response.json().catch(() => ({
      success: false,
      error: 'Failed to parse tracking response'
    }));

    if (!response.ok || !data.success) {
      return {
        success: false,
        awbNumber: waybillOrOrderId,
        currentStatus: 'Unknown',
        error: data.error || 'Tracking data unavailable.',
        scans: []
      };
    }

    return data;
  } catch (err: any) {
    console.error('Tracking request error:', err);
    return {
      success: false,
      awbNumber: waybillOrOrderId,
      currentStatus: 'Unavailable',
      error: err.message || 'Network error contacting Delhivery tracking.',
      scans: []
    };
  }
}

/**
 * Safely tests Delhivery API authentication, pincode verification, and shipping rate calculations.
 * Does NOT create, book, or manifest any shipment.
 */
export async function testDelhiveryConnection(pincode = '110001'): Promise<any> {
  try {
    const response = await fetch(`/api/delhivery?action=test-connection&pincode=${encodeURIComponent(pincode.trim())}`);
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to contact test connection endpoint.'
    };
  }
}

/**
 * Checks server integration status (token configuration, pickup location).
 */
export async function getDelhiveryStatus(): Promise<{
  isConfigured: boolean;
  tokenPrefix?: string | null;
  pickupLocation: string;
  environment: string;
}> {
  try {
    const response = await fetch('/api/delhivery?action=status');
    if (!response.ok) {
      return {
        isConfigured: false,
        pickupLocation: 'amrparfumes',
        environment: 'production'
      };
    }
    return await response.json();
  } catch {
    return {
      isConfigured: false,
      pickupLocation: 'amrparfumes',
      environment: 'production'
    };
  }
}
