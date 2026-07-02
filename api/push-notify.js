// api/push-notify.js
// Sends push notifications to students via Expo Push API
// Also writes to student_notifications table (personal, per-student — NOT the
// admin announcements table) so the bell shows a record even if the push
// itself is missed or the app was closed.
//
// REQUIRED SUPABASE TABLE (create once, if it doesn't already exist):
//
//   create table student_notifications (
//     id uuid primary key default gen_random_uuid(),
//     student_id uuid not null references students(id) on delete cascade,
//     title text not null,
//     body text,
//     type text default 'info',            -- info | warn | ok
//     data jsonb,
//     read boolean default false,
//     created_at timestamptz default now()
//   );
//   create index student_notifications_student_id_idx on student_notifications(student_id);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { studentId, token, title, body, data } = req.body;
  if (!token && !studentId) return res.status(400).json({ error: 'token or studentId required' });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    let pushToken = token;

    // Look up token by studentId if not provided directly
    if (!pushToken && studentId) {
      const r = await fetch(
        `${SUPA_URL}/rest/v1/push_tokens?student_id=eq.${studentId}&select=token&limit=1`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
      );
      const rows = await r.json();
      if (rows && rows.length > 0) {
        pushToken = rows[0].token;
      }
    }

    // Send push via Expo Push API (only if we have a token — a student
    // without a registered device can still get an in-app notification below)
    let pushResult = null;
    if (pushToken) {
      const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({
          to: pushToken,
          title,
          body,
          data: data ?? {},
          sound: 'default',
          priority: 'high',
        }),
      });
      pushResult = await pushRes.json();
      console.log('Expo push result:', JSON.stringify(pushResult));
    }

    // Determine type based on title content
    let notifType = 'info';
    if (title && (title.toLowerCase().includes('fail') || title.toLowerCase().includes('reject') || title.toLowerCase().includes('resit'))) {
      notifType = 'warn';
    } else if (title && (title.toLowerCase().includes('pass') || title.toLowerCase().includes('approv') || title.toLowerCase().includes('complet'))) {
      notifType = 'ok';
    }

    // Write to student_notifications — personal, NEVER the announcements table.
    // Announcements are admin-only broadcast content.
    if (studentId) {
      const insertRes = await fetch(`${SUPA_URL}/rest/v1/student_notifications`, {
        method: 'POST',
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          student_id: studentId,
          title,
          body,
          type: notifType,
          data: data ?? {},
        }),
      });
      if (!insertRes.ok) {
        const errText = await insertRes.text();
        console.error('student_notifications insert failed:', errText);
      }
    }

    return res.status(200).json({ ok: true, push: pushResult });

  } catch (err) {
    console.error('push-notify error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
