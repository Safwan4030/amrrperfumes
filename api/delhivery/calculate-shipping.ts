import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDelhiveryToken, getDelhiveryBaseUrl, getDelhiveryHeaders } from './config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const destPincode = String(params?.pincode || params?.d_pin || '').replace(/\D/g, '').trim();
    const originPincode = String(params?.origin_pincode || params?.o_pin || '110001').replace(/\D/g, '').trim();
    const weightGrams = Number(params?.weightGrams || params?.cgm || 500); // Standard 500g package
    const paymentMode = (params?.paymentMode || params?.pt || 'Pre-paid').toLowerCase().includes('cod') ? 'COD' : 'Pre-paid';
    const mode = (params?.mode || params?.md || 'E') === 'S' ? 'S' : 'E'; // Default Express

    if (!destPincode || destPincode.length !== 6) {
      return res.status(400).json({
        success: false,
        shippingCharge: 0,
        isComplimentary: true,
        message: 'Invalid destination pincode.'
      });
    }

    const token = getDelhiveryToken();
    const isDryRun = params?.test === 'true' || params?.test === true;

    // AMRR Perfumes offers complimentary delivery across India
    const isStoreComplimentaryShipping = true;

    if (!token || isDryRun) {
      return res.status(200).json({
        success: true,
        chargeableWeightGrams: weightGrams,
        shippingCharge: isStoreComplimentaryShipping ? 0 : 85,
        estimatedBaseRate: 85,
        grossAmount: 85,
        taxAmount: 15.3,
        isComplimentary: isStoreComplimentaryShipping,
        isSimulation: true,
        message: 'Complimentary Express Delivery via Delhivery.'
      });
    }

    const baseUrl = getDelhiveryBaseUrl();
    const queryParams = new URLSearchParams({
      md: mode,
      ss: 'Delivered',
      d_pin: destPincode,
      o_pin: originPincode,
      cgm: String(weightGrams),
      pt: paymentMode
    });

    const endpoint = `${baseUrl}/api/kinko/v1/invoice/charges/.json?${queryParams.toString()}`;

    const delhiveryRes = await fetch(endpoint, {
      method: 'GET',
      headers: getDelhiveryHeaders()
    });

    if (!delhiveryRes.ok) {
      const errorText = await delhiveryRes.text();
      console.warn(`Delhivery Rate API response (${delhiveryRes.status}):`, errorText);
      return res.status(200).json({
        success: true,
        chargeableWeightGrams: weightGrams,
        shippingCharge: isStoreComplimentaryShipping ? 0 : 90,
        isComplimentary: isStoreComplimentaryShipping,
        message: 'Standard complimentary delivery applied.'
      });
    }

    const rateData = await delhiveryRes.json();
    let calculatedRate = 0;
    let grossAmount = 0;
    let taxAmount = 0;

    if (Array.isArray(rateData) && rateData.length > 0) {
      const primaryRate = rateData[0];
      calculatedRate = Number(primaryRate.total_amount || primaryRate.gross_amount || 0);
      grossAmount = Number(primaryRate.gross_amount || 0);
      taxAmount = Number(primaryRate.tax_data?.total_tax || 0);
    }

    return res.status(200).json({
      success: true,
      chargeableWeightGrams: weightGrams,
      calculatedCourierCharge: calculatedRate,
      shippingCharge: isStoreComplimentaryShipping ? 0 : calculatedRate,
      grossAmount,
      taxAmount,
      isComplimentary: isStoreComplimentaryShipping,
      message: isStoreComplimentaryShipping 
        ? 'Complimentary Express Luxury Delivery on this order.' 
        : `Delhivery standard shipping: ₹${calculatedRate}`
    });
  } catch (error: any) {
    console.error('Error calculating Delhivery rate:', error);
    return res.status(200).json({
      success: true,
      shippingCharge: 0,
      isComplimentary: true,
      message: 'Complimentary shipping applied.'
    });
  }
}
