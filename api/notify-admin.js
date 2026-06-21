// api/notify-admin.js
// Notifies admin of new application by email

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(200).json({ok:true,skipped:true});

  const { studentName, studentEmail, programme, ref, type } = req.body || {};
  const isAdditional = type === 'additional';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0D1B3E;padding:24px 32px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:6px;">Catholic Music Academy</div>
    <div style="font-size:20px;font-weight:700;color:white;">${isAdditional?'Additional Course Request':'New Application Received'}</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:14px;color:#64748B;margin-bottom:16px;">${isAdditional?'An existing student has requested an additional course.':'A new application has been submitted and is awaiting your review.'}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;width:140px;">Name</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${studentName}</td></tr>
      <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;">Email</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${studentEmail}</td></tr>
      <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;">Programme</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${programme}</td></tr>
      <tr><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;">Reference</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${ref}</td></tr>
    </table>
    <div style="text-align:center;">
      <a href="https://catholicmusicacademy.net/academy-management" style="display:inline-block;background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">Review in Admin Panel &rarr;</a>
    </div>
  </div>
  <div style="background:#F0F3FF;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;">Catholic Music Academy &middot; Catholic Diocese of Warri</div>
</div></body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'Authorization':'Bearer '+RESEND_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:'Catholic Music Academy <noreply@catholicmusicacademy.net>',
        to:['musicacademywarri@gmail.com'],
        subject:(isAdditional?'Additional Course Request':'New Application')+': '+studentName+' — '+programme,
        html,
        text:(isAdditional?'Additional course request':'New application')+' from '+studentName+' ('+studentEmail+') for '+programme+'. Reference: '+ref+'. Log in to review: https://catholicmusicacademy.net/academy-management'
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({error:'Email failed',details:d});
    return res.status(200).json({ok:true});
  } catch(e) {
    return res.status(500).json({error:e.message});
  }
};
