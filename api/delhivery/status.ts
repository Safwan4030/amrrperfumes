import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDelhiveryToken, getDelhiveryPickupLocation, getDelhiveryBaseUrl } from './config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = getDelhiveryToken();
  const pickupLocation = getDelhiveryPickupLocation();
  const baseUrl = getDelhiveryBaseUrl();
  const envName = process.env.DELHIVERY_ENV || 'production';

  return res.status(200).json({
    success: true,
    isConfigured: !!token,
    tokenPrefix: token ? `${token.substring(0, 6)}...${token.slice(-4)}` : null,
    pickupLocation,
    baseUrl,
    environment: envName,
    serverTimestamp: new Date().toISOString()
  });
}
