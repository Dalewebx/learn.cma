// api/applications.js
// Handles all application state changes with service role key
// Actions: approve, reject, clear_bin

const SUPA_URL = process.env.SUPABASE_URL || 'https://ltqwofagofmvufvqsuyj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = 'Catholic Music Academy <noreply@catholicmusicacademy.net>';

async function db(path, method, body) {
  const opts = {
    method: method || 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(SUPA_URL + '/rest/v1/' + path, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

async function sendEmail(to, subject, html, text) {
  if (!RESEND_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text })
  });
}

function approvedEmail(firstName, programme, ref) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:540px;margin:32px auto;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.1);">
  <div style="background:#0D1B3E;padding:32px;text-align:center;">
    <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#C9A84C;margin-bottom:10px;">Catholic Music Academy</div>
    <div style="font-family:Georgia,serif;font-size:24px;color:white;font-weight:700;">Admission Approved</div>
  </div>
  <div style="background:white;padding:32px;">
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">
      We are delighted to inform you that your application to the <strong>Catholic Music Academy</strong> 
      has been <strong>approved</strong>. Welcome to the ${programme} programme.
    </p>
    <div style="background:#F0FDF4;border:2px solid #16A34A;border-radius:14px;padding:20px 24px;margin:24px 0;text-align:center;">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#16A34A;margin-bottom:8px;">✓ Admission Confirmed</div>
      <div style="font-size:16px;font-weight:700;color:#0F172A;">${programme}</div>
      ${ref ? `<div style="font-size:11px;color:#94A3B8;margin-top:6px;">Ref: ${ref}</div>` : ''}
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.8;">
      You can now log in to your student portal to begin your studies. Use the email address 
      and password you provided during application.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://catholicmusicacademy.net/portal" 
         style="background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;display:inline-block;">
        Log In to Portal →
      </a>
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.8;">
      God bless,<br><strong>Catholic Music Academy</strong><br>
      <span style="color:#64748B;">Catholic Diocese of Warri</span>
    </p>
  </div>
  <div style="background:#0D1B3E;padding:16px 32px;text-align:center;">
    <a href="https://catholicmusicacademy.net" style="font-size:11px;color:#C9A84C;text-decoration:none;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;
}

function rejectedEmail(firstName, programme) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:540px;margin:32px auto;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.1);">
  <div style="background:#0D1B3E;padding:32px;text-align:center;">
    <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#C9A84C;margin-bottom:10px;">Catholic Music Academy</div>
    <div style="font-family:Georgia,serif;font-size:24px;color:white;font-weight:700;">Application Update</div>
  </div>
  <div style="background:white;padding:32px;">
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">
      Thank you for your interest in the <strong>${programme}</strong> programme at the Catholic Music Academy.
    </p>
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">
      After careful review, we regret to inform you that we are unable to approve your application at this time. 
      Please contact the Academy directly via WhatsApp for further information or to discuss reapplication.
    </p>
    <p style="font-size:14px;color:#0F172A;line-height:1.8;">
      God bless,<br><strong>Catholic Music Academy</strong><br>
      <span style="color:#64748B;">Catholic Diocese of Warri</span>
    </p>
  </div>
  <div style="background:#0D1B3E;padding:16px 32px;text-align:center;">
    <a href="https://catholicmusicacademy.net" style="font-size:11px;color:#C9A84C;text-decoration:none;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;
}

function courseAddedEmail(firstName, programme) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:540px;margin:32px auto;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.1);">
  <div style="background:#0D1B3E;padding:32px;text-align:center;">
    <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#C9A84C;margin-bottom:10px;">Catholic Music Academy</div>
    <div style="font-family:Georgia,serif;font-size:24px;color:white;font-weight:700;">New Course Added</div>
  </div>
  <div style="background:white;padding:32px;">
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">
      Great news! Your request to enrol in <strong>${programme}</strong> has been approved. 
      The course is now available in your student portal.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://catholicmusicacademy.net/portal" 
         style="background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;display:inline-block;">
        Open Portal →
      </a>
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.8;">
      God bless,<br><strong>Catholic Music Academy</strong>
    </p>
  </div>
  <div style="background:#0D1B3E;padding:16px 32px;text-align:center;">
    <a href="https://catholicmusicacademy.net" style="font-size:11px;color:#C9A84C;text-decoration:none;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Service key not configured' });

  const { action, applicationId, application, adminId } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Action required' });

  try {

    // ── APPROVE ──────────────────────────────────────────────
    if (action === 'approve') {
      const a = application;
      if (!a || !applicationId) return res.status(400).json({ error: 'Application data required' });

      // Mark application approved
      await db('applications?id=eq.' + applicationId, 'PATCH', {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId || null
      });

      let studentId = null;

      if (a.type === 'additional' && a.existing_student_id) {
        studentId = a.existing_student_id;
      } else {
        // Check for existing student by email
        const existing = await db('students?email=eq.' + encodeURIComponent(a.email) + '&select=id,status');
        if (existing && existing.length) {
          const existingId = existing[0].id;
          const wasRevoked = existing[0].status !== 'active';
          await db('students?id=eq.' + existingId, 'PATCH', {
            status: 'active',
            programme: a.programme,
            password_hash: a.password_hash,
            salt: a.salt || null,
            hash_version: a.salt ? 'pbkdf2' : (wasRevoked ? 'needs_reset' : 'sha256'),
            security_question: a.security_question || null,
            security_answer_hash: a.security_answer_hash || null,
            security_answer_salt: a.security_answer_salt || null,
            phone: a.phone,
            whatsapp: a.whatsapp || a.phone,
            state: a.state,
            last_login: null,
            application_id: applicationId
          });
          if (wasRevoked) {
            await db('progress?student_id=eq.' + existingId, 'DELETE').catch(() => {});
            await db('enrolments?student_id=eq.' + existingId, 'DELETE').catch(() => {});
            await db('assessment_attempts?student_id=eq.' + existingId, 'DELETE').catch(() => {});
          }
          studentId = existingId;
        } else {
          // Create new student
          const created = await db('students', 'POST', {
            application_id: applicationId,
            first_name: a.first_name,
            last_name: a.last_name,
            email: a.email,
            password_hash: a.password_hash,
            salt: a.salt || null,
            hash_version: a.salt ? 'pbkdf2' : 'sha256',
            phone: a.phone,
            whatsapp: a.whatsapp || a.phone,
            programme: a.programme,
            state: a.state,
            security_question: a.security_question || null,
            security_answer_hash: a.security_answer_hash || null,
            security_answer_salt: a.security_answer_salt || null,
            status: 'active'
          });
          studentId = created && created[0] ? created[0].id : null;
        }
      }

      // Create enrolment
      if (studentId) {
        await db('enrolments', 'POST', {
          student_id: studentId,
          course_id: a.course_id || null,
          programme: a.programme,
          status: 'active'
        }).catch(() => {});
      }

      // Send email
      const firstName = a.first_name || a.email.split('@')[0];
      const emailType = a.type === 'additional' ? 'course_added' : 'approved';
      const html = emailType === 'course_added'
        ? courseAddedEmail(firstName, a.programme)
        : approvedEmail(firstName, a.programme, 'CMA-' + applicationId.slice(-6).toUpperCase());
      const subject = emailType === 'course_added'
        ? '✓ New Course Added — ' + a.programme
        : '✓ Admission Approved — Catholic Music Academy';
      await sendEmail(a.email, subject, html,
        emailType === 'course_added'
          ? `Dear ${firstName}, your enrolment in ${a.programme} has been approved. Log in to your portal to begin.`
          : `Dear ${firstName}, your application to the Catholic Music Academy has been approved. Log in at catholicmusicacademy.net/portal.`
      );

      return res.status(200).json({ ok: true, studentId });
    }

    // ── REJECT ───────────────────────────────────────────────
    if (action === 'reject') {
      const { applicationId: appId, email, firstName, programme } = req.body;
      if (!appId) return res.status(400).json({ error: 'Application ID required' });

      await db('applications?id=eq.' + appId, 'PATCH', {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId || null
      });

      if (email && firstName && programme) {
        const html = rejectedEmail(firstName, programme);
        await sendEmail(email, 'Your Application — Catholic Music Academy', html,
          `Dear ${firstName}, thank you for your interest in ${programme} at the Catholic Music Academy. Please contact us via WhatsApp for further information.`
        );
      }
      return res.status(200).json({ ok: true });
    }

    // ── CLEAR BIN ────────────────────────────────────────────
    if (action === 'clear_bin') {
      // Get rejected application IDs
      const rejected = await db('applications?status=eq.rejected&select=id', 'GET');
      if (!rejected || !rejected.length) return res.status(200).json({ ok: true, deleted: 0 });
      // Null FK on students first
      await db('students?application_id=in.(' + rejected.map(r => r.id).join(',') + ')', 'PATCH', { application_id: null }).catch(() => {});
      // Delete
      await db('applications?status=eq.rejected', 'DELETE');
      return res.status(200).json({ ok: true, deleted: rejected.length });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('Applications function error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
