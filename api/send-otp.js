// Vercel Serverless Function: /api/send-otp
// Sends WhatsApp OTP via Twilio
// Environment variables needed in Vercel:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM  (e.g. whatsapp:+14155238886)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, otp, firstName } = req.body;
  if (!to || !otp) return res.status(400).json({ error: 'Missing to or otp' });

  // Format Nigerian numbers
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '234' + phone.slice(1);
  if (!phone.startsWith('234') && !phone.startsWith('+')) phone = '234' + phone;
  const waTo = 'whatsapp:+' + phone.replace('+', '');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  const message = `Hello ${firstName || 'there'}, your Catholic Music Academy password reset code is:\n\n*${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\n_Catholic Music Academy_`;

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
        body: new URLSearchParams({ From: from, To: waTo, Body: message }).toString()
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error('Twilio error:', data);
      return res.status(500).json({ error: data.message || 'Failed to send message' });
    }
    return res.status(200).json({ success: true, sid: data.sid });
  } catch (e) {
    console.error('Send OTP error:', e);
    return res.status(500).json({ error: e.message });
  }
}
