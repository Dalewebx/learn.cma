// api/notify.js
// Handles notification emails that don't require DB writes
// Actions: application_received (to applicant), notify_admin (to admin)
// Replaces: application-received.js + notify-admin.js

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = 'Catholic Music Academy <noreply@catholicmusicacademy.net>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'musicacademywarri@gmail.com';

async function sendEmail(to, subject, html, text) {
  if (!RESEND_KEY) return { ok: true, skipped: true };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d));
  return { ok: true };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, firstName, email, programme } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Action required' });

  try {

    // ── APPLICATION RECEIVED (to applicant) ──────────────────
    if (action === 'application_received') {
      if (!email || !firstName) return res.status(400).json({ error: 'Missing fields' });
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:540px;margin:32px auto;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0D1B3E;padding:32px;text-align:center;">
    <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#C9A84C;margin-bottom:10px;">Catholic Music Academy</div>
    <div style="font-family:Georgia,serif;font-size:22px;color:white;font-weight:700;">Application Received</div>
  </div>
  <div style="background:white;padding:32px;">
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">
      Thank you for applying to the <strong>Catholic Music Academy</strong>. 
      We have received your application for the <strong>${programme || 'programme'}</strong>.
    </p>
    <div style="background:#FBF3DF;border-radius:12px;padding:18px 22px;margin:24px 0;">
      <div style="font-size:13px;font-weight:700;color:#92680A;margin-bottom:8px;">What happens next?</div>
      <div style="font-size:13px;color:#0F172A;line-height:1.8;">
        Our admissions team will review your application and payment receipt. 
        You will be notified via <strong>WhatsApp and email</strong> once a decision has been made.
        This typically takes 1–3 working days.
      </div>
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.8;">
      If you have any questions, please reach us via WhatsApp.<br><br>
      God bless,<br><strong>Catholic Music Academy</strong><br>
      <span style="color:#64748B;">Catholic Diocese of Warri</span>
    </p>
  </div>
  <div style="background:#0D1B3E;padding:16px 32px;text-align:center;">
    <a href="https://catholicmusicacademy.net" style="font-size:11px;color:#C9A84C;text-decoration:none;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;
      await sendEmail(email, 'Application Received — Catholic Music Academy', html,
        `Dear ${firstName}, we have received your application for ${programme} at the Catholic Music Academy. You will be notified via WhatsApp and email once reviewed. God bless.`
      );
      return res.status(200).json({ ok: true });
    }

    // ── NOTIFY ADMIN (to admin team) ─────────────────────────
    if (action === 'notify_admin') {
      const { applicantName, applicantEmail, programme: prog } = req.body;
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:500px;margin:32px auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="background:#0D1B3E;padding:20px 28px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:4px;">CMA Admin Alert</div>
    <div style="font-size:18px;font-weight:700;color:white;">📋 New Application</div>
  </div>
  <div style="padding:24px 28px;">
    <p style="font-size:14px;color:#0F172A;line-height:1.7;">A new application has been submitted and is awaiting review in the admin panel.</p>
    <div style="background:#F8FAFC;border-radius:10px;padding:16px 18px;margin:18px 0;">
      <div style="font-size:13px;color:#0F172A;line-height:1.8;">
        <strong>Name:</strong> ${applicantName || 'N/A'}<br>
        <strong>Email:</strong> ${applicantEmail || 'N/A'}<br>
        <strong>Programme:</strong> ${prog || 'N/A'}
      </div>
    </div>
    <a href="https://catholicmusicacademy.net/academy-management" style="display:inline-block;background:#0D1B3E;color:#C9A84C;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;">
      Review in Admin Panel →
    </a>
  </div>
</div></body></html>`;
      await sendEmail(ADMIN_EMAIL, '📋 New CMA Application — ' + (applicantName || applicantEmail), html,
        `New application received. Name: ${applicantName}. Email: ${applicantEmail}. Programme: ${prog}. Log in to the admin panel to review.`
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('Notify function error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
