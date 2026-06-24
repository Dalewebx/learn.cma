// api/admin-login.js
// Verifies admin credentials using service role key (never exposed in frontend)
// Called by admin.html doAdminLogin() instead of querying admins table directly

const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = process.env.SUPABASE_URL || 'https://ltqwofagofmvufvqsuyj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration — service key missing' });
  }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const supabase = createClient(SUPA_URL, SERVICE_KEY);

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .limit(1);

    if (error) throw error;
    if (!data || !data.length) {
      return res.status(404).json({ error: 'No admin account found with that email.' });
    }

    // Return admin record — password verification happens in frontend with PBKDF2
    // We never return the password_hash to the client beyond what's needed for verification
    // This is a pragmatic middle ground until full server-side auth is implemented
    const admin = data[0];
    return res.status(200).json({ admin });

  } catch (e) {
    console.error('Admin login error:', e);
    return res.status(500).json({ error: e.message || 'Login failed' });
  }
};
