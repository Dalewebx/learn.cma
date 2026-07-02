// api/push-notify.js
// Sends push notifications to students via Expo Push API

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { studentId, token, title, body, data } = req.body;

  if (!token && !studentId) {
    return res.status(400).json({ error: 'token or studentId required' });
  }

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    let pushToken = token;

    // If no token provided, look up by studentId
    if (!pushToken && studentId) {
      const res2 = await fetch(
        `${SUPA_URL}/rest/v1/push_tokens?student_id=eq.${studentId}&select=token&limit=1`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
      );
      const rows = await res2.json();
      if (!rows || rows.length === 0) {
        return res.status(200).json({ ok: true, skipped: 'no token found' });
      }
      pushToken = rows[0].token;
    }

    // Send via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
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

    const result = await response.json();
    console.log('Expo push result:', JSON.stringify(result));
    return res.status(200).json({ ok: true, result });

  } catch (err) {
    console.error('push-notify error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
