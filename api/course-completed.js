// api/course-completed.js
// Notifies admin when a student completes all modules of a course
// Sets a "Schedule Exam" flag in admin

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(200).json({ok:true,skipped:true});

  const { studentName, studentEmail, course, modules, date } = req.body || {};

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#16A34A;padding:24px 32px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:6px;">Catholic Music Academy</div>
    <div style="font-size:20px;font-weight:700;color:white;">&#127881; Student Course Completion</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:15px;color:#0F172A;margin-bottom:16px;"><strong>${studentName}</strong> has completed all online modules.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;width:140px;">Student</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${studentName}</td></tr>
      <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;">Email</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${studentEmail}</td></tr>
      <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;">Course</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${course}</td></tr>
      <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;">Modules</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${modules} modules completed</td></tr>
      <tr><td style="padding:9px 0;font-size:12px;color:#64748B;font-weight:700;">Date</td><td style="padding:9px 0;font-size:13px;color:#0F172A;">${date}</td></tr>
    </table>
    <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:#16A34A;margin-bottom:4px;">&#128197; Action Required: Schedule Final Examination</div>
      <div style="font-size:13px;color:#0F172A;line-height:1.65;">This student has completed all online modules and is ready for their final in-person examination. Please contact them to arrange a date.</div>
    </div>
    <div style="text-align:center;">
      <a href="https://catholicmusicacademy.net/academy-management" style="display:inline-block;background:#0D1B3E;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">View in Admin Panel &rarr;</a>
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
        subject:'&#127881; Course Completed: '+studentName+' — '+course,
        html,
        text:'Student '+studentName+' ('+studentEmail+') has completed all modules for '+course+' on '+date+'. Please schedule their final examination.'
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({error:'Email failed',details:d});
    return res.status(200).json({ok:true});
  } catch(e) {
    return res.status(500).json({error:e.message});
  }
};
