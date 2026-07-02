// api/push-notify.js
// Sends push notifications to students via Expo Push API
// Also writes to announcements table so bell shows them in-app

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
      if (!rows || rows.length === 0) {
        return res.status(200).json({ ok: true, skipped: 'no token found' });
      }
      pushToken = rows[0].token;
    }

    // Send push via Expo Push API
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

    const pushResult = await pushRes.json();
    console.log('Expo push result:', JSON.stringify(pushResult));

    // Also write to announcements table so it appears in bell
    // Determine type based on title content
    let annType = 'info';
    if (title && (title.toLowerCase().includes('fail') || title.toLowerCase().includes('reject') || title.toLowerCase().includes('resit'))) {
      annType = 'warn';
    } else if (title && (title.toLowerCase().includes('pass') || title.toLowerCase().includes('approv') || title.toLowerCase().includes('complet'))) {
      annType = 'ok';
    }

    await fetch(`${SUPA_URL}/rest/v1/announcements`, {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        title,
        body,
        type: annType,
        target: studentId ?? 'all',
        created_by: 'system',
      }),
    });

    return res.status(200).json({ ok: true, push: pushResult });

  } catch (err) {
    console.error('push-notify error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
