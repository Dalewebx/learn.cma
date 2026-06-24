// api/grading.js
// Handles all grading operations requiring service role
// Actions: grade, exam_passed, exam_failed, schedule_exam

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Service key not configured' });

  const { action } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Action required' });

  try {

    // ── GRADE WRITTEN ASSESSMENT ─────────────────────────────
    if (action === 'grade') {
      const { submissionId, result, combinedScore, combinedTotal, comment, gradedBy,
              studentId, courseId, moduleIndex, studentEmail, studentName } = req.body;
      if (!submissionId) return res.status(400).json({ error: 'Submission ID required' });

      // Update submission status
      await db('assessment_submissions?id=eq.' + submissionId, 'PATCH', {
        status: result,
        combined_score: combinedScore,
        combined_total: combinedTotal,
        admin_comments: comment || null,
        graded_at: new Date().toISOString(),
        graded_by: gradedBy || null
      });

      // If passed — create progress record
      if (result === 'pass' && studentId && courseId && moduleIndex !== undefined) {
        await db('progress', 'POST', {
          student_id: studentId,
          course_id: courseId,
          module_index: moduleIndex,
          completed_at: new Date().toISOString()
        }).catch(() => {});

        // Check if ALL modules are now complete → mark course as complete
        try {
          // Count total published modules in this course
          const allModules = await db('course_content?course_id=eq.' + courseId + '&published=eq.true&select=module_index', 'GET');
          const totalModules = allModules ? allModules.length : 0;

          if (totalModules > 0) {
            // Count distinct completed modules for this student
            const completedRows = await db('progress?student_id=eq.' + studentId + '&course_id=eq.' + courseId + '&select=module_index', 'GET');
            const completedIndices = [...new Set((completedRows || []).map(r => r.module_index))];

            if (completedIndices.length >= totalModules) {
              // All modules done — update enrolment to complete
              await db('enrolments?student_id=eq.' + studentId + '&course_id=eq.' + courseId, 'PATCH', {
                status: 'complete'
              });

              // Send course-completed email
              if (studentEmail && studentName) {
                const courseInfo = allModules && allModules[0] ? allModules[0] : {};
                await fetch(process.env.VERCEL_URL
                  ? 'https://' + process.env.VERCEL_URL + '/api/course-completed'
                  : 'http://localhost:3000/api/course-completed', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: studentEmail,
                    firstName: studentName.split(' ')[0],
                    course: courseId,
                    modules: totalModules,
                    date: new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})
                  })
                }).catch(() => {});
              }
            }
          }
        } catch(courseErr) {
          console.warn('Course completion check failed:', courseErr.message);
        }
      }

      // Send grade notification email
      if (studentEmail && studentName) {
        const firstName = studentName.split(' ')[0];
        const passed = result === 'pass';
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:540px;margin:32px auto;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:${passed ? '#16A34A' : '#0D1B3E'};padding:28px 32px;text-align:center;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${passed ? 'rgba(255,255,255,0.7)' : '#C9A84C'};margin-bottom:8px;">Catholic Music Academy</div>
    <div style="font-family:Georgia,serif;font-size:22px;color:white;font-weight:700;">${passed ? '✓ Assessment Passed' : 'Assessment Result'}</div>
  </div>
  <div style="background:white;padding:32px;">
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">
      Your assessment for <strong>Module ${(moduleIndex || 0) + 1}</strong> has been reviewed.
    </p>
    <div style="background:${passed ? '#F0FDF4' : '#FEF2F2'};border:2px solid ${passed ? '#16A34A' : '#DC2626'};border-radius:12px;padding:18px 22px;margin:20px 0;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:${passed ? '#16A34A' : '#DC2626'};">${passed ? '✓ PASSED' : '✗ NOT YET PASSED'}</div>
      <div style="font-size:14px;color:#64748B;margin-top:6px;">Score: ${combinedScore}/${combinedTotal}</div>
    </div>
    ${comment ? `<div style="background:#FBF3DF;border-left:4px solid #C9A84C;padding:14px 18px;border-radius:0 10px 10px 0;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:#92680A;margin-bottom:4px;">Instructor Feedback</div>
      <div style="font-size:14px;color:#0F172A;line-height:1.7;">${comment}</div>
    </div>` : ''}
    <p style="font-size:14px;color:#0F172A;line-height:1.8;">
      ${passed ? 'Well done! You may now continue to the next module.' : 'Please review the feedback above and attempt the module again when ready.'}
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://catholicmusicacademy.net/portal" style="background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
        Open Portal →
      </a>
    </div>
    <p style="font-size:14px;color:#0F172A;">God bless,<br><strong>Catholic Music Academy</strong></p>
  </div>
  <div style="background:#0D1B3E;padding:14px 32px;text-align:center;">
    <a href="https://catholicmusicacademy.net" style="font-size:11px;color:#C9A84C;text-decoration:none;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;
        await sendEmail(studentEmail, passed ? '✓ Module ' + ((moduleIndex||0)+1) + ' Passed — Great work!' : 'Module ' + ((moduleIndex||0)+1) + ' Assessment Result', html,
          `Dear ${firstName}, your Module ${(moduleIndex||0)+1} assessment has been graded. Result: ${passed ? 'PASSED' : 'NOT YET PASSED'}. Score: ${combinedScore}/${combinedTotal}. ${comment ? 'Feedback: ' + comment : ''} Log in to your portal to continue. God bless, Catholic Music Academy.`
        );
      }
      return res.status(200).json({ ok: true });
    }

    // ── MARK EXAM PASSED ─────────────────────────────────────
    if (action === 'exam_passed') {
      const { studentId, courseId, studentEmail, studentName, courseName } = req.body;
      if (!studentId || !courseId) return res.status(400).json({ error: 'Student ID and course ID required' });

      const passedAt = new Date().toISOString();
      await db('enrolments?student_id=eq.' + studentId + '&course_id=eq.' + courseId, 'PATCH', {
        status: 'exam_passed',
        exam_passed_at: passedAt
      });

      // Send congratulations email
      if (studentEmail && studentName) {
        const firstName = studentName.split(' ')[0];
        const certNum = 'CMA/' + new Date().getFullYear() + '/' + String(Math.floor(Math.random()*9000)+1000);
        const passDate = new Date(passedAt).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
<div style="max-width:540px;margin:32px auto;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">
  <div style="background:#C9A84C;padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:8px;">🏆</div>
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#0D1B3E;line-height:1.2;margin-bottom:6px;">Congratulations,<br>${firstName}!</div>
    <div style="font-size:14px;color:rgba(13,27,62,0.75);font-weight:600;">You passed your final examination</div>
  </div>
  <div style="background:white;padding:32px;">
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;color:#0F172A;line-height:1.8;">We are thrilled to inform you that you have <strong>successfully passed</strong> your final examination at the Catholic Music Academy.</p>
    <div style="background:#F0FDF4;border:2px solid #16A34A;border-radius:14px;padding:20px 24px;margin:24px 0;text-align:center;">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#16A34A;margin-bottom:10px;">✓ Examination Result</div>
      <div style="font-size:18px;font-weight:700;color:#0F172A;margin-bottom:4px;">${courseName || 'Programme'}</div>
      <div style="font-size:13px;color:#64748B;">${passDate}</div>
      <div style="font-size:11px;color:#94A3B8;margin-top:8px;letter-spacing:1px;">Certificate No. ${certNum}</div>
    </div>
    <div style="background:#FBF3DF;border-left:4px solid #C9A84C;padding:16px 20px;border-radius:0 10px 10px 0;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;color:#92680A;margin-bottom:6px;">📋 Next Steps</div>
      <div style="font-size:13px;color:#0F172A;line-height:1.75;">Your Certificate of Competence is being prepared. The Academy will contact you with details via WhatsApp shortly.</div>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://catholicmusicacademy.net/portal" style="display:inline-block;background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">Visit Your Portal →</a>
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.75;">With warm congratulations,<br><strong>Catholic Music Academy</strong><br><span style="color:#64748B;">Catholic Diocese of Warri</span></p>
  </div>
  <div style="background:#0D1B3E;padding:16px 32px;text-align:center;">
    <a href="https://catholicmusicacademy.net" style="font-size:11px;color:#C9A84C;text-decoration:none;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;
        await sendEmail(studentEmail, '🏆 Congratulations ' + firstName + ' — You Passed!', html,
          `Dear ${firstName}, congratulations! You have passed your final examination for ${courseName}. Your Certificate of Competence will be presented to you shortly. God bless, Catholic Music Academy.`
        );
      }
      return res.status(200).json({ ok: true });
    }

    // ── MARK EXAM FAILED ─────────────────────────────────────
    if (action === 'exam_failed') {
      const { studentId, courseId } = req.body;
      if (!studentId || !courseId) return res.status(400).json({ error: 'Student ID and course ID required' });
      await db('enrolments?student_id=eq.' + studentId + '&course_id=eq.' + courseId, 'PATCH', {
        status: 'exam_failed',
        exam_failed_at: new Date().toISOString()
      });
      return res.status(200).json({ ok: true });
    }

    // ── SCHEDULE EXAM ─────────────────────────────────────────
    if (action === 'schedule_exam') {
      const { studentId, courseId, examDate, studentEmail, studentName } = req.body;
      if (!studentId || !courseId || !examDate) return res.status(400).json({ error: 'Student ID, course ID and exam date required' });

      await db('enrolments?student_id=eq.' + studentId + '&course_id=eq.' + courseId, 'PATCH', {
        status: 'exam_scheduled',
        exam_date: examDate
      });

      // Send exam scheduled email
      if (studentEmail && studentName) {
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
    <p style="font-size:14px;color:#0F172A;line-height:1.75;margin-bottom:20px;">Your final examination has been scheduled.</p>
    <div style="background:#F0F3FF;border-radius:12px;padding:18px 22px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:10px;">Examination Details</div>
      <div style="font-size:15px;font-weight:700;color:#0D1B3E;">📅 Date: ${examDate}</div>
      <div style="font-size:13px;color:#64748B;margin-top:6px;line-height:1.6;">Venue and exact time will be communicated via WhatsApp. Please ensure you are available.</div>
    </div>
    <div style="background:#FBF3DF;border-left:4px solid #C9A84C;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:13px;color:#0F172A;line-height:1.7;">Please bring a valid means of identification. Contact the Academy via WhatsApp if you need to reschedule.</div>
    </div>
    <p style="font-size:14px;color:#0F172A;line-height:1.75;">God bless,<br><strong>Catholic Music Academy</strong><br><span style="color:#64748B;">Catholic Diocese of Warri</span></p>
  </div>
  <div style="background:#F0F3FF;padding:16px 32px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;">
    Catholic Music Academy · <a href="https://catholicmusicacademy.net" style="color:#0D1B3E;">catholicmusicacademy.net</a>
  </div>
</div></body></html>`;
        await sendEmail(studentEmail, '📅 Your Final Examination — ' + examDate, html,
          `Dear ${firstName}, your final examination has been scheduled for ${examDate}. Contact the Academy via WhatsApp for venue and time details. God bless, Catholic Music Academy.`
        );
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('Grading function error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
