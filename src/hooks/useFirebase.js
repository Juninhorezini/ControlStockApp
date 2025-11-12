import { useState, useEffect } from 'react';
import { database, ref, onValue, set, update, remove, runTransaction, push } from '../firebaseConfig';

// IMPORTANT: Replace with your actual Google Apps Script Web App URL
const SPREADSHEET_WEB_APP_URL = process.env.REACT_APP_SPREADSHEET_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbyTxPtFYoAuwLA2aR6YXoprW7Nkr0v6Pkp9lt-APWmcJq9I91jCY1PsF2_EKakbzFtcyw/exec';

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
      
      const historyData = {
        ...entry,
        timestamp: Date.now(),
        // Ensure these fields are present, even if empty, for the Cloud Function
        quantidadeTotal: entry.quantidadeTotal || 0,
        localizacoes: entry.localizacoes || [],
        ultimaLocalizacao: entry.ultimaLocalizacao || { corredor: '', prateleira: '', localizacao: '' }
      };

      console.log('Adding history entry to Firebase:', historyData);
      await set(newHistoryRef, historyData);

      // NEW: Send data to Google Apps Script directly from frontend
      if (SPREADSHEET_WEB_APP_URL && SPREADSHEET_WEB_APP_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        try {
          const payload = {
            sku: historyData.sku,
            cor: historyData.cor,
            quantidade: historyData.quantidadeTotal,
            usuario: historyData.usuario,
            localizacoes: JSON.stringify(historyData.localizacoes || []),
            corredor: historyData.ultimaLocalizacao?.corredor,
            prateleira: historyData.ultimaLocalizacao?.prateleira,
            localizacao: historyData.ultimaLocalizacao?.localizacao
          };

          const response = await fetch(SPREADSHEET_WEB_APP_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(payload).toString()
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Google Apps Script responded with status ${response.status}: ${errorText}`);
          } else {
            const result = await response.json();
            console.log('Successfully synced history entry to Google Sheet:', result);
          }
        } catch (sheetError) {
          console.error('Error syncing history to Google Sheet:', sheetError);
        }
      } else {
        console.warn('SPREADSHEET_WEB_APP_URL is not configured. Skipping Google Sheet update.');
      }

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
