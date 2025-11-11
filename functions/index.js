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

// DELETE /deleteUser/:uid - delete user from Auth + DB + username mapping
app.delete('/deleteUser/:uid', verifyAdmin, async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    // Get user data before deletion to retrieve username
    const userSnap = await admin.database().ref(`users/${uid}`).once('value');
    const userData = userSnap.val();

    if (!userData) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // 1. Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(uid);
    } catch (authErr) {
      console.error('Error deleting from Auth:', authErr);
      // Continue even if Auth delete fails (user might already be deleted)
    }

    // 2. Delete from Realtime Database
    await admin.database().ref(`users/${uid}`).remove();

    // 3. Delete username mapping
    if (userData.username) {
      await admin.database().ref(`usernames/${userData.username}`).remove();
    }

    return res.json({ success: true, uid, message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ error: err.message || 'internal_error' });
  }
});

// PATCH /updateUserRole - update user role in database
app.patch('/updateUserRole', verifyAdmin, async (req, res) => {
  try {
    const { uid, newRole } = req.body || {};

    if (!uid || !newRole) {
      return res.status(400).json({ error: 'Missing uid or newRole' });
    }

    if (!['admin', 'user'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or user' });
    }

    // Check if user exists
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnap = await userRef.once('value');

    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update role
    await userRef.update({ 
      role: newRole,
      updatedAt: new Date().toISOString()
    });

    return res.json({ success: true, uid, newRole, message: 'Role updated successfully' });
  } catch (err) {
    console.error('updateUserRole error:', err);
    return res.status(500).json({ error: err.message || 'internal_error' });
  }
});

// GET /listUsers - list all users from database
app.get('/listUsers', verifyAdmin, async (req, res) => {
  try {
    const usersSnap = await admin.database().ref('users').once('value');
    const usersData = usersSnap.val() || {};

    const users = Object.entries(usersData).map(([uid, data]) => ({
      uid,
      ...data
    }));

    return res.json({ 
      success: true,
      users,
      count: users.length
    });
  } catch (err) {
    console.error('listUsers error:', err);
    return res.status(500).json({ error: err.message || 'internal_error' });
  }
});

// Health check
app.get('/_health', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

exports.api = functions.https.onRequest(app);
