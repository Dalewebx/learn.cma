const CryptoJS = require('crypto-js');

function hashPBKDF2(password, salt) {
  const hash = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  });
  return hash.toString(CryptoJS.enc.Hex);
}

function hashLegacy(password) {
  return CryptoJS.SHA256(password + 'cma_salt_2026').toString(CryptoJS.enc.Hex);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    // Fetch student by email
    const response = await fetch(
      `${SUPA_URL}/rest/v1/students?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&select=id,email,first_name,last_name,status,programme,cohort,avatar_url,password_hash,salt,hash_version,needs_reset&limit=1`,
      {
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
        },
      }
    );

    const data = await response.json();
    if (!data || data.length === 0) {
      return res.status(401).json({ error: 'No account found with that email address.' });
    }

    const student = data[0];

    // Status check
    if (student.status === 'pending') {
      return res.status(403).json({ error: 'Your application is still under review. You will be notified by email once approved.' });
    }
    if (student.status === 'rejected') {
      return res.status(403).json({ error: 'Your application was not approved. Please contact the Academy.' });
    }
    if (student.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact the Academy.' });
    }

    // Verify password
    let passwordOk = false;
    if (student.hash_version === 'pbkdf2' && student.salt) {
      const hash = hashPBKDF2(password, student.salt);
      passwordOk = hash === student.password_hash;
    } else {
      // Legacy SHA-256
      const hash = hashLegacy(password);
      passwordOk = hash === student.password_hash;

      // Migrate to PBKDF2 if correct
      if (passwordOk) {
        const newSalt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
        const newHash = hashPBKDF2(password, newSalt);
        await fetch(
          `${SUPA_URL}/rest/v1/students?id=eq.${student.id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPA_KEY,
              Authorization: `Bearer ${SUPA_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password_hash: newHash, salt: newSalt, hash_version: 'pbkdf2' }),
          }
        );
      }
    }

    if (!passwordOk) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Update last_login
    await fetch(
      `${SUPA_URL}/rest/v1/students?id=eq.${student.id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ last_login: new Date().toISOString() }),
      }
    );

    // Return safe student object (no password fields)
    return res.status(200).json({
      success: true,
      student: {
        id: student.id,
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
        status: student.status,
        programme: student.programme,
        cohort: student.cohort,
        avatar_url: student.avatar_url,
        needs_reset: student.needs_reset,
      },
    });

  } catch (err) {
    console.error('verify-login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};
