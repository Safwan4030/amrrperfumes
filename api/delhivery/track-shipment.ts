import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDelhiveryToken, getDelhiveryPickupLocation, getDelhiveryBaseUrl, getDelhiveryHeaders } from './config';

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
    const rawWaybill = (req.query?.waybill as string) || (req.query?.awb as string) || (req.body?.waybill as string) || (req.body?.awb as string) || '';
    const cleanAwb = String(rawWaybill).trim();

    if (!cleanAwb) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid AWB / Waybill number to track.'
      });
    }

    const token = getDelhiveryToken();
    const pickupLocation = getDelhiveryPickupLocation();
    const isSimulatedAwb = cleanAwb.startsWith('AMRR-DELH-') || cleanAwb.startsWith('DELH-TEST-') || cleanAwb.startsWith('TEST-');

    // If it's a simulated AWB or no token is configured
    if (isSimulatedAwb || !token) {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      return res.status(200).json({
        success: true,
        awbNumber: cleanAwb,
        currentStatus: 'In Transit',
        statusType: 'UD',
        statusLocation: 'Delhi Express Logistics Hub',
        statusDateTime: new Date().toISOString(),
        statusInstructions: 'Package has been picked up from amrparfumes and is in transit to destination hub.',
        expectedDelivery: 'Within 48-72 Hours',
        pickupDate: formattedDate,
        origin: pickupLocation,
        destination: 'Customer Postal Destination',
        isSimulation: true,
        scans: [
          {
            scanDateTime: new Date(Date.now() - 3600000 * 2).toISOString(),
            scanType: 'PP',
            scan: 'Manifest Generated & Picked Up',
            location: `${pickupLocation} Dispatch Center`,
            instructions: 'Shipment handed over to Delhivery Courier Associate.'
          },
          {
            scanDateTime: new Date(Date.now() - 3600000).toISOString(),
            scanType: 'UD',
            scan: 'In Transit',
            location: 'Central Express Processing Facility',
            instructions: 'Bagged and in transit to destination hub.'
          }
        ]
      });
    }

    const baseUrl = getDelhiveryBaseUrl();
    const endpoint = `${baseUrl}/api/v1/packages/json/?waybill=${encodeURIComponent(cleanAwb)}`;

    console.log(`[Delhivery Integration] Fetching live tracking from ${endpoint}`);

    const delhiveryRes = await fetch(endpoint, {
      method: 'GET',
      headers: getDelhiveryHeaders()
    });

    if (!delhiveryRes.ok) {
      const errorText = await delhiveryRes.text();
      console.error(`Delhivery Tracking API Error (${delhiveryRes.status}):`, errorText);
      return res.status(200).json({
        success: false,
        awbNumber: cleanAwb,
        currentStatus: 'Unknown',
        error: `Delhivery tracking returned HTTP ${delhiveryRes.status}.`,
        scans: []
      });
    }

    const trackingData = await delhiveryRes.json();
    const shipmentList = trackingData?.ShipmentData || [];
    const firstShipment = shipmentList[0]?.Shipment;

    if (!firstShipment) {
      return res.status(200).json({
        success: false,
        awbNumber: cleanAwb,
        currentStatus: 'Not Found',
        error: 'No active Delhivery tracking record found for this AWB number yet.',
        scans: []
      });
    }

    const statusObj = firstShipment.Status || {};
    const rawScans = firstShipment.Scans || [];

    const formattedScans = rawScans.map((s: any) => {
      const detail = s?.ScanDetail || {};
      return {
        scanDateTime: detail.ScanDateTime || '',
        scanType: detail.ScanType || '',
        scan: detail.Scan || detail.Instructions || 'In Transit',
        location: detail.ScannedLocation || '',
        instructions: detail.Instructions || ''
      };
    });

    return res.status(200).json({
      success: true,
      awbNumber: firstShipment.AWB || cleanAwb,
      currentStatus: statusObj.Status || 'In Transit',
      statusType: statusObj.StatusType || '',
      statusLocation: statusObj.StatusLocation || '',
      statusDateTime: statusObj.StatusDateTime || '',
      statusInstructions: statusObj.Instructions || '',
      expectedDelivery: firstShipment.ExpectedDeliveryDate || '',
      pickupDate: firstShipment.PickUpDate || '',
      origin: firstShipment.Origin || pickupLocation,
      destination: firstShipment.Destination || '',
      scans: formattedScans,
      raw: firstShipment
    });
  } catch (error: any) {
    console.error('Exception in track-shipment:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Server error while contacting Delhivery tracking API.'
    });
  }
}
