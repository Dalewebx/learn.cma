// api/course-added.js
// Sends "course added" email when admin approves an additional course for an existing student

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(200).json({ok:true,skipped:true});

  const { to, firstName, programme, testMode } = req.body || {};
  if (!to || !firstName) return res.status(400).json({error:'Missing required fields'});

  const testBanner = testMode ? `<div style="background:#FEF2F2;border:2px solid #DC2626;border-radius:8px;padding:14px 20px;margin:0 0 20px 0;text-align:center;"><div style="font-size:13px;font-weight:700;color:#DC2626;margin-bottom:4px;">⚠ THIS IS A TEST EMAIL</div><div style="font-size:12px;color:#64748B;">This message was sent during a system demonstration and is not an official communication.</div></div>` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0D1B3E;padding:28px 32px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:8px;">Catholic Music Academy</div>
    <div style="font-size:22px;font-weight:700;color:white;">New Course Added</div>
  </div>
  <div style="padding:32px;">${testBanner}
    <p style="font-size:15px;color:#0F172A;margin-bottom:20px;">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:14px;color:#64748B;line-height:1.7;margin-bottom:20px;">Your request to add a new programme has been approved. The following course has been added to your student portal:</p>
    <div style="background:#F0F3FF;border-left:4px solid #0D1B3E;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:14px;font-weight:700;color:#0D1B3E;">${programme || 'Your new programme'}</div>
      <div style="font-size:12px;color:#64748B;margin-top:4px;">Status: Active</div>
    </div>
    <p style="font-size:13px;color:#64748B;line-height:1.7;margin-bottom:28px;">Log in to your portal to access this course. You can switch between your enrolled courses from your dashboard.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://catholicmusicacademy.net/login.html" style="display:inline-block;background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">Go to My Portal &rarr;</a>
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0;">God bless,<br/><strong>Catholic Music Academy</strong><br/><span style="color:#64748B;font-size:13px;">Catholic Diocese of Warri</span></p>
  </div>
  <div style="background:#F0F3FF;padding:18px 32px;border-top:1px solid #E2E8F0;">
    <div style="font-size:11px;color:#64748B;">Catholic Music Academy &middot; Catholic Diocese of Warri &middot; Ozoro, Delta State, Nigeria</div>
  </div>
</div></body></html>`;

  const text = `Dear ${firstName},\n\nYour new programme has been approved: ${programme}.\n\nLog in at: https://catholicmusicacademy.net/login.html\n\nGod bless,\nCatholic Music Academy\nCatholic Diocese of Warri`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'Authorization':'Bearer '+RESEND_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:'Catholic Music Academy <noreply@catholicmusicacademy.net>',
        reply_to:'musicacademywarri@gmail.com',
        to:[to],
        subject:(testMode?'[TEST] ':'')+'New Course Added — Catholic Music Academy',
        html,text
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({error:'Email failed',details:d});
    return res.status(200).json({ok:true,id:d.id});
  } catch(e) {
    return res.status(500).json({error:e.message});
  }
};
