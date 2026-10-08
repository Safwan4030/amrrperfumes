import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_EMAILS = ['amrrperfumes@gmail.com', 'amrrparfumes@gmail.com', 'safwaanvv@gmail.com'];
const ADMIN_PASSCODE = 'amrr2026';

function isAuthorizedAdmin(req: VercelRequest): boolean {
  const adminEmail = (req.headers['x-admin-email'] as string || '').trim().toLowerCase();
  const authHeader = (req.headers['authorization'] as string || '').trim();
  const passcode = (req.headers['x-admin-passcode'] as string || '').trim();

  if (adminEmail && ADMIN_EMAILS.includes(adminEmail)) return true;
  if (passcode === ADMIN_PASSCODE) return true;
  if (authHeader && authHeader.replace(/^Bearer\s+/i, '') === ADMIN_PASSCODE) return true;

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-email, x-admin-passcode, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Security guard: Only authorized store administrators can access accounts API
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Access to financial accounts is strictly restricted to store administrators.'
    });
  }

  // Extract action from query param, body, or URL path
  const urlPath = (req.url || '').split('?')[0].toLowerCase();
  const action = (
    (req.query?.action as string) ||
    (req.body?.action as string) ||
    (urlPath.includes('refund') ? 'refund' : 'summary')
  ).toLowerCase();

  try {
    // 1. REFUND ACTION
    if (action === 'refund') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed. Use POST for refunds.' });
      }

      const { orderId, amount, reason } = req.body || {};

      if (!orderId || !amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required refund parameters: orderId and positive amount are required.'
        });
      }

      return res.status(200).json({
        success: true,
        message: `Refund of ₹${amount} authorized for Order #${orderId}`,
        refund: {
          orderId,
          amount: Number(amount),
          reason: reason || 'Customer Refund',
          processedAt: new Date().toISOString()
        }
      });
    }

    // 2. SUMMARY ACTION (Default)
    return res.status(200).json({
      success: true,
      data: {
        status: 'active',
        scope: 'accounting_summary',
        module: 'accounts_master',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Accounts API error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Accounting internal server error'
    });
  }
}
