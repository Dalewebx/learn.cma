// api/exam-passed.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(200).json({ok:true,skipped:true});

  const { studentName, studentEmail, courseName, passDate, certNum } = req.body || {};
  if (!studentName || !studentEmail) return res.status(400).json({error:'Missing fields'});
  const firstName = studentName.split(' ')[0];

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:540px;margin:32px auto;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">

  <!-- Gold celebration header -->
  <div style="background:#C9A84C;padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:8px;">🏆</div>
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#0D1B3E;line-height:1.2;margin-bottom:6px;">
      Congratulations,<br>${firstName}!
    </div>
    <div style="font-size:14px;color:rgba(13,27,62,0.75);font-weight:600;letter-spacing:0.5px;">
      You passed your final examination
    </div>
  </div>

  <!-- White body -->
  <div style="background:#FFFFFF;padding:32px;">
    <p style="font-size:15px;color:#0F172A;line-height:1.8;margin:0 0 20px;">
      Dear <strong>${firstName}</strong>,
    </p>
    <p style="font-size:15px;color:#0F172A;line-height:1.8;margin:0 0 24px;">
      We are thrilled to inform you that you have <strong>successfully passed</strong> 
      your final examination at the Catholic Music Academy. This is a tremendous 
      achievement — your dedication to sacred music education has paid off.
    </p>

    <!-- Result card -->
    <div style="background:#F0FDF4;border:2px solid #16A34A;border-radius:14px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#16A34A;margin-bottom:10px;">✓ Examination Result</div>
      <div style="font-size:18px;font-weight:700;color:#0F172A;margin-bottom:4px;">${courseName||'Programme'}</div>
      <div style="font-size:13px;color:#64748B;">${passDate||''}</div>
      ${certNum ? `<div style="font-size:11px;color:#94A3B8;margin-top:8px;letter-spacing:1px;">Certificate No. ${certNum}</div>` : ''}
    </div>

    <!-- What's next -->
    <div style="background:#FBF3DF;border-left:4px solid #C9A84C;padding:16px 20px;border-radius:0 10px 10px 0;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;color:#92680A;margin-bottom:6px;">📋 Next Steps</div>
      <div style="font-size:13px;color:#0F172A;line-height:1.75;">
        Your <strong>Certificate of Competence</strong> is being prepared and will be 
        formally presented to you. The Academy will contact you with details via 
        WhatsApp or email shortly.
      </div>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://catholicmusicacademy.net" 
         style="display:inline-block;background:#C9A84C;color:#0D1B3E;text-decoration:none;
                padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
        Visit Your Portal →
      </a>
    </div>

    <p style="font-size:14px;color:#0F172A;line-height:1.75;margin:0;">
      With warm congratulations,<br>
      <strong>Catholic Music Academy</strong><br>
      <span style="color:#64748B;">Catholic Diocese of Warri</span>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#0D1B3E;padding:16px 32px;text-align:center;">
    <div style="font-size:11px;color:rgba(255,255,255,0.5);">
      Catholic Music Academy · Catholic Diocese of Warri
    </div>
    <a href="https://catholicmusicacademy.net" 
       style="font-size:11px;color:#C9A84C;text-decoration:none;">
      catholicmusicacademy.net
    </a>
  </div>

</div>
</body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'Authorization':'Bearer '+RESEND_API_KEY,'Content-Type':'application/json'},
      body: JSON.stringify({
        from: 'Catholic Music Academy <noreply@catholicmusicacademy.net>',
        to: [studentEmail],
        subject: '🏆 Congratulations '+firstName+' — You Passed!',
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
