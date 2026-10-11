import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing payment verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature)" 
      });
    }

    const cleanEnv = (val?: string) => val ? val.trim().replace(/^["'\s]+|["'\s]+$/g, '') : '';
    const key_secret = cleanEnv(process.env.RAZORPAY_KEY_SECRET) || "JgXAEuobCbjHzEt114YBy75o";
    if (!key_secret) {
      return res.status(500).json({ 
        success: false, 
        error: "RAZORPAY_KEY_SECRET is not configured on the server." 
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("Payment signature mismatch:", {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        received: razorpay_signature,
        expected: expectedSignature
      });
      return res.status(400).json({ 
        success: false, 
        error: "Invalid Razorpay payment signature. Verification failed." 
      });
    }

    console.log("Payment signature verified successfully for order:", razorpay_order_id);
    return res.status(200).json({ success: true, message: "Payment verified successfully" });
  } catch (error: any) {
    console.error("Error verifying payment signature:", error);
    return res.status(500).json({ success: false, error: error?.message || "Signature verification failed" });
  }
}

