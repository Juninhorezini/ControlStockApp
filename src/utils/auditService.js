import { database, ref, push } from '../firebaseConfig';

export async function logAuditAction({
  user,
  action,
  details = {},
  targetId = null
}) {
  try {
    const timestamp = new Date().toISOString();

    const auditEntry = {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      action,
      details,
      targetId,
      timestamp
    };

    const auditRef = ref(database, 'audit_log');
    await push(auditRef, auditEntry);
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

export function addUserMetadata(user) {
  const now = new Date().toISOString();
  return {
    created_by: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      avatar: user.photoURL
    },
    created_at: now,
    updated_by: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      avatar: user.photoURL
    },
    updated_at: now,
    history: [{
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      action: 'created',
      timestamp: now
    }]
  };
}

export function updateUserMetadata(user, existingData = {}) {
  const now = new Date().toISOString();
  const existingHistory = existingData.history || [];

  return {
    updated_by: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      avatar: user.photoURL
    },
    updated_at: now,
    history: [...existingHistory, {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      action: 'updated',
      timestamp: now
    }]
  };
}