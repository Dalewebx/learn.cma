// api/students.js
// Handles student account operations requiring service role
// Actions: revoke, restore, reset_password, create

const SUPA_URL = process.env.SUPABASE_URL || 'https://ltqwofagofmvufvqsuyj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Service key not configured' });

  const { action, studentId, data } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Action required' });

  try {

    // ── REVOKE ───────────────────────────────────────────────
    if (action === 'revoke') {
      if (!studentId) return res.status(400).json({ error: 'Student ID required' });
      await db('students?id=eq.' + studentId, 'PATCH', { status: 'inactive' });
      // Kill all active sessions so the student can't continue on any device
      await db('sessions?student_id=eq.' + studentId, 'DELETE');
      return res.status(200).json({ ok: true });
    }

    // ── RESET PASSWORD ───────────────────────────────────────
    if (action === 'reset_password') {
      if (!studentId || !data) return res.status(400).json({ error: 'Student ID and credentials required' });
      await db('students?id=eq.' + studentId, 'PATCH', {
        password_hash: data.password_hash,
        salt: data.salt,
        hash_version: 'pbkdf2',
        last_login: null
      });
      return res.status(200).json({ ok: true });
    }

    // ── CREATE STUDENT DIRECTLY (admin creates without apply form) ──
    if (action === 'create') {
      if (!data) return res.status(400).json({ error: 'Student data required' });
      // Check no existing student with this email
      const existing = await db('students?email=eq.' + encodeURIComponent(data.email) + '&select=id,status');
      if (existing && existing.length && existing[0].status === 'active') {
        return res.status(409).json({ error: 'An active account already exists for this email.' });
      }

      let studentId2 = null;
      if (existing && existing.length) {
        // Reactivate revoked account with new credentials
        await db('students?id=eq.' + existing[0].id, 'PATCH', {
          ...data, status: 'active', last_login: null
        });
        studentId2 = existing[0].id;
        // Clear old data
        await db('progress?student_id=eq.' + studentId2, 'DELETE').catch(() => {});
        await db('enrolments?student_id=eq.' + studentId2, 'DELETE').catch(() => {});
      } else {
        const created = await db('students', 'POST', { ...data, status: 'active' });
        studentId2 = created && created[0] ? created[0].id : null;
      }

      // Create enrolment
      if (studentId2 && data.course_id) {
        await db('enrolments', 'POST', {
          student_id: studentId2,
          course_id: data.course_id,
          programme: data.programme,
          status: 'active'
        }).catch(() => {});
      }

      return res.status(200).json({ ok: true, studentId: studentId2 });
    }

    // ── CLEAR LAST LOGIN (for diagnose tool) ─────────────────
    if (action === 'clear_last_login') {
      if (!studentId) return res.status(400).json({ error: 'Student ID required' });
      await db('students?id=eq.' + studentId, 'PATCH', { last_login: null });
      return res.status(200).json({ ok: true });
    }

    // ── MARK NEEDS RESET ─────────────────────────────────────
    if (action === 'mark_needs_reset') {
      // Fix all broken accounts (null salt)
      await db('students?salt=is.null&status=eq.active', 'PATCH', {
        hash_version: 'needs_reset',
        last_login: null
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('Students function error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
