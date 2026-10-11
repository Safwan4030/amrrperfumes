import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDelhiveryToken, getDelhiveryPickupLocation, getDelhiveryBaseUrl, getDelhiveryHeaders } from './config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const { order, isTestMode = false } = req.body || {};

    if (!order || !order.id || !order.shippingDetails) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order payload. Missing order ID or shipping details.'
      });
    }

    const { shippingDetails, items = [], totalAmount, paymentMethod = 'Prepaid' } = order;
    const cleanPin = String(shippingDetails.pincode || '').replace(/\D/g, '').trim();

    if (!cleanPin || cleanPin.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shipping pincode. A 6-digit valid postal pincode is required for Delhivery shipment creation.'
      });
    }

    const token = getDelhiveryToken();
    const pickupLocation = getDelhiveryPickupLocation(); // "amrparfumes"
    const isCod = paymentMethod.toLowerCase().includes('cod');
    const totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
    const productsDescription = items.map((i: any) => `${i.product?.name || 'AMRR Fragrance'} 50ml (Qty: ${i.quantity || 1})`).join(', ');

    // Handle Safe Test / Dry-run Mode or Missing Token
    if (isTestMode || !token) {
      const simulatedAwb = `AMRR-DELH-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      console.log(`[Delhivery Integration] Generated ${isTestMode ? 'Test Mode' : 'Fallback Simulation'} AWB: ${simulatedAwb} for pickup location: "${pickupLocation}"`);

      return res.status(200).json({
        success: true,
        isSimulation: true,
        awbNumber: simulatedAwb,
        orderId: order.id,
        pickupLocation,
        status: 'Manifested',
        trackingUrl: `https://www.delhivery.com/track/package/${simulatedAwb}`,
        message: !token 
          ? `Simulated Delhivery shipment generated. Configure DELHIVERY_API_TOKEN in environment variables for live carrier dispatch.` 
          : `Test Mode: Simulated Delhivery shipment successfully created without live carrier dispatch.`,
        raw: {
          simulated: true,
          pickup_location: pickupLocation,
          awb: simulatedAwb,
          created_at: new Date().toISOString()
        }
      });
    }

    // Prepare Official Delhivery B2C Shipment Manifest Payload
    const shipmentData = {
      name: shippingDetails.fullName,
      add: shippingDetails.address,
      pin: cleanPin,
      city: shippingDetails.city,
      state: shippingDetails.state,
      country: 'India',
      phone: String(shippingDetails.phone).replace(/\D/g, '').slice(-10),
      order: order.id,
      payment_mode: isCod ? 'COD' : 'Prepaid',
      return_pin: '',
      return_city: '',
      return_phone: '',
      return_add: '',
      return_state: '',
      return_country: '',
      products_desc: productsDescription.substring(0, 250),
      hsn_code: '330300', // HSN code for perfumes & toilet waters
      cod_amount: isCod ? String(totalAmount || 0) : '0',
      order_date: new Date().toISOString(),
      total_amount: Number(totalAmount || 0),
      seller_add: 'AMRR Perfumes Logistics Hub',
      seller_name: 'AMRR Perfumes',
      seller_inv: order.id,
      quantity: totalQty || 1,
      waybill: '', // Auto-assigned by Delhivery
      shipment_width: 10,
      shipment_height: 15,
      shipment_length: 10,
      weight: Math.max(500, totalQty * 450), // Standard 450-500g per packaged bottle
      seller_gst_tin: '',
      shipping_mode: 'Express',
      address_type: 'home'
    };

    const delhiveryPayload = {
      shipments: [shipmentData],
      pickup_location: {
        name: pickupLocation // "amrparfumes"
      }
    };

    const baseUrl = getDelhiveryBaseUrl();
    const endpoint = `${baseUrl}/api/cmu/create.json`;

    // Delhivery expects url-encoded string: format=json&data=<json_string>
    const formBody = new URLSearchParams();
    formBody.append('format', 'json');
    formBody.append('data', JSON.stringify(delhiveryPayload));

    console.log(`[Delhivery Integration] Sending shipment creation request to ${endpoint} with pickup location: "${pickupLocation}"`);

    const delhiveryRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBody.toString()
    });

    const responseText = await delhiveryRes.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    if (!delhiveryRes.ok) {
      console.error(`Delhivery Shipment Creation Error (${delhiveryRes.status}):`, responseText);
      return res.status(200).json({
        success: false,
        error: responseData?.rmk || responseData?.error || `Delhivery server returned error HTTP ${delhiveryRes.status}. Check your DELHIVERY_API_TOKEN and pickup location ("${pickupLocation}").`,
        raw: responseData
      });
    }

    // Check if packages array contains successful waybill
    const packages = responseData?.packages || [];
    const firstPkg = packages[0];
    const waybill = firstPkg?.waybill || responseData?.upload_wbn || '';
    const pkgStatus = firstPkg?.status || (responseData?.success ? 'Success' : 'Failed');

    if (!waybill || pkgStatus.toLowerCase() === 'fail' || pkgStatus.toLowerCase() === 'failed') {
      const errorMsg = firstPkg?.remarks?.join(', ') || responseData?.rmk || responseData?.error || 'Delhivery could not allocate a waybill for this destination or pickup location.';
      console.error('Delhivery Package Creation Failed:', errorMsg, responseData);
      
      return res.status(200).json({
        success: false,
        error: errorMsg,
        raw: responseData
      });
    }

    console.log(`[Delhivery Integration] Shipment successfully manifested with AWB: ${waybill} for Order: ${order.id}`);

    return res.status(200).json({
      success: true,
      awbNumber: waybill,
      orderId: order.id,
      pickupLocation,
      status: 'Manifested',
      trackingUrl: `https://www.delhivery.com/track/package/${waybill}`,
      message: `Delhivery shipment created successfully. Waybill: ${waybill}`,
      packagesCount: responseData?.package_count || 1,
      raw: responseData
    });
  } catch (error: any) {
    console.error('Exception in create-shipment:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Server error while contacting Delhivery shipment creation API.'
    });
  }
}
