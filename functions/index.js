const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');

admin.initializeApp();
const app = express();
app.use(express.json());

// Middleware: verify Firebase ID token and ensure requester is admin
async function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.get('Authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const requesterUid = decoded.uid;

    const requesterSnap = await admin.database().ref(`users/${requesterUid}`).once('value');
    const requester = requesterSnap.val();
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }
    req.requesterUid = requesterUid;
    next();
  } catch (err) {
    console.error('verifyAdmin error:', err);
    return res.status(401).json({ error: err.message || 'Unauthorized' });
  }
}

// POST /createUser - create Auth user + DB profile + username map
app.post('/createUser', verifyAdmin, async (req, res) => {
  try {
    const { email, password, username, role } = req.body || {};
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Missing required fields: email, password, username' });
    }
    const normalized = (username || '').trim();
    const usernameToUse = normalized;
    if (!usernameToUse) return res.status(400).json({ error: 'Invalid username' });

    // check uniqueness
    const unameSnap = await admin.database().ref(`usernames/${usernameToUse}`).once('value');
    if (unameSnap.exists()) {
      return res.status(400).json({ error: 'username_exists' });
    }

    // create user in Auth
    const userRecord = await admin.auth().createUser({ email, password, displayName: usernameToUse });
    const uid = userRecord.uid;

    // create DB profile
    await admin.database().ref(`users/${uid}`).set({
      username: usernameToUse,
      displayName: usernameToUse,
      email,
      role: ['admin','user'].includes(role) ? role : 'user',
      createdAt: new Date().toISOString()
    });

    // username mapping
    await admin.database().ref(`usernames/${usernameToUse}`).set(uid);

    return res.json({ uid });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ error: err.message || 'internal_error' });
  }
});

// Health check
app.get('/_health', (req, res) => res.json({ ok: true }));

exports.api = functions.https.onRequest(app);
