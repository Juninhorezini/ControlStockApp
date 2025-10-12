import { useState, useEffect } from 'react';
import { database, ref, onValue, set, update, remove, runTransaction, push } from './firebaseConfig';

// Hook para sincronizar com Firebase
export const useFirebaseSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync locations from Firebase
  const syncLocations = (callback) => {
    const locationsRef = ref(database, 'locations');
    return onValue(locationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
      setSyncStatus('synced');
    });
  };

  // Sync shelves from Firebase
  const syncShelves = (callback) => {
    const shelvesRef = ref(database, 'shelves');
    return onValue(shelvesRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    });
  };

  // Update location (with transaction for safety)
  const updateLocation = async (locationId, data) => {
    try {
      const locationRef = ref(database, `locations/${locationId}`);
      await runTransaction(locationRef, (current) => {
        return { ...current, ...data, metadata: { ...current?.metadata, updated_at: Date.now() } };
      });
      return { success: true };
    } catch (error) {
      console.error('Firebase update error:', error);
      return { success: false, error };
    }
  };

  // Delete location
  const deleteLocation = async (locationId) => {
    try {
      const locationRef = ref(database, `locations/${locationId}`);
      await remove(locationRef);
      return { success: true };
    } catch (error) {
      console.error('Firebase delete error:', error);
      return { success: false, error };
    }
  };

  // Add history entry
  const addHistory = async (entry) => {
    try {
      const historyRef = ref(database, 'history');
      const newHistoryRef = push(historyRef);
      await set(newHistoryRef, {
        ...entry,
        timestamp: Date.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Firebase history error:', error);
      return { success: false, error };
    }
  };

  return {
    isOnline,
    syncStatus,
    syncLocations,
    syncShelves,
    updateLocation,
    deleteLocation,
    addHistory
  };
};
