// api/exam-scheduled.js
// Notifies student when admin schedules their final examination

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(200).json({ok:true,skipped:true});

  const { studentName, studentEmail, studentPhone, examDate } = req.body || {};
  if (!studentName || !studentEmail) return res.status(400).json({error:'Missing fields'});

  const firstName = studentName.split(' ')[0];

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0D1B3E;padding:24px 32px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.8);margin-bottom:6px;">Catholic Music Academy</div>
    <div style="font-size:20px;font-weight:700;color:white;">📅 Your Examination Has Been Scheduled</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:15px;color:#0F172A;margin-bottom:20px;">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:14px;color:#0F172A;line-height:1.75;margin-bottom:20px;">
      We are pleased to inform you that your final examination for your programme at the 
      <strong>Catholic Music Academy</strong> has been scheduled.
    </p>
    <div style="background:#F0F3FF;border-radius:12px;padding:18px 22px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:10px;">Examination Details</div>
      <div style="font-size:15px;font-weight:700;color:#0D1B3E;">📅 Date: ${examDate}</div>
      <div style="font-size:13px;color:#64748B;margin-top:6px;line-height:1.6;">Venue and exact time will be communicated to you via WhatsApp. Please ensure you are available and prepared.</div>
    </div>
    <div style="background:#FBF3DF;border-left:4px solid #C9A84C;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:13px;color:#0F172A;line-height:1.7;">
        Please bring a valid means of identification on the day of your examination. 
        Contact the Academy via WhatsApp if you need to reschedule.
      </div>
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.75;">
      We look forward to celebrating your success.<br><br>
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
        subject: '📅 Your Final Examination — ' + examDate,
        html,
        text: 'Dear '+firstName+', your final examination has been scheduled for '+examDate+'. Please contact the Academy via WhatsApp for venue and time details. God bless, Catholic Music Academy.'
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({error:'Email failed',details:d});
    return res.status(200).json({ok:true});
  } catch(e) {
    return res.status(500).json({error:e.message});
  }
};
