import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

function generateOrderEmailHtml(order: any): string {
  const currencySymbol = order.currency === 'INR' ? '₹' : order.currency;
  const itemsHtml = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #111111;">
        <strong>${item.product?.name || 'Luxury Extrait'}</strong>
        <div style="font-size: 12px; color: #666666;">Size: ${item.selectedSize || '50ml'}</div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #111111; text-align: center;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #111111; text-align: right; font-weight: bold;">
        ${currencySymbol}${(Number(item.unitPrice || 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${order.id}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f2; color: #111111;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f6f2; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e5e5;">
              
              <!-- Luxury Header -->
              <tr>
                <td style="background-color: #000000; padding: 35px 30px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: 4px; margin: 0; text-transform: uppercase;">AMRR PERFUMES</h1>
                  <p style="color: #cccccc; font-size: 11px; letter-spacing: 2px; margin: 8px 0 0 0; text-transform: uppercase;">Haute Parfumerie & Extraits de Parfum</p>
                </td>
              </tr>

              <!-- Order Confirmed Banner -->
              <tr>
                <td style="padding: 30px 30px 20px 30px; text-align: center;">
                  <div style="display: inline-block; background-color: #f0f9f0; color: #1b6326; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border: 1px solid #c7e6c9;">
                    ✓ Order Confirmed & Verified
                  </div>
                  <h2 style="font-size: 22px; font-weight: 800; margin: 0; color: #111111;">Thank You for Your Order!</h2>
                  <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                    Dear <strong>${order.shippingDetails?.fullName || 'Valued Client'}</strong>,<br>
                    Your bespoke perfume order has been received and confirmed. Our master perfumers are packaging your selections with care.
                  </p>
                </td>
              </tr>

              <!-- Order Summary Card -->
              <tr>
                <td style="padding: 10px 30px 20px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf9f6; border: 1px solid #eae6df; border-radius: 8px; padding: 15px;">
                    <tr>
                      <td style="font-size: 12px; color: #777777; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 6px;">Order Reference:</td>
                      <td style="font-size: 14px; font-weight: bold; color: #111111; text-align: right; padding-bottom: 6px;">#${order.id}</td>
                    </tr>
                    <tr>
                      <td style="font-size: 12px; color: #777777; text-transform: uppercase; letter-spacing: 1px;">Payment Method:</td>
                      <td style="font-size: 13px; font-weight: 600; color: #111111; text-align: right;">${order.paymentMethod || 'Razorpay / Prepaid'}</td>
                    </tr>
                    ${order.paymentId ? `
                    <tr>
                      <td style="font-size: 12px; color: #777777; text-transform: uppercase; letter-spacing: 1px; padding-top: 6px;">Payment ID:</td>
                      <td style="font-size: 12px; font-family: monospace; color: #555555; text-align: right; padding-top: 6px;">${order.paymentId}</td>
                    </tr>` : ''}
                  </table>
                </td>
              </tr>

              <!-- Items Table -->
              <tr>
                <td style="padding: 10px 30px;">
                  <h3 style="font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; color: #111111; border-bottom: 2px solid #111111; padding-bottom: 8px;">Ordered Items</h3>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <thead>
                      <tr style="background-color: #f2f0eb;">
                        <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; color: #555555;">Fragrance</th>
                        <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: center; color: #555555;">Qty</th>
                        <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: right; color: #555555;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Financial Totals -->
              <tr>
                <td style="padding: 15px 30px 25px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 10px;">
                    <tr>
                      <td style="font-size: 14px; color: #555555; padding: 4px 0;">Subtotal:</td>
                      <td style="font-size: 14px; color: #111111; text-align: right; font-weight: 600; padding: 4px 0;">${currencySymbol}${(order.subtotal || order.totalAmount).toLocaleString('en-IN')}</td>
                    </tr>
                    ${order.discount ? `
                    <tr>
                      <td style="font-size: 14px; color: #1b6326; padding: 4px 0;">Special Discount (${order.couponCode || 'APPLIED'}):</td>
                      <td style="font-size: 14px; color: #1b6326; text-align: right; font-weight: 600; padding: 4px 0;">-${currencySymbol}${order.discount.toLocaleString('en-IN')}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="font-size: 14px; color: #555555; padding: 4px 0;">Shipping:</td>
                      <td style="font-size: 14px; color: #1b6326; text-align: right; font-weight: 600; padding: 4px 0;">COMPLIMENTARY</td>
                    </tr>
                    <tr>
                      <td style="font-size: 18px; color: #111111; font-weight: 900; padding: 12px 0 0 0; border-top: 2px solid #eeeeee;">Grand Total:</td>
                      <td style="font-size: 20px; color: #111111; font-weight: 900; text-align: right; padding: 12px 0 0 0; border-top: 2px solid #eeeeee;">${currencySymbol}${Number(order.totalAmount).toLocaleString('en-IN')}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Shipping Address -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <div style="background-color: #f7f6f2; border-radius: 8px; padding: 18px; border: 1px solid #eae6df;">
                    <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0; color: #555555;">Delivery Destination</h4>
                    <p style="font-size: 14px; color: #222222; margin: 0; line-height: 1.5;">
                      <strong>${order.shippingDetails?.fullName}</strong><br>
                      ${order.shippingDetails?.address}<br>
                      ${order.shippingDetails?.city}, ${order.shippingDetails?.state} - <strong>${order.shippingDetails?.pincode}</strong><br>
                      Phone: ${order.shippingDetails?.phone}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #111111; padding: 25px 30px; text-align: center; color: #888888; font-size: 12px; line-height: 1.6;">
                  <p style="margin: 0; color: #ffffff; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">AMRR PERFUMES ATELIER</p>
                  <p style="margin: 5px 0 0 0;">For inquiries or custom requests, reply directly to this email or contact support at amrrparfumes@gmail.com</p>
                  <p style="margin: 12px 0 0 0; font-size: 11px; color: #555555;">&copy; ${new Date().getFullYear()} AMRR Perfumes. All rights reserved.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generateOtpEmailHtml(otp: string, name?: string): string {
  const recipientName = name?.trim() ? name.trim() : 'Valued Client';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AMRR Perfumes - Email Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f2; color: #111111;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f6f2; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e5e5;">
              
              <!-- Luxury Brand Header -->
              <tr>
                <td style="background-color: #000000; padding: 32px 25px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 4px; margin: 0; text-transform: uppercase;">AMRR PERFUMES</h1>
                  <p style="color: #cccccc; font-size: 11px; letter-spacing: 2px; margin: 6px 0 0 0; text-transform: uppercase;">Haute Parfumerie & Extraits de Parfum</p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 35px 30px 25px 30px; text-align: center;">
                  <div style="display: inline-block; background-color: #f4efe6; color: #8c6d3b; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; border: 1px solid #e2d8c3;">
                    Customer Profile Sign In
                  </div>
                  
                  <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 10px 0; color: #111111;">Your Verification Code</h2>
                  
                  <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                    Hello <strong>${recipientName}</strong>,<br>
                    Please use the following 4-digit verification code to sign in to your AMRR Perfumes customer account:
                  </p>

                  <!-- Prominent OTP Box -->
                  <div style="margin: 25px 0; padding: 22px; background-color: #faf9f6; border: 2px dashed #000000; border-radius: 10px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #888888; font-weight: 700; margin-bottom: 8px;">
                      Single-Use Sign In Code
                    </div>
                    <div style="font-size: 38px; font-weight: 900; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; color: #000000; text-indent: 12px;">
                      ${otp}
                    </div>
                  </div>

                  <p style="color: #777777; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">
                    Enter this code on the customer profile sign-in screen to view your orders, live Delhivery tracking, and tax invoices.
                  </p>
                </td>
              </tr>

              <!-- Security Notice -->
              <tr>
                <td style="padding: 0 30px 25px 30px;">
                  <div style="background-color: #fff9ea; border-radius: 8px; padding: 14px; border: 1px solid #fae8b5; font-size: 12px; color: #7a6020; line-height: 1.5;">
                    <strong>Security Notice:</strong> This single-use code is valid for 10 minutes. If you did not request this login code, you can safely disregard this email.
                  </div>
                </td>
              </tr>

              <!-- Luxury Footer -->
              <tr>
                <td style="background-color: #111111; padding: 25px 20px; text-align: center; color: #888888; font-size: 12px; line-height: 1.6;">
                  <p style="margin: 0; color: #ffffff; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">AMRR PERFUMES ATELIER</p>
                  <p style="margin: 4px 0 0 0; color: #666666;">Haute Parfumerie & Artisanal Extraits de Parfum</p>
                  <p style="margin: 12px 0 0 0; font-size: 11px; color: #444444;">&copy; ${new Date().getFullYear()} AMRR Perfumes. All rights reserved.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  // Determine email type: 'order' or 'otp'
  const urlPath = (req.url || '').split('?')[0].toLowerCase();
  const emailType = (
    req.body?.type ||
    req.query?.type ||
    (urlPath.includes('otp') ? 'otp' : 'order')
  ).toLowerCase();

  try {
    const smtpUser = process.env.SMTP_USER || 'amrrparfumes@gmail.com';
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || 'vysn aytz ghqu rrcy';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser.trim(),
        pass: smtpPass.trim().replace(/\s+/g, '')
      }
    });

    // 1. OTP EMAIL
    if (emailType === 'otp') {
      const { email, otp, customerName } = req.body || {};

      if (!email || !otp) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required parameters: email and otp are required.' 
        });
      }

      const mailOptions = {
        from: `"AMRR Perfumes" <${smtpUser.trim()}>`,
        to: email.trim(),
        subject: `${otp} is your AMRR Perfumes Sign In Code`,
        html: generateOtpEmailHtml(otp, customerName)
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', info.messageId, 'to:', email);

      return res.status(200).json({
        success: true,
        messageId: info.messageId,
        recipient: email
      });
    }

    // 2. ORDER CONFIRMATION EMAIL
    const { order } = req.body || {};

    if (!order || !order.id || !order.shippingDetails?.email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid order payload. Missing order ID or customer email.' 
      });
    }

    const customerEmail = order.shippingDetails.email.trim();
    const mailOptions = {
      from: `"AMRR Perfumes" <${smtpUser.trim()}>`,
      to: customerEmail,
      bcc: 'amrrparfumes@gmail.com', // CC store operations
      subject: `Order Confirmed #${order.id} — AMRR Perfumes`,
      html: generateOrderEmailHtml(order)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully:', info.messageId, 'to:', customerEmail);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      recipient: customerEmail
    });

  } catch (error: any) {
    console.error('Email dispatch error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send email via SMTP service.'
    });
  }
}
