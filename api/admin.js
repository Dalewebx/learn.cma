// api/admin.js
// Handles all admin operations requiring service role key:
// - login: verify admin credentials
// - list: get all admin accounts  
// - update_last_login, update_password, reset_password, create, remove

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

  const { action, email, id, data } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Action required' });

  try {
    const supabase = createClient(SUPA_URL, SERVICE_KEY);

    // ── LOGIN: fetch admin record for credential verification ──
    if (action === 'login') {
      if (!email) return res.status(400).json({ error: 'Email required' });
      const { data: rows, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .limit(1);
      if (error) throw error;
      if (!rows || !rows.length) {
        return res.status(404).json({ error: 'No admin account found with that email.' });
      }
      return res.status(200).json({ admin: rows[0] });
    }

    // ── LIST: all admin accounts ──
    if (action === 'list') {
      const { data: admins, error } = await supabase
        .from('admins')
        .select('id,name,email,role,assigned_course_id,last_login,created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ admins });
    }

    // ── UPDATE LAST LOGIN ──
    if (action === 'update_last_login') {
      if (!id) return res.status(400).json({ error: 'ID required' });
      const { error } = await supabase
        .from('admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // ── UPDATE PASSWORD (migration or change) ──
    if (action === 'update_password' || action === 'reset_password') {
      if (!id || !data) return res.status(400).json({ error: 'ID and data required' });
      const { error } = await supabase
        .from('admins')
        .update({
          password_hash: data.password_hash,
          salt: data.salt,
          hash_version: data.hash_version || 'pbkdf2'
        })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // ── CREATE ADMIN ACCOUNT ──
    if (action === 'create') {
      if (!data) return res.status(400).json({ error: 'Data required' });
      const { data: created, error } = await supabase
        .from('admins')
        .insert(data)
        .select();
      if (error) throw error;
      return res.status(200).json({ admin: created[0] });
    }

    // ── REMOVE ADMIN ACCOUNT ──
    if (action === 'remove') {
      if (!id) return res.status(400).json({ error: 'ID required' });
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('Admin function error:', e);
    return res.status(500).json({ error: e.message });
  }
};
