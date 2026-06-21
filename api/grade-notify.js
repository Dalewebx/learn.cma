// api/grade-notify.js
// Vercel serverless function — sends result email via Resend when admin grades a written assessment
// Requires RESEND_API_KEY environment variable set in Vercel project settings

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email skipped');
    return res.status(200).json({ ok: true, skipped: true, reason: 'RESEND_API_KEY not configured' });
  }

  const { to, subject, body, testMode } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
  }

  const htmlBody = body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
    .replace(/(PASSED|NOT YET PASSED)/g, function(match) {
      return '<strong style="color:' + (match === 'PASSED' ? '#16A34A' : '#DC2626') + ';">' + match + '</strong>';
    });

  const emailPayload = {
    from: 'Catholic Music Academy <noreply@catholicmusicacademy.net>',
    to: [to],
    subject: (testMode ? '[TEST] ' : '') + subject,
    html: '<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">'
      + '<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">'
      + '<div style="background:#0D1B3E;padding:28px 32px;">'
      + '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:8px;">Catholic Music Academy</div>'
      + '<div style="font-size:22px;font-weight:700;color:white;">Assessment Result</div>'
      + '</div>'
      + '<div style="padding:28px 32px;">'
      + (testMode ? `
      <!-- TEST MODE DISCLAIMER -->
      <div style="background:#FEF2F2;border:2px solid #DC2626;border-radius:8px;padding:14px 20px;margin:0 0 20px 0;text-align:center;">
        <div style="font-size:13px;font-weight:700;color:#DC2626;margin-bottom:4px;">⚠ THIS IS A TEST EMAIL</div>
        <div style="font-size:12px;color:#64748B;line-height:1.6;">This message was sent during a system demonstration and does not constitute an official communication from the Catholic Music Academy. No admission, rejection, or assessment result conveyed in this email is valid or binding.</div>
      </div>` : '')
      + '<p style="font-size:15px;color:#0F172A;line-height:1.7;margin-bottom:20px;">' + htmlBody + '</p>'
      + '<div style="text-align:center;margin:28px 0;">'
      + '<a href="https://catholicmusicacademy.net" style="display:inline-block;background:#0D1B3E;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;">Log In to Your Portal &rarr;</a>'
      + '</div>'
      + '</div>'
      + '<div style="background:#F0F3FF;padding:18px 32px;border-top:1px solid #E2E8F0;">'
      + '<div style="font-size:11px;color:#64748B;line-height:1.6;">Catholic Music Academy &middot; Catholic Diocese of Warri &middot; Ozoro, Delta State, Nigeria<br/>'
      + '<a href="https://catholicmusicacademy.net" style="color:#0D1B3E;">catholicmusicacademy.net</a></div>'
      + '</div></div></body></html>',
    text: body
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({ error: 'Email send failed', details: data });
    }
    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('grade-notify error:', err);
    return res.status(500).json({ error: err.message });
  }
};
