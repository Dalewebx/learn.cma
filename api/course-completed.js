// api/course-completed.js
// 1. Notifies admin with "Schedule Exam" flag
// 2. Sends congratulatory email to student (not a certificate — exam pending)
// Director name/title pulled from site_settings

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!RESEND_API_KEY) return res.status(200).json({ok:true,skipped:true});

  const { studentName, studentEmail, course, modules, date } = req.body || {};
  if (!studentName || !studentEmail || !course) return res.status(400).json({error:'Missing required fields'});

  // Pull director name/title from site_settings
  let directorName = 'Very Rev. Fr. Francis Adjagbara';
  let directorTitle = 'Director, Catholic Music Academy';
  try {
    if (SUPA_URL && SUPA_KEY) {
      const sr = await fetch(SUPA_URL+'/rest/v1/site_settings?key=in.(director_name,director_title)&select=key,value', {
        headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}
      });
      const settings = await sr.json();
      if (Array.isArray(settings)) {
        settings.forEach(function(s){
          if (s.key==='director_name' && s.value) directorName = s.value;
          if (s.key==='director_title' && s.value) directorTitle = s.value;
        });
      }
    }
  } catch(e){ /* fall back to defaults */ }

  const firstName = studentName.split(' ')[0];

  // ── ADMIN NOTIFICATION EMAIL ────────────────────────────────────────────────
  const adminHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#16A34A;padding:24px 32px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:6px;">Catholic Music Academy</div>
    <div style="font-size:20px;font-weight:700;color:white;">🎉 Student Course Completion</div>
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
      <div style="font-size:13px;font-weight:700;color:#16A34A;margin-bottom:4px;">📅 Action Required: Schedule Final Examination</div>
      <div style="font-size:13px;color:#0F172A;line-height:1.65;">This student has completed all online modules and is ready for their final in-person examination. Please contact them to arrange a date.</div>
    </div>
    <div style="text-align:center;">
      <a href="https://catholicmusicacademy.net/academy-management" style="display:inline-block;background:#0D1B3E;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">View in Admin Panel &rarr;</a>
    </div>
  </div>
  <div style="background:#F0F3FF;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;">Catholic Music Academy &middot; Catholic Diocese of Warri</div>
</div></body></html>`;

  // ── STUDENT CONGRATULATORY EMAIL ────────────────────────────────────────────
  const studentHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <!-- Gold header -->
  <div style="background:linear-gradient(135deg,#0D1B3E 0%,#1A2E6C 60%,#0D1B3E 100%);padding:32px;text-align:center;position:relative;">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:10px;">Catholic Music Academy</div>
    <div style="font-size:40px;margin-bottom:8px;">🎓</div>
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#C9A84C;margin-bottom:6px;">Congratulations!</div>
    <div style="font-family:Georgia,serif;font-size:16px;color:rgba(255,255,255,0.9);">${firstName}, you did it.</div>
  </div>
  <!-- Body -->
  <div style="padding:32px;">
    <p style="font-size:15px;color:#0F172A;line-height:1.7;margin-bottom:20px;">
      Dear <strong>${firstName}</strong>,<br><br>
      You have successfully completed all <strong>${modules} online module${modules!==1?'s':''}</strong> of the 
      <strong>${course}</strong> programme at the Catholic Music Academy.
      This is a significant achievement and a testament to your dedication and love for sacred music.
    </p>

    <!-- Completion summary card -->
    <div style="background:#FBF3DF;border:1.5px solid #C9A84C;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9A7A2E;margin-bottom:12px;">Module Completion Summary</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:7px 0;font-size:12px;color:#64748B;font-weight:700;text-align:left;">Programme</td><td style="padding:7px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${course}</td></tr>
        <tr><td style="padding:7px 0;font-size:12px;color:#64748B;font-weight:700;text-align:left;">Modules Completed</td><td style="padding:7px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${modules}</td></tr>
        <tr><td style="padding:7px 0;font-size:12px;color:#64748B;font-weight:700;text-align:left;">Date</td><td style="padding:7px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${date}</td></tr>
      </table>
    </div>

    <!-- Important note: NOT a certificate -->
    <div style="background:#F0F3FF;border-left:4px solid #0D1B3E;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;color:#0D1B3E;margin-bottom:4px;">📋 Important — Your Next Step</div>
      <div style="font-size:13px;color:#0F172A;line-height:1.7;">
        This completion is <strong>not your Certificate of Competence</strong>. Your certificate will be issued upon 
        successfully passing your final <strong>in-person examination</strong>, which the Academy will schedule with you 
        shortly. Please watch for communication from us via WhatsApp or email.
      </div>
    </div>

    <!-- Director message -->
    <p style="font-size:14px;color:#0F172A;line-height:1.8;font-style:italic;border-top:1px solid #E2E8F0;padding-top:20px;margin-bottom:6px;">
      "We are proud of the dedication you have shown throughout this programme. 
       The Church is enriched by musicians who pursue excellence in sacred music. 
       We look forward to presenting you with your certificate at the completion of your examination."
    </p>
    <p style="font-size:13px;font-weight:700;color:#0D1B3E;margin-bottom:20px;">
      ${directorName}<br>
      <span style="font-weight:400;color:#64748B;">${directorTitle}</span><br>
      <span style="font-weight:400;color:#64748B;">Catholic Diocese of Warri</span>
    </p>

    <div style="text-align:center;">
      <a href="https://catholicmusicacademy.net" style="display:inline-block;background:#0D1B3E;color:white;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700;">Log In to Your Portal &rarr;</a>
    </div>
  </div>
  <div style="background:#F0F3FF;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;text-align:center;">
    Catholic Music Academy &middot; Catholic Diocese of Warri<br>
    <a href="https://catholicmusicacademy.net" style="color:#0D1B3E;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;

  try {
    // Fire both emails in parallel
    const [adminRes, studentRes] = await Promise.all([
      fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{'Authorization':'Bearer '+RESEND_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({
          from:'Catholic Music Academy <noreply@catholicmusicacademy.net>',
          to:['musicacademywarri@gmail.com'],
          subject:'🎉 Course Completed: '+studentName+' — '+course,
          html: adminHtml,
          text:'Student '+studentName+' ('+studentEmail+') has completed all modules for '+course+' on '+date+'. Please schedule their final examination.'
        })
      }),
      fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{'Authorization':'Bearer '+RESEND_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({
          from:'Catholic Music Academy <noreply@catholicmusicacademy.net>',
          to:[studentEmail],
          subject:'Congratulations, '+firstName+'! You have completed '+course,
          html: studentHtml,
          text:'Dear '+firstName+', congratulations on completing all '+modules+' modules of '+course+'. Your next step is the final in-person examination. The Academy will be in touch soon. — '+directorName+', '+directorTitle
        })
      })
    ]);

    const adminData = await adminRes.json();
    const studentData = await studentRes.json();

    if (!adminRes.ok || !studentRes.ok) {
      return res.status(500).json({error:'One or more emails failed', admin:adminData, student:studentData});
    }
    return res.status(200).json({ok:true});
  } catch(e) {
    return res.status(500).json({error:e.message});
  }
};
