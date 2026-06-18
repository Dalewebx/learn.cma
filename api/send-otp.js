// Vercel Serverless Function: /api/send-otp
// Sends OTP via SMS through Twilio
// Environment variables needed in Vercel project settings:
//   TWILIO_ACCOUNT_SID   — from twilio.com/console
//   TWILIO_AUTH_TOKEN    — from twilio.com/console (click eye icon to reveal)
//   TWILIO_SMS_FROM      — your Twilio phone number e.g. +14155552671

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, otp, firstName } = req.body;
  if (!to || !otp) return res.status(400).json({ error: 'Missing phone number or OTP' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_SMS_FROM;

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({
      error: 'SMS not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_FROM to Vercel environment variables.'
    });
  }

  // Normalise to E.164 — handles Nigerian 08xx numbers
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '234' + phone.slice(1);
  if (!phone.startsWith('+')) phone = '+' + phone;

  const name = firstName || 'Student';
  const body = `CMA Reset Code: ${otp}\n\nHello ${name}, use this code to reset your Catholic Music Academy password. Expires in 10 minutes. Do not share.`;

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ From: from, To: phone, Body: body }).toString()
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error('Twilio error:', data);
      return res.status(500).json({ error: data.message || 'Failed to send SMS.' });
    }
    return res.status(200).json({ success: true, sid: data.sid });
  } catch (e) {
    console.error('send-otp error:', e);
    return res.status(500).json({ error: e.message });
  }
}
