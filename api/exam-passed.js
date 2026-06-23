// api/exam-passed.js
// Notifies student when admin marks them as passed in the final examination

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(200).json({ok:true,skipped:true});

  const { studentName, studentEmail, courseName, passDate, certNum } = req.body || {};
  if (!studentName || !studentEmail) return res.status(400).json({error:'Missing fields'});

  const firstName = studentName.split(' ')[0];

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#0D1B3E,#1A2E6C);padding:28px 32px;text-align:center;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.8);margin-bottom:8px;">Catholic Music Academy</div>
    <div style="font-size:40px;margin-bottom:8px;">🎓</div>
    <div style="font-size:22px;font-weight:700;color:#C9A84C;font-family:Georgia,serif;">Congratulations, ${firstName}!</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:6px;">You have passed your final examination</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:14px;color:#0F172A;line-height:1.75;margin-bottom:20px;">
      Dear <strong>${firstName}</strong>,<br><br>
      We are delighted to inform you that you have <strong>successfully passed</strong> your final examination 
      for <strong>${courseName||'your programme'}</strong> at the Catholic Music Academy.
    </p>
    <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:12px;padding:18px 22px;margin-bottom:20px;text-align:center;">
      <div style="font-size:13px;font-weight:700;color:#16A34A;margin-bottom:4px;">✓ EXAMINATION PASSED</div>
      <div style="font-size:12px;color:#64748B;">${passDate||''}</div>
      ${certNum ? '<div style="font-size:11px;color:#64748B;margin-top:6px;">Certificate No. '+certNum+'</div>' : ''}
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.75;margin-bottom:20px;">
      Your <strong>Certificate of Competence</strong> is being prepared and will be presented to you 
      by the Academy. You will be contacted with details of the presentation.
    </p>
    <div style="text-align:center;margin-bottom:20px;">
      <a href="https://catholicmusicacademy.net" style="display:inline-block;background:#0D1B3E;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">Log In to Your Portal →</a>
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.75;">
      God bless,<br>
      <strong>Catholic Music Academy</strong><br>
      <span style="color:#64748B;">Catholic Diocese of Warri</span>
    </p>
  </div>
  <div style="background:#F0F3FF;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;">
    Catholic Music Academy · Catholic Diocese of Warri · <a href="https://catholicmusicacademy.net" style="color:#0D1B3E;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'Authorization':'Bearer '+RESEND_API_KEY,'Content-Type':'application/json'},
      body: JSON.stringify({
        from: 'Catholic Music Academy <noreply@catholicmusicacademy.net>',
        to: [studentEmail],
        subject: '🎓 Congratulations '+firstName+' — Examination Passed!',
        html,
        text: 'Dear '+firstName+', congratulations! You have passed your final examination for '+courseName+'. Your Certificate of Competence will be presented to you shortly. God bless, Catholic Music Academy.'
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({error:'Email failed',details:d});
    return res.status(200).json({ok:true});
  } catch(e) {
    return res.status(500).json({error:e.message});
  }
};
