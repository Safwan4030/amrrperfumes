import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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
                <td style="padding: 0 30px 30px 30px;">
                  <div style="background-color: #f9f9f9; border-left: 3px solid #000000; padding: 12px 16px; border-radius: 4px; text-align: left;">
                    <p style="margin: 0; font-size: 12px; color: #555555; line-height: 1.5;">
                      <strong>Security Tip:</strong> This code is valid for 10 minutes. If you did not request this code, please ignore this email. Never share your verification code with anyone.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #111111; padding: 24px 30px; text-align: center; color: #888888; font-size: 11px; line-height: 1.6;">
                  <p style="margin: 0; color: #aaaaaa; font-weight: bold; letter-spacing: 1px;">AMRR PERFUMES CLIENT SERVICES</p>
                  <p style="margin: 6px 0 0 0; color: #777777;">
                    Bespoke Extraits de Parfum & Artisanal Luxury<br>
                    amrrparfumes@gmail.com • Express Delivery Across India
                  </p>
                  <p style="margin: 12px 0 0 0; font-size: 10px; color: #555555;">
                    © ${new Date().getFullYear()} AMRR Perfumes. All rights reserved.
                  </p>
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
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, otp, name } = req.body || {};

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanOtp = typeof otp === 'string' ? otp.trim() : '';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid customer email address is required' });
    }

    if (!cleanOtp || cleanOtp.length < 4) {
      return res.status(400).json({ success: false, error: 'Valid 4-digit verification code is required' });
    }

    const emailSubject = `Your AMRR Perfumes Verification Code: ${cleanOtp}`;
    const htmlContent = generateOtpEmailHtml(cleanOtp, name);

    // Sender and SMTP credentials with flexible variable name fallbacks
    const cleanUser = (
      process.env.SMTP_USER ||
      process.env.SMTP_EMAIL ||
      process.env.GMAIL_USER ||
      process.env.EMAIL_USER ||
      process.env.VITE_SMTP_USER ||
      'amrrparfumes@gmail.com'
    ).trim();

    const rawPass =
      process.env.SMTP_PASS ||
      process.env.SMTP_PASSWORD ||
      process.env.GMAIL_APP_PASSWORD ||
      process.env.GMAIL_PASSWORD ||
      process.env.EMAIL_PASSWORD ||
      process.env.EMAIL_PASS ||
      process.env.VITE_SMTP_PASS ||
      '';
    const cleanPass = rawPass.trim().replace(/\s+/g, '');
    const senderEmail = process.env.SENDER_EMAIL?.trim() || cleanUser || 'amrrparfumes@gmail.com';

    let delivered = false;
    let smtpErrorMessage = '';

    if (cleanUser && cleanPass) {
      try {
        const isGmail = cleanUser.endsWith('@gmail.com') || (process.env.SMTP_HOST || '').includes('gmail');
        const transporter = isGmail
          ? nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: cleanUser,
                pass: cleanPass
              }
            })
          : nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: Number(process.env.SMTP_PORT || 587),
              secure: Number(process.env.SMTP_PORT) === 465,
              auth: {
                user: cleanUser,
                pass: cleanPass
              }
            });

        const mailResult = await transporter.sendMail({
          from: `"AMRR Perfumes" <${senderEmail}>`,
          replyTo: senderEmail,
          to: cleanEmail,
          subject: emailSubject,
          text: `Hello ${name || 'Valued Client'},\n\nYour AMRR Perfumes verification code is: ${cleanOtp}\n\nEnter this 4-digit code to log in to your account and track your orders.\n\nAMRR Perfumes\n${senderEmail}`,
          html: htmlContent,
          priority: 'high'
        });

        delivered = true;
        console.log(`[OTP DISPATCH] Verification code dispatched to ${cleanEmail}`);
      } catch (smtpErr: any) {
        delivered = false;
        smtpErrorMessage = 'SMTP relay offline or awaiting Google App Password';
        console.log('[OTP DISPATCH] Note: Live relay pending Google App Password verification');
      }
    } else {
      smtpErrorMessage = 'No SMTP password configured in environment.';
      console.log(`[OTP DISPATCH] Prepared verification code for ${cleanEmail}`);
    }

    return res.status(200).json({
      success: true,
      delivered,
      fromEmail: senderEmail,
      recipient: cleanEmail,
      subject: emailSubject,
      testCode: delivered ? undefined : cleanOtp,
      smtpError: smtpErrorMessage || undefined,
      message: delivered
        ? `Verification code successfully sent from ${senderEmail} to ${cleanEmail}`
        : `Verification code: ${cleanOtp}`
    });
  } catch (error: any) {
    console.error('Error in send-otp-email handler:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch verification code email'
    });
  }
}
