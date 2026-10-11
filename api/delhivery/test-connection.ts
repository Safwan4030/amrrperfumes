import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDelhiveryToken, getDelhiveryPickupLocation, getDelhiveryBaseUrl, getDelhiveryHeaders } from './config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = getDelhiveryToken();
  const pickupLocation = getDelhiveryPickupLocation();
  const baseUrl = getDelhiveryBaseUrl();
  const env = process.env.DELHIVERY_ENV || 'production';

  const testPincode = String(req.query?.pincode || req.body?.pincode || '110001').replace(/\D/g, '').trim();

  // Test 1: Check token presence and pickup location
  const tokenConfigured = Boolean(token && token.length > 10);
  const tokenMasked = tokenConfigured ? `${token.substring(0, 6)}...${token.slice(-4)}` : null;

  const results: any = {
    timestamp: new Date().toISOString(),
    serverConfig: {
      tokenPresent: tokenConfigured,
      tokenLength: token.length,
      tokenMasked,
      pickupLocation,
      pickupLocationVerified: pickupLocation === 'amrparfumes',
      environment: env,
      baseUrl
    },
    tests: {
      auth: { status: 'pending', success: false },
      pincodeServiceability: { status: 'pending', success: false, pincode: testPincode },
      shippingRates: { status: 'pending', success: false }
    }
  };

  if (!tokenConfigured) {
    results.tests.auth = {
      status: 'failed',
      success: false,
      error: 'DELHIVERY_API_TOKEN is missing or not configured in server environment.'
    };
    return res.status(200).json(results);
  }

  // Test 2: Live Delhivery API Pincode serviceability & Authentication test
  try {
    const pinEndpoint = `${baseUrl}/c/api/pin-codes/json/?filter_codes=${testPincode}`;
    const pinRes = await fetch(pinEndpoint, {
      method: 'GET',
      headers: getDelhiveryHeaders()
    });

    const pinStatus = pinRes.status;
    const pinText = await pinRes.text();
    let pinJson: any = null;
    try {
      pinJson = JSON.parse(pinText);
    } catch {
      pinJson = { raw: pinText };
    }

    if (pinRes.ok) {
      const deliveryCodes = pinJson?.delivery_codes || [];
      const match = deliveryCodes.find((item: any) => String(item?.postal_code?.pin) === testPincode);
      const postObj = match?.postal_code;

      results.tests.auth = {
        status: 'passed',
        success: true,
        httpStatus: pinStatus,
        message: 'Delhivery API token successfully authenticated.'
      };

      results.tests.pincodeServiceability = {
        status: 'passed',
        success: true,
        httpStatus: pinStatus,
        pincode: testPincode,
        serviceable: Boolean(match && (postObj?.pre_paid === 'Y' || postObj?.cod === 'Y')),
        city: postObj?.city || postObj?.district || 'Verified Zone',
        district: postObj?.district || '',
        state: postObj?.state_code || '',
        prepaid: postObj?.pre_paid === 'Y',
        cod: postObj?.cod === 'Y' || postObj?.cash === 'Y',
        rawMatch: postObj
      };
    } else {
      results.tests.auth = {
        status: 'failed',
        success: false,
        httpStatus: pinStatus,
        error: `Delhivery API returned HTTP ${pinStatus}. Token may be invalid or unauthorized.`,
        raw: pinJson
      };
      results.tests.pincodeServiceability = {
        status: 'failed',
        success: false,
        httpStatus: pinStatus,
        error: `Pincode request failed with HTTP ${pinStatus}`
      };
    }
  } catch (err: any) {
    results.tests.auth = {
      status: 'error',
      success: false,
      error: err.message || 'Network error contacting Delhivery API.'
    };
  }

  // Test 3: Shipping Rate API test (Safe read-only calculation, does NOT manifest)
  try {
    const rateEndpoint = `${baseUrl}/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=${testPincode}&o_pin=110001&cgm=500&pt=Pre-paid`;
    const rateRes = await fetch(rateEndpoint, {
      method: 'GET',
      headers: getDelhiveryHeaders()
    });

    const rateStatus = rateRes.status;
    const rateText = await rateRes.text();
    let rateJson: any = null;
    try {
      rateJson = JSON.parse(rateText);
    } catch {
      rateJson = { raw: rateText };
    }

    if (rateRes.ok && Array.isArray(rateJson) && rateJson.length > 0) {
      const primary = rateJson[0];
      results.tests.shippingRates = {
        status: 'passed',
        success: true,
        httpStatus: rateStatus,
        calculatedRate: primary.total_amount || primary.gross_amount,
        grossAmount: primary.gross_amount,
        taxAmount: primary.tax_data?.total_tax,
        zone: primary.zone,
        chargedWeight: primary.charged_weight,
        supported: true
      };
    } else {
      results.tests.shippingRates = {
        status: rateRes.ok ? 'passed' : 'warning',
        success: rateRes.ok,
        httpStatus: rateStatus,
        supported: rateRes.ok,
        raw: rateJson,
        message: rateRes.ok ? 'Rate API responded with standard charges data.' : `Rate API returned HTTP ${rateStatus}`
      };
    }
  } catch (err: any) {
    results.tests.shippingRates = {
      status: 'error',
      success: false,
      error: err.message || 'Error checking rate calculation API.'
    };
  }

  return res.status(200).json({
    success: results.tests.auth.success && results.tests.pincodeServiceability.success,
    data: results
  });
}
