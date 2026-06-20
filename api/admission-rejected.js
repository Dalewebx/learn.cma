// api/admission-rejected.js
// Sends rejection email via Resend when admin rejects an application
// Requires RESEND_API_KEY environment variable set in Vercel project settings

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — rejection email skipped');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const { to, firstName, programme, ref, reason, note, testMode } = req.body || {};
  if (!to || !firstName) {
    return res.status(400).json({ error: 'Missing required fields: to, firstName' });
  }

  const prog = programme || 'your chosen programme';
  const reasonText = reason || 'We were unable to process your application at this time.';
  const noteText = note ? `\n\nAdditional information: ${note}` : '';

  const testDisclaimer = testMode ? `
⚠ THIS IS A TEST EMAIL
This message was sent during a system demonstration and does not constitute an official communication from the Catholic Music Academy. No admission, rejection, or assessment result conveyed in this email is valid or binding.
---
` : '';
  const textBody = `${testDisclaimer}Dear ${firstName},

Thank you for applying to the Catholic Music Academy, Catholic Diocese of Warri.

After reviewing your application for ${prog}, we regret to inform you that we are unable to admit you at this time.

Reason: ${reasonText}${noteText}

We encourage you to address the above and reapply for the next intake. If you have any questions or believe there has been an error, please contact us at musicacademywarri@gmail.com or reach us on WhatsApp.

Thank you for your interest in the Catholic Music Academy. We hope to welcome you in a future cohort.

God bless,
Catholic Music Academy
Catholic Diocese of Warri`;

  const reasonHtml = reasonText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const noteHtml = note ? `<div style="margin-top:10px;font-size:13px;color:#0F172A;"><strong>Additional information:</strong> ${note.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>` : '';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#0D1B3E;padding:28px 32px;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:8px;">Catholic Music Academy</div>
      <div style="font-size:22px;font-weight:700;color:white;">Application Update</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      ${testMode ? `
      <!-- TEST MODE DISCLAIMER -->
      <div style="background:#FEF2F2;border:2px solid #DC2626;border-radius:8px;padding:14px 20px;margin:0 0 20px 0;text-align:center;">
        <div style="font-size:13px;font-weight:700;color:#DC2626;margin-bottom:4px;">⚠ THIS IS A TEST EMAIL</div>
        <div style="font-size:12px;color:#64748B;line-height:1.6;">This message was sent during a system demonstration and does not constitute an official communication from the Catholic Music Academy. No admission, rejection, or assessment result conveyed in this email is valid or binding.</div>
      </div>` : ''}

      <p style="font-size:15px;color:#0F172A;line-height:1.7;margin-bottom:20px;">
        Dear <strong>${firstName}</strong>,
      </p>
      <p style="font-size:14px;color:#64748B;line-height:1.7;margin-bottom:24px;">
        Thank you for applying to the <strong style="color:#0D1B3E;">Catholic Music Academy</strong>. 
        After reviewing your application for <strong>${prog}</strong>, we regret to inform you that 
        we are unable to admit you at this time.
      </p>

      <!-- Reason box -->
      <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:#DC2626;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;">Reason</div>
        <div style="font-size:14px;color:#0F172A;line-height:1.65;">${reasonHtml}</div>
        ${noteHtml}
      </div>

      <!-- Reapply encouragement -->
      <div style="background:#F0F3FF;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
        <div style="font-size:13px;color:#0D1B3E;line-height:1.7;">
          We encourage you to address the above and <strong>reapply for the next intake</strong>. 
          If you believe there has been an error or would like to discuss your application, 
          please do not hesitate to reach out.
        </div>
      </div>

      <p style="font-size:13px;color:#64748B;line-height:1.7;margin-bottom:28px;">
        Contact us at 
        <a href="mailto:musicacademywarri@gmail.com" style="color:#0D1B3E;">musicacademywarri@gmail.com</a>
        or reach us on WhatsApp.
      </p>

      <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0;">
        Thank you for your interest in the Catholic Music Academy.<br/>
        We hope to welcome you in a future cohort.<br/><br/>
        God bless,<br/>
        <strong>Catholic Music Academy</strong><br/>
        <span style="color:#64748B;font-size:13px;">Catholic Diocese of Warri</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F0F3FF;padding:18px 32px;border-top:1px solid #E2E8F0;">
      <div style="font-size:11px;color:#64748B;line-height:1.6;">
        Catholic Music Academy &middot; Catholic Diocese of Warri &middot; Ozoro, Delta State, Nigeria<br/>
        <a href="https://learn.catholicmusicacademy.net" style="color:#0D1B3E;">learn.catholicmusicacademy.net</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Catholic Music Academy <noreply@catholicmusicacademy.net>',
        reply_to: 'musicacademywarri@gmail.com',
        to: [to],
        subject: (testMode ? '[TEST] ' : '') + 'Your Application — Catholic Music Academy',
        html: htmlBody,
        text: textBody
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({ error: 'Email failed', details: data });
    }
    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('admission-rejected error:', err);
    return res.status(500).json({ error: err.message });
  }
};
