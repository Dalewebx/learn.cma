// api/handover.js
// Bulk deletion for platform handover — uses service role key
// Actions: delete_students (array of IDs), clear_content (array of course IDs), full_reset

const SUPA_URL = process.env.SUPABASE_URL || 'https://ltqwofagofmvufvqsuyj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function db(path, method, body) {
  const opts = {
    method: method || 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
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

  const { action, studentIds, courseIds } = req.body || {};

  try {

    // ── DELETE SELECTED STUDENTS ──────────────────────────────
    if (action === 'delete_students') {
      if (!studentIds || !studentIds.length) return res.status(400).json({ error: 'No student IDs provided' });
      const filter = studentIds.length === 1
        ? 'student_id=eq.' + studentIds[0]
        : 'student_id=in.(' + studentIds.join(',') + ')';
      const idFilter = studentIds.length === 1
        ? 'id=eq.' + studentIds[0]
        : 'id=in.(' + studentIds.join(',') + ')';

      await db('sessions?' + filter, 'DELETE').catch(() => {});
      await db('progress?' + filter, 'DELETE').catch(() => {});
      await db('assessment_attempts?' + filter, 'DELETE').catch(() => {});
      await db('assessment_submissions?' + filter, 'DELETE').catch(() => {});
      await db('enrolments?' + filter, 'DELETE').catch(() => {});
      // Null FK before deleting students
      await db('students?' + idFilter, 'PATCH', { application_id: null }).catch(() => {});
      await db('students?' + idFilter, 'DELETE');

      return res.status(200).json({ ok: true, deleted: studentIds.length });
    }

    // ── CLEAR COURSE CONTENT ─────────────────────────────────
    if (action === 'clear_content') {
      if (!courseIds || !courseIds.length) return res.status(400).json({ error: 'No course IDs provided' });
      const filter = courseIds.length === 1
        ? 'course_id=eq.' + courseIds[0]
        : 'course_id=in.(' + courseIds.join(',') + ')';
      await db('course_content?' + filter, 'PATCH', {
        reading_html: '', questions: '[]', audio_tracks: '[]',
        downloads: '[]', video_url: null, video_duration_mins: null
      });
      return res.status(200).json({ ok: true });
    }

    // ── FULL RESET ────────────────────────────────────────────
    if (action === 'full_reset') {
      const NULL_UUID = '00000000-0000-0000-0000-000000000000';
      await db('sessions?id=neq.' + NULL_UUID, 'DELETE').catch(() => {});
      await db('progress?id=neq.' + NULL_UUID, 'DELETE').catch(() => {});
      await db('assessment_attempts?id=neq.' + NULL_UUID, 'DELETE').catch(() => {});
      await db('assessment_submissions?id=neq.' + NULL_UUID, 'DELETE').catch(() => {});
      await db('enrolments?student_id=neq.' + NULL_UUID, 'DELETE').catch(() => {});
      await db('students?id=neq.' + NULL_UUID, 'PATCH', { application_id: null }).catch(() => {});
      await db('students?id=neq.' + NULL_UUID, 'DELETE').catch(() => {});
      await db('applications?id=neq.' + NULL_UUID, 'DELETE').catch(() => {});
      await db('course_content?id=neq.' + NULL_UUID, 'PATCH', {
        reading_html: '', questions: '[]', audio_tracks: '[]',
        downloads: '[]', video_url: null, video_duration_mins: null
      }).catch(() => {});
      return res.status(200).json({ ok: true });
    }

    // ── DELETE ALL APPLICATIONS ───────────────────────────────
    if (action === 'clear_applications') {
      const NULL_UUID = '00000000-0000-0000-0000-000000000000';
      await db('students?application_id=not.is.null', 'PATCH', { application_id: null }).catch(() => {});
      await db('applications?id=neq.' + NULL_UUID, 'DELETE');
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('Handover error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
