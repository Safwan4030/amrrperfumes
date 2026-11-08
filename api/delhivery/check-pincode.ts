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
    const rawPincode = (req.query?.pincode as string) || (req.body?.pincode as string) || '';
    const cleanPin = String(rawPincode).replace(/\D/g, '').trim();

    if (!cleanPin || cleanPin.length !== 6) {
      return res.status(400).json({
        success: false,
        serviceable: false,
        pincode: cleanPin,
        message: 'Please provide a valid 6-digit Indian postal pincode.'
      });
    }

    const token = getDelhiveryToken();
    const isDryRun = req.query?.test === 'true' || req.body?.test === true;

    // If no token is configured or test simulation is requested
    if (!token || isDryRun) {
      const isKnownServiceable = !['000000', '999999'].includes(cleanPin);
      return res.status(200).json({
        success: true,
        serviceable: isKnownServiceable,
        pincode: cleanPin,
        prepaidAvailable: true,
        codAvailable: true,
        isOda: false,
        isSimulation: true,
        message: token 
          ? 'Simulation mode active (valid test pincode verified).'
          : 'Delhivery token not set. Simulated serviceability active for preview.'
      });
    }

    const baseUrl = getDelhiveryBaseUrl();
    const endpoint = `${baseUrl}/c/api/pin-codes/json/?filter_codes=${cleanPin}`;

    const delhiveryRes = await fetch(endpoint, {
      method: 'GET',
      headers: getDelhiveryHeaders()
    });

    if (!delhiveryRes.ok) {
      const errorText = await delhiveryRes.text();
      console.error(`Delhivery Pincode API returned ${delhiveryRes.status}:`, errorText);
      return res.status(200).json({
        success: false,
        serviceable: false,
        pincode: cleanPin,
        message: `Delhivery service check returned HTTP ${delhiveryRes.status}.`,
        error: errorText
      });
    }

    const data = await delhiveryRes.json();
    const deliveryCodes = data?.delivery_codes || [];
    const matched = deliveryCodes.find((item: any) => {
      const pinObj = item?.postal_code;
      return pinObj && String(pinObj.pin) === cleanPin;
    });

    if (!matched || !matched.postal_code) {
      return res.status(200).json({
        success: true,
        serviceable: false,
        pincode: cleanPin,
        message: 'Delhivery does not currently deliver to this pincode.'
      });
    }

    const pinDetails = matched.postal_code;
    const isPrepaid = pinDetails.pre_paid === 'Y' || pinDetails.pre_paid === true;
    const isCod = pinDetails.cod === 'Y' || pinDetails.cod === true || pinDetails.cash === 'Y';
    const isServiceable = isPrepaid || isCod;

    return res.status(200).json({
      success: true,
      serviceable: isServiceable,
      pincode: cleanPin,
      district: pinDetails.district || '',
      city: pinDetails.city || pinDetails.district || '',
      state: pinDetails.state_code || '',
      prepaidAvailable: isPrepaid,
      codAvailable: isCod,
      isOda: pinDetails.is_oda === 'Y',
      message: isServiceable 
        ? 'Pincode is serviceable by Delhivery Express.' 
        : 'Pincode is currently non-serviceable.'
    });
  } catch (error: any) {
    console.error('Error verifying Delhivery pincode:', error);
    return res.status(500).json({
      success: false,
      serviceable: false,
      message: error?.message || 'Failed to verify pincode serviceability on server.'
    });
  }
}
