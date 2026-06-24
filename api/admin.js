// api/admin.js
// Handles all admin operations requiring service role key
// Uses plain fetch — no @supabase/supabase-js dependency needed

const SUPA_URL = process.env.SUPABASE_URL || 'https://ltqwofagofmvufvqsuyj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function dbQuery(path, method, body) {
  const opts = {
    method: method || 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(SUPA_URL + '/rest/v1/' + path, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured in Vercel environment variables.' });
  }

  const { action, email, id, data } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Action required' });

  try {

    if (action === 'login') {
      if (!email) return res.status(400).json({ error: 'Email required' });
      const rows = await dbQuery('admins?email=eq.' + encodeURIComponent(email.trim().toLowerCase()) + '&select=*&limit=1', 'GET');
      if (!rows || !rows.length) return res.status(404).json({ error: 'No admin account found with that email.' });
      return res.status(200).json({ admin: rows[0] });
    }

    if (action === 'list') {
      const admins = await dbQuery('admins?select=id,name,email,role,assigned_course_id,last_login,created_at&order=created_at.asc', 'GET');
      return res.status(200).json({ admins: admins || [] });
    }

    if (action === 'update_last_login') {
      if (!id) return res.status(400).json({ error: 'ID required' });
      await dbQuery('admins?id=eq.' + id, 'PATCH', { last_login: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    }

    if (action === 'update_password' || action === 'reset_password') {
      if (!id || !data) return res.status(400).json({ error: 'ID and data required' });
      await dbQuery('admins?id=eq.' + id, 'PATCH', {
        password_hash: data.password_hash,
        salt: data.salt,
        hash_version: data.hash_version || 'pbkdf2'
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'create') {
      if (!data) return res.status(400).json({ error: 'Data required' });
      const created = await dbQuery('admins', 'POST', data);
      return res.status(200).json({ admin: created && created[0] ? created[0] : created });
    }

    if (action === 'remove') {
      if (!id) return res.status(400).json({ error: 'ID required' });
      await dbQuery('admins?id=eq.' + id, 'DELETE');
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('Admin function error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
